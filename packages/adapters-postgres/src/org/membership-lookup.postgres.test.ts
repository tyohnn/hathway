import { afterAll, assert, describe, it } from "vitest";
import { Effect } from "effect";

import { actorForApp } from "@investment/access/access/actorForApp";

import { closePostgresPools, poolExecutor, postgresPool } from "../connection.ts";
import { localDb } from "../testing/local-db.ts";

import { findMembershipsByEmail, findMembershipsByUserId } from "./MembershipLookupPostgres.ts";

/**
 * 행위자 확정의 둘째 계층인 소속이다. 세션의 `auth.users.id` 로 행위자를 확정한다.
 *
 * ⚠ **앱의 롤마다 붙어 잰다.** 같은 함수가 같은 표를 읽는데 GRANT 는 롤마다 따로다. 앱이 늘면 `ROLES` 에
 *    줄이 는다. 빠뜨리면 그 롤의 GRANT 누락이 **로그인은 되는데 전원이 `/no-access`** 로 떨어지는
 *    모양으로 배포에서 드러나고, 그 실패가 「이 앱을 쓸 수 없는 사람」과 같은 오류로 접히기 때문에
 *    증상만 보고는 원인을 찾을 수 없다.
 *
 * ⚠ 세션 자체(첫째 계층)는 여기서 재지 않는다. 쿠키와 Supabase Auth 가 필요해 브라우저 없이는 못
 *    세우는 것은 e2e 의 몫이다. 그 대신 **세션이 확정한 뒤의 모든 것**을 여기서 잰다.
 */
/** `supabase/seed.sql` 이 심는 합성 계정 */
const AUTH = {
    /** 운영팀 소유주 */
    ops: "00000000-0000-4000-8000-0000000000e1",
    /** 고객사 A 의 구성원 */
    kim: "00000000-0000-4000-8000-0000000000e2",
    /** 나간 사람 */
    gone: "00000000-0000-4000-8000-0000000000e6",
    /** 운영팀 구성원이면서 고객사 A 의 구성원 */
    both: "00000000-0000-4000-8000-0000000000e7",
    /** `org.account` 에 행이 없는 계정 */
    outsider: "00000000-0000-4000-8000-0000000000e9",
} as const;

const ROLES = [
    { app: "web", env: "WEB_DATABASE_URL" },
] as const;

afterAll(async () =>
{
    await closePostgresPools();
});

for (const { app, env } of ROLES)
{
    const db = localDb(env);

    if (!db.ok)
    {
        describe(`행위자 확정 (${app})`, () =>
        {
            throw new Error(db.reason);
        });

        continue;
    }

    const sql = poolExecutor(postgresPool(db.url));

    const enter = (authUserId: string) =>
        findMembershipsByUserId(sql, authUserId).pipe(
            Effect.flatMap((account) => actorForApp({ app, account })),
        );

    describe(`findMembershipsByUserId (${app}_app 롤)`, () =>
    {
        it("운영팀 소유주는 행위자가 된다. 테넌트와 역할을 org 에서 읽어 들고 나온다", async () =>
        {
            const actor = await Effect.runPromise(enter(AUTH.ops));

            assert.strictEqual(actor.accountId, "1");
            assert.strictEqual(actor.tenantKind, "operator");
            assert.strictEqual(actor.role, "owner");
        });

        it("INV-ACCESS-03 나간 사람은 멤버십이 살아 있어도 지나지 못한다", async () =>
        {
            const failure = await Effect.runPromise(Effect.flip(enter(AUTH.gone)));

            assert.strictEqual(failure._tag, "NotAppMember");
        });

        it("org.account 에 행이 없으면 이 앱을 쓸 수 없다. /no-access 로 간다", async () =>
        {
            const failure = await Effect.runPromise(Effect.flip(enter(AUTH.outsider)));

            assert.strictEqual(failure._tag, "NotAppMember");
            assert.match(failure.reason, /행이 없다/);
        });
    });

    describe(`findMembershipsByEmail (${app}_app 롤)`, () =>
    {
        it("이메일로 읽은 사실이 auth.users.id 로 읽은 것과 같다. 같은 사람이 어느 키로 들어와도 답이 같아야 한다", async () =>
        {
            const byEmail = await Effect.runPromise(findMembershipsByEmail(sql, "kim@example.test"));
            const byUser = await Effect.runPromise(findMembershipsByUserId(sql, AUTH.kim));

            assert.deepStrictEqual(byEmail, byUser);
        });

        it("대문자로 적어도 같은 계정을 편다. 소문자 유일 인덱스가 그것을 보장한다", async () =>
        {
            const account = await Effect.runPromise(findMembershipsByEmail(sql, "KIM@EXAMPLE.TEST"));

            assert.strictEqual(account.accountId, "2");
        });

        it("auth_user_id 가 비어 있는 계정도 읽힌다. 운영이 먼저 세운 사람은 첫 로그인 전까지 그 칸이 비어 있다", async () =>
        {
            const account = await Effect.runPromise(findMembershipsByEmail(sql, "new@example.test"));

            assert.strictEqual(account.accountId, "5");
            assert.strictEqual(account.memberships.length, 1);
        });
    });
}

// 스캐폴드의 이 파일은 겸직 계정이 agent 앱에서 운영팀으로 서는 것(INV-ACCESS-02)도 잰다. 이 저장소에는 agent 앱과
// 그 롤이 없어서 옮기지 않았다. 순수 판정은 `packages/access` 의 `actorForApp.test.ts` 가 그대로 잰다.
