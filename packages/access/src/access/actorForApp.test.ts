import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { actorForApp } from "./actorForApp.ts";
import type { AccountFacts, TenantMembership } from "./membership.ts";

/**
 * 읽어 온 소속 사실에서 이 앱의 행위자를 확정한다.
 *
 * 여러 테넌트에 속한 계정이 앱의 표에 맞는 테넌트로 서는 것이 이 함수의 요점이다. 그 값을 행위자가
 * 들고 다녀야 같은 사람이 앱에 따라 다른 범위를 본다.
 */
const membership = (over: Partial<TenantMembership> = {}): TenantMembership => ({
    membershipId: "1",
    tenantId: "2",
    tenantKind: "customer",
    tenantActive: true,
    role: "member",
    active: true,
    ...over,
});

const customer = membership();
const operator = membership({ membershipId: "2", tenantId: "1", tenantKind: "operator" });

describe("행위자 확정", () =>
{
    it("INV-ACCESS-02 agent 로 들어온 겸직 계정의 행위자는 문을 연 테넌트로 선다", async () =>
    {
        const both: AccountFacts = { accountId: "7", deactivated: false, memberships: [customer, operator] };

        const actor = await Effect.runPromise(actorForApp({ app: "agent", account: both }));

        assert.strictEqual(actor.tenantKind, "operator");
        assert.strictEqual(actor.tenantId, "1");
        assert.strictEqual(actor.accountId, "7");
    });

    it("문을 지나지 못하면 NotAppMember 로 끊긴다. 화면은 /no-access 로 간다", async () =>
    {
        const onlyCustomer: AccountFacts = { accountId: "9", deactivated: false, memberships: [customer] };

        const failure = await Effect.runPromise(Effect.flip(actorForApp({ app: "agent", account: onlyCustomer })));

        assert.strictEqual(failure._tag, "NotAppMember");
    });
});
