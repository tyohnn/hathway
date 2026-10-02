import { describe, expect, it } from "vitest";

import { actorOf, customerActor, customerAdminActor, operatorActor } from "../testing/actor.ts";
import {
    canManageMembers,
    canSeeMembers,
    planInvite,
    planRemoval,
    planRename,
    planRoleChange,
    type InviteTarget,
    type TeamMember,
} from "./team.ts";

/**
 * 자기 조직의 사람을 관리하는 판정. 테스트 이름이 규칙의 정본이다.
 *
 * 테넌트 id 는 `supabase/seed.sql` 과 같다. 운영팀 1, 고객사 A 2, 고객사 B 3.
 */
const inTenant = (tenantId: string) => ({ tenantId });

describe("팀을 관리할 자격", () =>
{
    it("INV-ACCESS-09 소유주와 관리자는 자기 테넌트의 구성원을 관리한다", () =>
    {
        expect(canManageMembers(customerActor("3", { role: "owner" }), inTenant("2"))).toBe(true);
        expect(canManageMembers(customerAdminActor("5"), inTenant("2"))).toBe(true);
        expect(canManageMembers(operatorActor("1", { role: "owner" }), inTenant("1"))).toBe(true);
    });

    it("INV-ACCESS-09 구성원은 목록을 볼 수 있지만 바꾸지 못한다", () =>
    {
        const member = customerActor("2");

        expect(canSeeMembers(member, inTenant("2"))).toBe(true);
        expect(canManageMembers(member, inTenant("2"))).toBe(false);
    });

    it("INV-ACCESS-09 다른 테넌트의 멤버십은 역할과 상관없이 건드리지 못한다", () =>
    {
        const owner = customerActor("3", { role: "owner" });

        expect(canSeeMembers(owner, inTenant("3"))).toBe(false);
        expect(canManageMembers(owner, inTenant("3"))).toBe(false);
        // 운영팀의 소유주라도 고객사의 사람은 여기서 관리하지 못한다. 그것은 운영 도구의 일이다(INV-ACCESS-05)
        expect(canManageMembers(operatorActor("1", { role: "owner" }), inTenant("2"))).toBe(false);
    });

    it("INV-ACCESS-09 겸직 계정은 지금 들어온 테넌트에서만 관리한다", () =>
    {
        // 운영팀의 구성원이면서 고객사 A 의 관리자인 사람이 고객사 A 로 들어왔다
        const both = actorOf({ accountId: "7", tenantId: "2", tenantKind: "customer", role: "admin" });

        expect(canManageMembers(both, inTenant("2"))).toBe(true);
        expect(canManageMembers(both, inTenant("1"))).toBe(false);
    });
});

describe("초대", () =>
{
    const owner = customerActor("3", { role: "owner" });
    const nobody: InviteTarget = null;

    it("주소는 소문자로 접고, 주소가 아니면 거절한다", () =>
    {
        expect(planInvite(owner, { email: "  New@Example.test ", role: "member" }, nobody))
            .toEqual({ _tag: "CreateAccount", email: "new@example.test", role: "member" });
        expect(planInvite(owner, { email: "주소 아님", role: "member" }, nobody))
            .toEqual({ _tag: "Refuse", reason: "invalid_email" });
    });

    it("명부에 없는 주소면 계정과 멤버십을 함께 세운다", () =>
    {
        expect(planInvite(owner, { email: "new@example.test", role: "admin" }, nobody))
            .toEqual({ _tag: "CreateAccount", email: "new@example.test", role: "admin" });
    });

    it("명부에 있는 계정이면 멤버십만 더한다", () =>
    {
        expect(planInvite(owner, { email: "park@example.test", role: "member" }, { accountId: "4", deactivated: false, membership: null }))
            .toEqual({ _tag: "AddMembership", accountId: "4", role: "member" });
    });

    it("이미 이 테넌트의 구성원이면 이미 있는 사람으로 거절한다", () =>
    {
        const kim = { accountId: "2", deactivated: false, membership: { membershipId: "2", active: true } };

        expect(planInvite(owner, { email: "kim@example.test", role: "member" }, kim))
            .toEqual({ _tag: "Refuse", reason: "already_member" });
    });

    it("끊긴 멤버십이 있으면 새로 만들지 않고 다시 잇는다", () =>
    {
        const left = { accountId: "8", deactivated: false, membership: { membershipId: "9", active: false } };

        expect(planInvite(owner, { email: "left@example.test", role: "admin" }, left))
            .toEqual({ _tag: "Reactivate", membershipId: "9", role: "admin" });
    });

    it("INV-ACCESS-03 나간 계정은 초대하지 못한다", () =>
    {
        expect(planInvite(owner, { email: "gone@example.test", role: "member" }, { accountId: "6", deactivated: true, membership: null }))
            .toEqual({ _tag: "Refuse", reason: "deactivated" });
    });

    it("INV-ACCESS-10 초대로 소유주를 세우지 못한다. 역할은 관리자나 구성원이다", () =>
    {
        expect(planInvite(owner, { email: "new@example.test", role: "owner" }, nobody))
            .toEqual({ _tag: "Refuse", reason: "owner_role" });
    });

    it("INV-ACCESS-09 구성원은 초대하지 못한다", () =>
    {
        expect(planInvite(customerActor("2"), { email: "new@example.test", role: "member" }, nobody))
            .toEqual({ _tag: "Refuse", reason: "not_allowed" });
    });
});

