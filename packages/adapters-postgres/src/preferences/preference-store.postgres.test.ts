import { afterAll, assert, describe, it } from "vitest";
import { Effect } from "effect";
import { Pool } from "pg";

import { CONTRACT_MEMBERS, preferenceStoreContract } from "@hathway/preferences/testing/contracts/preference-store";

import { closePostgresPools, poolExecutor, postgresPool } from "../connection.ts";
import { localDb } from "../testing/local-db.ts";

import { preferenceStorePostgresLayer } from "./PreferenceStorePostgres.ts";

/**
 * 설정 저장소의 Postgres 계약. 메모리 구현과 같은 계약 한 벌이 `web_app` 롤로 붙어 돈다.
 *
 * ⚠ **재는 질의는 앱의 롤이 낸다.** 소유자 롤은 계약이 쓰는 사람들의 줄을 치우는 배경에만 쓴다. 설정은 사람마다
 *    한 줄이라 검사가 새 행을 심어 격리할 수 없고, `web_app` 에는 지우는 권한이 없다.
 */
const db = localDb("WEB_DATABASE_URL");

afterAll(async () =>
{
    await closePostgresPools();
});

if (!db.ok)
{
    describe("설정 저장소 (postgres)", () =>
    {
        throw new Error(db.reason);
    });
}
else
{
    const sql = poolExecutor(postgresPool(db.url));
    const owner = new Pool({ connectionString: process.env["OWNER_DATABASE_URL"] as string, max: 1 });

    afterAll(async () =>
    {
        await owner.end();
    });

    const clear = Effect.promise(() => owner.query(
        "delete from preferences.member_preference where (account_id, tenant_id) in (select * from unnest($1::bigint[], $2::bigint[]))",
        [CONTRACT_MEMBERS.map((member) => member.accountId), CONTRACT_MEMBERS.map((member) => member.tenantId)],
    ));

    preferenceStoreContract("postgres · web_app", () => Effect.as(clear, preferenceStorePostgresLayer(sql)));

    describe("설정 표의 성질 (Postgres)", () =>
    {
        it("INV-PREFERENCE-02 어휘 밖의 공개 범위는 소유자 롤로도 적지 못한다. 제약이 막는다", async () =>
        {
            const refused = await owner.query(
                "insert into preferences.member_preference (account_id, tenant_id, default_visibility, show_archived) values (3, 2, 'public', false)",
            ).then(() => "허용됨", (cause: unknown) => String(cause));

            assert.include(refused, "member_preference_visibility_check");
        });

        it("INV-PREFERENCE-03 같은 사람의 줄을 하나 더 넣지 못한다. 열쇠가 막는다", async () =>
        {
            const insert = "insert into preferences.member_preference (account_id, tenant_id, default_visibility, show_archived) values (3, 2, 'tenant', false)";

            await owner.query("delete from preferences.member_preference where account_id = 3 and tenant_id = 2");
            await owner.query(insert);

            const refused = await owner.query(insert).then(() => "허용됨", (cause: unknown) => String(cause));

            assert.include(refused, "member_preference_pkey");
        });

        it("조직에 속하지 않은 사람의 설정은 서지 않는다. 멤버십을 가리키는 열쇠가 막는다", async () =>
        {
            const refused = await owner.query(
                "insert into preferences.member_preference (account_id, tenant_id, default_visibility, show_archived) values (4, 2, 'tenant', false)",
            ).then(() => "허용됨", (cause: unknown) => String(cause));

            assert.include(refused, "member_preference_membership_fkey");
        });

        it("web_app 은 설정을 지우지 못하고 누구의 것인지를 바꾸지 못한다", async () =>
        {
            const role = new Pool({ connectionString: db.url });
            const refusals = await Promise.all([
                "delete from preferences.member_preference where false",
                "update preferences.member_preference set account_id = account_id where false",
                "update preferences.member_preference set tenant_id = tenant_id where false",
            ].map((statement) => role.query(statement).then(() => "허용됨", (cause: unknown) => String(cause))));

            await role.end();

            for (const refusal of refusals)
            {
                assert.include(refusal, "permission denied");
            }
        });

        it("agent_app 은 설정에 닿지 못한다", async () =>
        {
            const agent = localDb("AGENT_DATABASE_URL");

            assert.isTrue(agent.ok);

            const role = new Pool({ connectionString: agent.ok ? agent.url : "" });
            const read = await role.query("select count(*) from preferences.member_preference").then(() => "읽음", (cause: unknown) => String(cause));

            await role.end();

            assert.include(read, "permission denied");
        });
    });
}
