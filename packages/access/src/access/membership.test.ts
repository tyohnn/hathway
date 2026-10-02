import { assert, describe, it } from "@effect/vitest";

import { canEnterApp, type AccountFacts, type TenantMembership } from "./membership.ts";

/**
 * 인증의 둘째 계층: 소속 판정 (요구사항 R-002 ·
 * `docs/decisions/2026-09-16-앱의-문은-테넌트-종류가-연다.md`).
 *
 * 앱이 늘면 모두 같은 표(`org.membership`)를 읽으면서 서로 다른 답을 내야 하는 자리다. 판정이 앱마다
 * 흩어지면 규칙인지 사고인지 알 수 없게 된다.
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

const account = (memberships: ReadonlyArray<TenantMembership>, deactivated = false): AccountFacts => ({
    accountId: "1",
    deactivated,
    memberships,
});

const customer = membership();
const operator = membership({ membershipId: "2", tenantId: "1", tenantKind: "operator" });

describe("소속 판정", () =>
{
    it("INV-ACCESS-01 어느 테넌트에도 속하지 않으면 어느 앱도 지나지 못한다", () =>
    {
        for (const app of ["web", "agent"] as const)
        {
            assert.strictEqual(canEnterApp({ app, account: account([]) }).allowed, false);
        }
    });

    it("INV-ACCESS-03 나간 계정은 멤버십이 살아 있어도 지나지 못한다", () =>
    {
        const verdict = canEnterApp({ app: "web", account: account([customer], true) });

        assert.strictEqual(verdict.allowed, false);
    });

    it("INV-ACCESS-03 끊긴 멤버십으로는 지나지 못한다", () =>
    {
        const verdict = canEnterApp({ app: "web", account: account([membership({ active: false })]) });

        assert.strictEqual(verdict.allowed, false);
    });

    it("INV-ACCESS-03 테넌트가 비활성이면 그 멤버십으로는 지나지 못한다", () =>
    {
        const verdict = canEnterApp({ app: "web", account: account([membership({ tenantActive: false })]) });

        assert.strictEqual(verdict.allowed, false);
    });

    it("web 은 고객과 운영팀 둘 다 지난다", () =>
    {
        assert.strictEqual(canEnterApp({ app: "web", account: account([customer]) }).allowed, true);
        assert.strictEqual(canEnterApp({ app: "web", account: account([operator]) }).allowed, true);
    });

    it("agent 는 운영팀만 지난다. 고객에게는 아직 열지 않은 자리다", () =>
    {
        assert.strictEqual(canEnterApp({ app: "agent", account: account([operator]) }).allowed, true);
        assert.strictEqual(canEnterApp({ app: "agent", account: account([customer]) }).allowed, false);
    });

    it("INV-ACCESS-02 지나온 멤버십을 함께 돌려준다. 행위자가 그 테넌트를 들고 다닌다", () =>
    {
        const verdict = canEnterApp({ app: "agent", account: account([customer, operator]) });

        assert.strictEqual(verdict.allowed && verdict.membership.tenantKind, "operator");
    });

    it("INV-ACCESS-01 고객사가 둘이어도 술어가 바뀌지 않는다. 테넌트 행이 하나 늘 뿐이다", () =>
    {
        const other = membership({ membershipId: "9", tenantId: "9" });

        assert.strictEqual(canEnterApp({ app: "web", account: account([other]) }).allowed, true);
    });

    it("모르는 앱은 거절한다. 기본값을 허용으로 두면 기획보다 문이 먼저 열린다", () =>
    {
        // 타입은 막지만 바깥에서 문자열이 들어오는 경로가 생길 수 있어 런타임도 막는다
        const verdict = canEnterApp({
            app: "billing" as unknown as "web",
            account: account([customer, operator]),
        });

        assert.strictEqual(verdict.allowed, false);
    });
});
