import type { Actor } from "../domain/Actor.ts";
import type { MembershipRole } from "../domain/AppAudience.ts";
import { normalizeLoginEmail } from "./signInLink.ts";

/**
 * 자기 조직의 사람을 관리하는 판정. 설정의 팀 화면이 부른다.
 *
 * 판정은 모두 행위자가 **지금 들어온 테넌트** 하나 안에서 한다(INV-ACCESS-02). 겸직 계정이 다른 테넌트의
 * 관리자라도, 지금 들어온 테넌트의 역할이 답한다.
 *
 * ⚠ **운영 도구의 자격(`canAdministerOrg`, INV-ACCESS-05)과 섞지 않는다.** 그쪽은 운영팀이 다른 테넌트를
 *    고치는 자격이고 여기는 자기 테넌트 안의 일이다. 둘을 합치면 고객사의 소유주가 운영 도구를 여는 길이 생긴다.
 * ⚠ **소유주는 여기서 바뀌지 않는다(INV-ACCESS-10).** 초대로 세우지 못하고, 역할을 바꾸거나 내보내지 못한다.
 *    테넌트마다 소유주가 하나라는 것은 유일 인덱스가 한 번 더 막는다. 소유주를 넘기는 일은 따로 세운다.
 */

/** 판정이 보는 멤버십 하나. 어느 테넌트의 누구이고 무슨 역할인가 */
export interface TeamMember
{
    readonly membershipId: string;
    readonly accountId: string;
    readonly tenantId: string;
    readonly role: MembershipRole;
}

/** 이 테넌트의 사람 목록을 볼 수 있는가. 같은 테넌트면 역할과 상관없이 본다 */
export const canSeeMembers = (actor: Actor, target: { readonly tenantId: string }): boolean =>
    actor.tenantId === target.tenantId;

/** INV-ACCESS-09 이 테넌트의 사람을 관리할 수 있는가. 같은 테넌트의 소유주와 관리자만 한다 */
export const canManageMembers = (actor: Actor, target: { readonly tenantId: string }): boolean =>
    canSeeMembers(actor, target) && (actor.role === "owner" || actor.role === "admin");

/**
 * 초대할 주소로 명부에서 찾은 것. 계정이 없으면 `null` 이고, 계정이 있으면 이 테넌트의 멤버십을 함께 든다.
 * 유스케이스가 접은 주소로 찾아 넘긴다.
 */
export type InviteTarget = {
    readonly accountId: string;
    readonly deactivated: boolean;
    readonly membership: { readonly membershipId: string; readonly active: boolean } | null;
} | null;

export type InvitePlan =
    | { readonly _tag: "CreateAccount"; readonly email: string; readonly role: MembershipRole }
    | { readonly _tag: "AddMembership"; readonly accountId: string; readonly role: MembershipRole }
    | { readonly _tag: "Reactivate"; readonly membershipId: string; readonly role: MembershipRole }
    | { readonly _tag: "Refuse"; readonly reason: "not_allowed" | "invalid_email" | "owner_role" | "already_member" | "deactivated" };

/**
 * 지금 들어온 테넌트에 한 사람을 초대하는 계획.
 *
 * 명부에 없는 주소면 계정을 새로 세운다. 그 계정은 `auth_user_id` 가 빈 채로 서고, 그 주소의 사람이 처음
 * 로그인할 때 이어진다(INV-ACCESS-08). 메일은 보내지 않는다(2026-09-29 사용자 결정: 나중에).
 *
 * ⚠ **끊긴 멤버십은 새로 만들지 않고 다시 잇는다.** `(account_id, tenant_id)` 가 유일해서 새 행은 서지 못한다.
 * ⚠ **나간 계정은 초대로 살리지 않는다(INV-ACCESS-03).** 계정을 살리는 것은 운영 도구의 일이다.
 */
export const planInvite = (
    actor: Actor,
    input: { readonly email: string; readonly role: MembershipRole },
    found: InviteTarget,
): InvitePlan =>
{
    if (!canManageMembers(actor, actor))
    {
        return { _tag: "Refuse", reason: "not_allowed" };
    }

    const email = normalizeLoginEmail(input.email);

    if (email === null)
    {
        return { _tag: "Refuse", reason: "invalid_email" };
    }

    if (input.role === "owner")
    {
        return { _tag: "Refuse", reason: "owner_role" };
    }

    if (found === null)
    {
        return { _tag: "CreateAccount", email, role: input.role };
    }

    if (found.deactivated)
    {
        return { _tag: "Refuse", reason: "deactivated" };
    }

    if (found.membership === null)
    {
        return { _tag: "AddMembership", accountId: found.accountId, role: input.role };
    }

    return found.membership.active
        ? { _tag: "Refuse", reason: "already_member" }
        : { _tag: "Reactivate", membershipId: found.membership.membershipId, role: input.role };
};