/** 고객사 A(2)의 사람들. 이(3)가 소유주, 관리자 둘(5 · 6), 김(2)이 구성원이다 */
const memberOf = (accountId: string, role: TeamMember["role"], tenantId = "2"): TeamMember =>
    ({ membershipId: `m${accountId}`, accountId, tenantId, role });

describe("역할 바꾸기", () =>
{
    const owner = customerActor("3", { role: "owner" });
    const admin = customerAdminActor("5");

    it("INV-ACCESS-10 관리자와 구성원 사이만 바꾼다. 소유주로 올리거나 소유주를 내리지 못한다", () =>
    {
        expect(planRoleChange(owner, memberOf("2", "member"), "admin"))
            .toEqual({ _tag: "Change", membershipId: "m2", from: "member", to: "admin" });
        expect(planRoleChange(owner, memberOf("2", "member"), "owner")).toEqual({ _tag: "Refuse", reason: "owner" });
        expect(planRoleChange(admin, memberOf("3", "owner"), "member")).toEqual({ _tag: "Refuse", reason: "owner" });
    });

    it("관리자는 다른 관리자를 구성원으로 내리지 못한다. 그것은 소유주만 한다", () =>
    {
        expect(planRoleChange(admin, memberOf("6", "admin"), "member")).toEqual({ _tag: "Refuse", reason: "owner_only" });
        expect(planRoleChange(owner, memberOf("6", "admin"), "member"))
            .toEqual({ _tag: "Change", membershipId: "m6", from: "admin", to: "member" });
        // 구성원을 관리자로 올리는 것은 관리자도 한다
        expect(planRoleChange(admin, memberOf("2", "member"), "admin"))
            .toEqual({ _tag: "Change", membershipId: "m2", from: "member", to: "admin" });
    });

    it("자기 역할은 바꾸지 못한다", () =>
    {
        expect(planRoleChange(admin, memberOf("5", "admin"), "member")).toEqual({ _tag: "Refuse", reason: "self" });
    });

    it("같은 역할로 바꾸면 쓰지 않는다", () =>
    {
        expect(planRoleChange(owner, memberOf("2", "member"), "member")).toEqual({ _tag: "Unchanged" });
    });

    it("INV-ACCESS-09 구성원이나 다른 테넌트의 사람은 역할을 바꾸지 못한다", () =>
    {
        expect(planRoleChange(customerActor("2"), memberOf("5", "admin"), "member")).toEqual({ _tag: "Refuse", reason: "not_allowed" });
        expect(planRoleChange(owner, memberOf("4", "member", "3"), "admin")).toEqual({ _tag: "Refuse", reason: "not_allowed" });
    });
});

describe("내보내기", () =>
{
    const owner = customerActor("3", { role: "owner" });
    const admin = customerAdminActor("5");

    it("INV-ACCESS-03 지우지 않고 멤버십을 끊는다", () =>
    {
        expect(planRemoval(owner, memberOf("2", "member"))).toEqual({ _tag: "Deactivate", membershipId: "m2" });
    });

    it("INV-ACCESS-10 소유주는 내보내지 못한다", () =>
    {
        expect(planRemoval(admin, memberOf("3", "owner"))).toEqual({ _tag: "Refuse", reason: "owner" });
    });

    it("관리자는 구성원만 내보내고, 관리자를 내보내는 것은 소유주만 한다", () =>
    {
        expect(planRemoval(admin, memberOf("2", "member"))).toEqual({ _tag: "Deactivate", membershipId: "m2" });
        expect(planRemoval(admin, memberOf("6", "admin"))).toEqual({ _tag: "Refuse", reason: "owner_only" });
        expect(planRemoval(owner, memberOf("6", "admin"))).toEqual({ _tag: "Deactivate", membershipId: "m6" });
    });

    it("자기 자신은 내보내지 못한다", () =>
    {
        expect(planRemoval(admin, memberOf("5", "admin"))).toEqual({ _tag: "Refuse", reason: "self" });
    });

    it("INV-ACCESS-09 구성원이나 다른 테넌트의 사람은 내보내지 못한다", () =>
    {
        expect(planRemoval(customerActor("2"), memberOf("6", "member"))).toEqual({ _tag: "Refuse", reason: "not_allowed" });
        expect(planRemoval(owner, memberOf("4", "member", "3"))).toEqual({ _tag: "Refuse", reason: "not_allowed" });
    });
});

describe("내 이름", () =>
{
    const kim = customerActor("2");

    it("앞뒤 공백을 걷고, 비었거나 50자를 넘으면 거절한다", () =>
    {
        expect(planRename(kim, "  김지우 ")).toEqual({ _tag: "Rename", accountId: "2", name: "김지우" });
        expect(planRename(kim, "   ")).toEqual({ _tag: "Refuse", reason: "blank" });
        expect(planRename(kim, "가".repeat(50))).toEqual({ _tag: "Rename", accountId: "2", name: "가".repeat(50) });
        expect(planRename(kim, "가".repeat(51))).toEqual({ _tag: "Refuse", reason: "too_long" });
    });

    it("이름은 자기 계정에만 쓴다. 역할과 상관없다", () =>
    {
        expect(planRename(customerActor("3", { role: "owner" }), "이소유")).toEqual({ _tag: "Rename", accountId: "3", name: "이소유" });
    });
});
