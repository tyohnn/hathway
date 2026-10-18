import { afterAll, assert, describe, it } from "vitest";
import { Effect } from "effect";
import { Pool } from "pg";

import { conversationStoreContract } from "@hathway/agents/testing/contracts/conversation-store";

import { closePostgresPools, poolExecutor, postgresPool } from "../connection.ts";
import { localDb } from "../testing/local-db.ts";

import { conversationStorePostgresLayer } from "./ConversationStorePostgres.ts";

/**
 * 대화 장부의 Postgres 계약. 메모리 구현과 같은 계약 한 벌이 `agent_app` 롤로 붙어 돈다.
 */
const db = localDb("AGENT_DATABASE_URL");

afterAll(async () =>
{
    await closePostgresPools();
});

if (!db.ok)
{
    describe("대화 장부 (postgres)", () =>
    {
        throw new Error(db.reason);
    });
}
else
{
    const sql = poolExecutor(postgresPool(db.url));

    conversationStoreContract("postgres · agent_app", () => Effect.succeed(conversationStorePostgresLayer(sql)));

    describe("대화 장부의 성질 (Postgres)", () =>
    {
        it("INV-AGENT-02 적힌 말은 소유자 롤로도 고치거나 지우지 못한다. 트리거가 막는다", async () =>
        {
            const owner = new Pool({ connectionString: process.env["OWNER_DATABASE_URL"] as string });
            const id = `wrun_trigger_${crypto.randomUUID().replaceAll("-", "")}`;

            try
            {
                await owner.query(
                    "insert into agent.conversation (id, tenant_id, started_by, title) values ($1, 1, 1, '트리거')",
                    [id],
                );
                await owner.query(
                    "insert into agent.message (conversation_id, key, role, text) values ($1, 'k', 'user', '처음')",
                    [id],
                );

                const refusals = await Promise.all([
                    "update agent.message set text = '고침' where conversation_id = $1",
                    "delete from agent.message where conversation_id = $1",
                ].map((statement) => owner.query(statement, [id]).then(() => "허용됨", (cause: unknown) => String(cause))));

                for (const refusal of refusals)
                {
                    assert.include(refusal, "INV-AGENT-02");
                }
            }
            finally
            {
                await owner.end();
            }
        });

        it("INV-AGENT-03 같은 대화의 같은 key 는 유일 제약이 한 줄로 지킨다. 다시 돈 스텝이 줄을 늘리지 못한다", async () =>
        {
            const owner = new Pool({ connectionString: process.env["OWNER_DATABASE_URL"] as string });
            const id = `wrun_unique_${crypto.randomUUID().replaceAll("-", "")}`;

            try
            {
                await owner.query(
                    "insert into agent.conversation (id, tenant_id, started_by, title) values ($1, 1, 1, '유일')",
                    [id],
                );

                const insert = "insert into agent.message (conversation_id, key, role, text) values ($1, 'turn-0-user', 'user', '안녕')";

                await owner.query(insert, [id]);

                const refused = await owner.query(insert, [id]).then(() => "허용됨", (cause: unknown) => String(cause));

                assert.include(refused, "message_conversation_key");
            }
            finally
            {
                await owner.end();
            }
        });

        it("web_app 은 대화 장부에 닿지 못한다. 에이전트의 기록은 agent 앱의 것이다", async () =>
        {
            const web = localDb("WEB_DATABASE_URL");

            assert.isTrue(web.ok);

            const role = new Pool({ connectionString: web.ok ? web.url : "" });
            const refused = await role.query("select count(*) from agent.conversation")
                .then(() => "허용됨", (cause: unknown) => String(cause));

            await role.end();

            assert.include(refused, "permission denied");
        });
    });
}