/** 역할을 바꾸거나 내보내지 않는 까닭. 화면이 사람의 말로 옮긴다 */
export type TeamRefusal = "not_allowed" | "owner" | "owner_only" | "self";

export type RoleChangePlan =
    | { readonly _tag: "Change"; readonly membershipId: string; readonly from: MembershipRole; readonly to: MembershipRole }
    | { readonly _tag: "Unchanged" }
    | { readonly _tag: "Refuse"; readonly reason: TeamRefusal };

/**
 * 한 사람의 역할을 바꾸는 계획. 관리자와 구성원 사이만 오간다.
 *
 * ⚠ **자기 역할은 바꾸지 못한다.** 관리자가 자기를 내리면 그 테넌트에 관리할 사람이 사라질 수 있다.
 * ⚠ **관리자끼리는 서로 내리지 못한다.** 그러면 먼저 누른 사람이 다른 관리자를 모두 내릴 수 있다. 소유주만 한다.
 * ⚠ `Change` 는 바꾸기 전 역할(`from`)을 들고 나간다. 쓰는 쪽이 그 역할일 때만 바꿔서, 그사이 다른 사람이 바꾼
 *    역할을 덮지 않는다.
 */
export const planRoleChange = (actor: Actor, target: TeamMember, to: MembershipRole): RoleChangePlan =>
{
    const refusal = refusalFor(actor, target);

    if (refusal !== null)
    {
        return { _tag: "Refuse", reason: refusal };
    }

    if (to === "owner")
    {
        return { _tag: "Refuse", reason: "owner" };
    }

    if (target.role === to)
    {
        return { _tag: "Unchanged" };
    }

    return { _tag: "Change", membershipId: target.membershipId, from: target.role, to };
};

/** 역할 바꾸기와 내보내기가 함께 지나는 거절. 차례가 곧 우선순위다 */
const refusalFor = (actor: Actor, target: TeamMember): TeamRefusal | null =>
{
    if (!canManageMembers(actor, target))
    {
        return "not_allowed";
    }

    if (target.accountId === actor.accountId)
    {
        return "self";
    }

    if (target.role === "owner")
    {
        return "owner";
    }

    if (target.role === "admin" && actor.role !== "owner")
    {
        return "owner_only";
    }

    return null;
};

export type RemovalPlan =
    | { readonly _tag: "Deactivate"; readonly membershipId: string }
    | { readonly _tag: "Refuse"; readonly reason: TeamRefusal };

/**
 * 한 사람을 이 테넌트에서 내보내는 계획. 행을 지우지 않고 멤버십을 끊는다. 끊긴 멤버십은 다음 요청부터
 * 문을 지나지 못하고(INV-ACCESS-03), 쓴 쪽지 같은 기록은 그 사람의 이름으로 남는다.
 */
export const planRemoval = (actor: Actor, target: TeamMember): RemovalPlan =>
{
    const refusal = refusalFor(actor, target);

    return refusal === null ? { _tag: "Deactivate", membershipId: target.membershipId } : { _tag: "Refuse", reason: refusal };
};

/** 이름의 최대 글자 수. 코드 포인트로 센다 */
export const NAME_MAX = 50;

export type RenamePlan =
    | { readonly _tag: "Rename"; readonly accountId: string; readonly name: string }
    | { readonly _tag: "Refuse"; readonly reason: "blank" | "too_long" };

/** 내 이름을 바꾸는 계획. 계정은 언제나 행위자 자신이다. 남의 이름을 바꾸는 길은 두지 않는다 */
export const planRename = (actor: Actor, raw: string): RenamePlan =>
{
    const name = raw.trim();

    if (name === "")
    {
        return { _tag: "Refuse", reason: "blank" };
    }

    if ([...name].length > NAME_MAX)
    {
        return { _tag: "Refuse", reason: "too_long" };
    }

    return { _tag: "Rename", accountId: actor.accountId, name };
};
