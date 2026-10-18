import { afterAll, assert, describe, it } from "vitest";
import { Effect } from "effect";
import { Pool } from "pg";

import { noteStoreContract } from "@hathway/notes/testing/contracts/note-store";

import { closePostgresPools, poolExecutor, postgresPool } from "../connection.ts";
import { localDb } from "../testing/local-db.ts";

import { noteStorePostgresLayer } from "./NoteStorePostgres.ts";

/**
 * 쪽지 저장소의 Postgres 계약. 메모리 구현과 같은 계약 한 벌이 `web_app` 롤로 붙어 돈다.
 *
 * ⚠ **재는 질의는 앱의 롤이 낸다.** 소유자 롤로 돌리면 GRANT 가 모자라도 통과해서 배포에서야 드러난다.
 */
const db = localDb("WEB_DATABASE_URL");

afterAll(async () =>
{
    await closePostgresPools();
});

if (!db.ok)
{
    describe("쪽지 저장소 (postgres)", () =>
    {
        throw new Error(db.reason);
    });
}
else
{
    const sql = poolExecutor(postgresPool(db.url));

    noteStoreContract("postgres · web_app", () => Effect.succeed(noteStorePostgresLayer(sql)));

    describe("쪽지 표의 성질 (Postgres)", () =>
    {
        it("INV-NOTE-04 보관한 쪽지는 소유자 롤로도 되살리지 못한다. 트리거가 막는다", async () =>
        {
            const owner = new Pool({ connectionString: process.env["OWNER_DATABASE_URL"] as string });

            try
            {
                const created = await owner.query<{ id: string }>(
                    `insert into notes.note (tenant_id, author_id, title, status)
                     values (2, 2, '되살리기 검사', 'archived') returning id`,
                );
                const refused = await owner.query(
                    "update notes.note set status = 'active' where id = $1::bigint",
                    [created.rows[0]?.id],
                ).then(() => "허용됨", (cause: unknown) => String(cause));

                assert.include(refused, "INV-NOTE-04");
            }
            finally
            {
                await owner.end();
            }
        });

        it("web_app 은 쪽지를 지우지 못하고 제목과 테넌트를 고치지 못한다", async () =>
        {
            const role = new Pool({ connectionString: db.url });
            const refusals = await Promise.all([
                "delete from notes.note where false",
                "update notes.note set title = title where false",
                "update notes.note set tenant_id = tenant_id where false",
            ].map((statement) => role.query(statement).then(() => "허용됨", (cause: unknown) => String(cause))));

            await role.end();

            for (const refusal of refusals)
            {
                assert.include(refusal, "permission denied");
            }
        });

        it("agent_app 은 쪽지를 읽기만 한다", async () =>
        {
            const agent = localDb("AGENT_DATABASE_URL");

            assert.isTrue(agent.ok);

            const role = new Pool({ connectionString: agent.ok ? agent.url : "" });
            const read = await role.query("select count(*) from notes.note").then(() => "읽음", String);
            const write = await role.query(
                "insert into notes.note (tenant_id, author_id, title) values (2, 2, '에이전트가 쓰기')",
            ).then(() => "허용됨", (cause: unknown) => String(cause));

            await role.end();

            assert.strictEqual(read, "읽음");
            assert.include(write, "permission denied");
        });
    });
}
