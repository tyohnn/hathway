import { afterAll, assert, describe, it } from "vitest";
import { Effect } from "effect";
import { Pool } from "pg";

import { BoardStore } from "@investment/research/ports/BoardStore";
import { boardStoreContract } from "@investment/research/testing/contracts/board-store";

import { closePostgresPools, poolExecutor, postgresPool } from "../connection.ts";
import { localDb } from "../testing/local-db.ts";

import { boardStorePostgresLayer } from "./BoardStorePostgres.ts";

/**
 * 보드 저장소의 계약을 Postgres 구현으로 돌리고, 표의 GRANT 가 막기로 된 것을 잰다.
 *
 * ⚠ **앱의 롤(`web_app`)로 붙는다.** 소유자 롤로 돌리면 권한이 모자라도 통과한다.
 */
const db = localDb("WEB_DATABASE_URL");

afterAll(async () =>
{
    await closePostgresPools();
});

if (!db.ok)
{
    describe("보드 저장소 (postgres)", () =>
    {
        throw new Error(db.reason);
    });
}
else
{
    const sql = poolExecutor(postgresPool(db.url));

    boardStoreContract("postgres · web_app", () => Effect.succeed(boardStorePostgresLayer(sql)));

    describe("보드 표의 성질 (Postgres)", () =>
    {
        it("INV-RESEARCH-04 web_app 은 만든 뒤에 slug · 테마 · 테넌트 · 만든 사람을 바꾸지 못한다", async () =>
        {
            const role = new Pool({ connectionString: db.url });
            const refusals = await Promise.all([
                "update public.research_boards set slug = slug where false",
                "update public.research_boards set theme = theme where false",
                "update public.research_boards set tenant_id = tenant_id where false",
                "update public.research_boards set created_by = created_by where false",
            ].map((statement) => role.query(statement).then(() => "허용됨", (cause: unknown) => String(cause))));

            await role.end();

            for (const refusal of refusals)
            {
                assert.include(refusal, "permission denied");
            }
        });

        it("테넌트가 없는 보드는 서지 못한다", async () =>
        {
            const role = new Pool({ connectionString: db.url });
            const refusal = await role.query(
                "insert into public.research_boards (slug, theme, title) values ($1, 'stocks', '주인 없는 보드')",
                [`orphan-${crypto.randomUUID().slice(0, 8)}`],
            ).then(() => "허용됨", (cause: unknown) => String(cause));

            await role.end();

            assert.include(refusal, "tenant_id");
        });

        it("모양이 틀린 문서가 표에 있어도 읽기가 죽지 않는다. 그 보드는 빈 그룹으로 읽힌다", async () =>
        {
            const owner = new Pool({ connectionString: process.env["OWNER_DATABASE_URL"] as string });
            const slug = `broken-${crypto.randomUUID().slice(0, 8)}`;

            try
            {
                await owner.query(
                    `insert into public.research_boards (slug, theme, title, tenant_id, document)
                     values ($1, 'stocks', '깨진 문서', 2, '{"groups":"없음"}'::jsonb)`,
                    [slug],
                );

                const found = await Effect.runPromise(
                    Effect.flatMap(BoardStore, (store) => store.findBySlug(slug))
                        .pipe(Effect.provide(boardStorePostgresLayer(sql))),
                );

                assert.deepStrictEqual(found?.groups, []);
            }
            finally
            {
                await owner.end();
            }
        });
    });
}
