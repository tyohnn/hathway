import { afterAll, assert, describe, it } from "vitest";
import { Effect } from "effect";
import { Pool } from "pg";

import { canEnterApp } from "@investment/access/access/membership";
import { TeamDirectory } from "@investment/access/ports/TeamDirectory";
import { teamDirectoryContract, type TeamSeedMember } from "@investment/access/testing/contracts/team-directory";

import { closePostgresPools, poolExecutor, postgresPool } from "../connection.ts";
import { localDb } from "../testing/local-db.ts";

import { findMembershipsByEmail } from "./MembershipLookupPostgres.ts";
import { teamDirectoryPostgresLayer } from "./TeamDirectoryPostgres.ts";

/**
 * 팀 명부의 Postgres 계약과, 팀 관리가 연 쓰기 권한의 경계.
 *
 * ⚠ **재는 질의는 `web_app` 이 낸다.** 소유자 롤로 돌리면 GRANT 가 모자라도 통과한다.
 * ⚠ **테넌트와 사람을 심는 일만 소유자로 붙는다.** 테넌트는 운영이 세우는 행이라 앱의 롤에 INSERT 가 없다.
 */
const owner = new Pool({ connectionString: process.env["OWNER_DATABASE_URL"] as string });
const web = localDb("WEB_DATABASE_URL");

afterAll(async () =>
{
    await owner.end();
    await closePostgresPools();
});

/** 새 고객 테넌트 하나와 그 사람들을 심는다. 계약이 검사마다 부른다 */
const seedTeam = async (members: ReadonlyArray<TeamSeedMember>) =>
{
    const tenant = await owner.query<{ id: string }>(
        "insert into org.tenant (kind, name) values ('customer', $1) returning id",
        [`팀 검사 ${crypto.randomUUID().slice(0, 8)}`],
    );
    const tenantId = String(tenant.rows[0]?.id);
    const seeded: Array<{ accountId: string; membershipId: string }> = [];

    for (const member of members)
    {
        const account = await owner.query<{ id: string }>(
            `insert into org.account (email, name, deactivated_at, auth_user_id)
             values ($1, $2, case when $3 then now() end, case when $4 then gen_random_uuid() end) returning id`,
            [member.email, member.name ?? null, member.deactivated ?? false, member.linked ?? true],
        );
        const accountId = String(account.rows[0]?.id);
        const membership = await owner.query<{ id: string }>(
            "insert into org.membership (account_id, tenant_id, role, active) values ($1, $2, $3, $4) returning id",
            [accountId, tenantId, member.role, member.active ?? true],
        );

        seeded.push({ accountId, membershipId: String(membership.rows[0]?.id) });
    }

    return { tenantId, members: seeded };
};

/** 롤로 문장 하나를 내고, 거절되면 그 사유를 돌려준다 */
const attempt = async (url: string, statement: string, params: ReadonlyArray<unknown> = []): Promise<string> =>
{
    const role = new Pool({ connectionString: url });

    try
    {
        return await role.query(statement, [...params]).then(() => "허용됨", (cause: unknown) => String(cause));
    }
    finally
    {
        await role.end();
    }
};

if (!web.ok)
{
    describe("팀 명부 (postgres)", () =>
    {
        throw new Error(web.reason);
    });
}
else
{
    const sql = poolExecutor(postgresPool(web.url));

    teamDirectoryContract("postgres · web_app", (members) =>
        Effect.promise(async () =>
        {
            const seeded = await seedTeam(members);

            return { layer: teamDirectoryPostgresLayer(sql), ...seeded };
        }));

    describe("팀 명부의 성질 (Postgres)", () =>
    {
        it("초대한 계정은 auth_user_id 가 빈 채로 서고, 첫 로그인이 이메일로 잇는다", async () =>
        {
            const team = await seedTeam([{ email: `team-${crypto.randomUUID().slice(0, 8)}@example.test`, role: "owner" }]);
            const email = `invited-${crypto.randomUUID().slice(0, 8)}@example.test`;

            await Effect.runPromise(Effect.flatMap(TeamDirectory, (directory) =>
                directory.createMember({ tenantId: team.tenantId, email, role: "member" })).pipe(
                Effect.provide(teamDirectoryPostgresLayer(sql)),
            ));

            const row = await owner.query<{ auth_user_id: string | null }>(
                "select auth_user_id from org.account where lower(email) = $1",
                [email],
            );
            const facts = await Effect.runPromise(findMembershipsByEmail(sql, email));

            assert.isNull(row.rows[0]?.auth_user_id);
            assert.isTrue(canEnterApp({ app: "web", account: facts }).allowed);
        });

        it("INV-ACCESS-03 내보낸 사람은 다음 요청부터 문을 지나지 못한다", async () =>
        {
            const email = `left-${crypto.randomUUID().slice(0, 8)}@example.test`;
            const team = await seedTeam([
                { email: `team-${crypto.randomUUID().slice(0, 8)}@example.test`, role: "owner" },
                { email, role: "member" },
            ]);

            await Effect.runPromise(Effect.flatMap(TeamDirectory, (directory) =>
                directory.deactivate(team.members[1]?.membershipId ?? "")).pipe(
                Effect.provide(teamDirectoryPostgresLayer(sql)),
            ));

            const facts = await Effect.runPromise(findMembershipsByEmail(sql, email));

            assert.isFalse(canEnterApp({ app: "web", account: facts }).allowed);
        });

        it("INV-ACCESS-10 테넌트마다 소유주는 하나다. 두 번째 소유주는 유일 인덱스가 막는다", async () =>
        {
            const team = await seedTeam([
                { email: `team-${crypto.randomUUID().slice(0, 8)}@example.test`, role: "owner" },
                { email: `team-${crypto.randomUUID().slice(0, 8)}@example.test`, role: "admin" },
            ]);
            const refused = await attempt(web.url, "update org.membership set role = 'owner' where id = $1::bigint", [team.members[1]?.membershipId]);

            assert.include(refused, "membership_owner_per_tenant");
        });

        it("web_app 은 org.account 에 email · name 만 넣고, email · deactivated_at 은 고치지 못한다", async () =>
        {
            const refusals = await Promise.all([
                attempt(web.url, "insert into org.account (email, deactivated_at) values ('x@example.test', now())"),
                attempt(web.url, "update org.account set email = email where false"),
                attempt(web.url, "update org.account set deactivated_at = null where false"),
            ]);

            for (const refusal of refusals)
            {
                assert.include(refusal, "permission denied");
            }

            assert.strictEqual(await attempt(web.url, "update org.account set name = name where false"), "허용됨");
        });

        it("web_app 은 org.membership 의 role · active 만 고치고, account_id · tenant_id 는 고치지 못한다", async () =>
        {
            const refusals = await Promise.all([
                attempt(web.url, "update org.membership set account_id = account_id where false"),
                attempt(web.url, "update org.membership set tenant_id = tenant_id where false"),
                attempt(web.url, "delete from org.membership where false"),
            ]);

            for (const refusal of refusals)
            {
                assert.include(refusal, "permission denied");
            }

            assert.strictEqual(await attempt(web.url, "update org.membership set role = role, active = active where false"), "허용됨");
        });

        it("web_app 은 org.tenant 에 쓰지 못한다", async () =>
        {
            const refusals = await Promise.all([
                attempt(web.url, "insert into org.tenant (kind, name) values ('customer', '몰래')"),
                attempt(web.url, "update org.tenant set active = active where false"),
            ]);

            for (const refusal of refusals)
            {
                assert.include(refusal, "permission denied");
            }
        });
    });
}
