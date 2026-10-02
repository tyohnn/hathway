import { Effect, Schema } from "effect";

import {
    canManageMembers,
    NAME_MAX,
    planInvite,
    planRemoval,
    planRename,
    planRoleChange,
    type TeamRefusal,
} from "@investment/access/access/team";
import type { Actor } from "@investment/access/domain/Actor";
import { MembershipRole } from "@investment/access/domain/AppAudience";
import { type MemberRow, TeamDirectory } from "@investment/access/ports/TeamDirectory";

/**
 * 설정의 팀 화면과 내 계정 화면의 조립. 서버 액션의 ③~⑤를 이 파일이 잇는다.
 *
 * ⚠ **`"use server"` 파일에 두지 않는다.** 그 파일의 export 는 전부 공개 엔드포인트가 된다(`usecases/research.ts` 와 같다).
 * ⚠ **판정은 `packages/access` 의 계획 함수가 한다(INV-ACCESS-09 · 10).** 여기서 조건을 다시 적지 않는다.
 * ⚠ **테넌트는 입력이 아니라 행위자에게서 온다.** 멤버십 id 로 찾을 때도 행위자의 테넌트 안에서만 찾으므로, 다른
 *    테넌트의 id 는 「없는 사람」이 된다.
 */

/** 액션이 화면에 돌려주는 결과. 폼이 그 자리에 문구를 세운다 */
export type TeamActionResult =
    | { readonly ok: true }
    | { readonly ok: false; readonly field?: "email" | "name"; readonly message: string };

/** 초대 · 역할로 고를 수 있는 것. 소유자는 여기서 세우지 않는다(INV-ACCESS-10) */
const AssignableRole = Schema.Literals(["admin", "member"]);

export const InviteInput = Schema.Struct({
    // 주소의 꼴은 계획 함수가 본다. 여기서는 받을 수 있는 길이만 막는다(RFC 5321 의 254자)
    email: Schema.String.check(Schema.isMaxLength(254)),
    role: AssignableRole,
});

export type InviteInput = typeof InviteInput.Type;

export const ChangeRoleInput = Schema.Struct({
    membershipId: Schema.NonEmptyString,
    /** 사람이 화면을 열었을 때 본 역할. 그사이 바뀌었으면 덮어쓰지 않는다 */
    from: MembershipRole,
    to: AssignableRole,
});

export type ChangeRoleInput = typeof ChangeRoleInput.Type;

export const RemoveMemberInput = Schema.Struct({ membershipId: Schema.NonEmptyString });

export type RemoveMemberInput = typeof RemoveMemberInput.Type;

export const RenameInput = Schema.Struct({ name: Schema.String.check(Schema.isMaxLength(200)) });

export type RenameInput = typeof RenameInput.Type;

const NOT_FOUND = "이미 팀에 없는 사람이에요. 새로고침해 주세요.";

/** 그사이 다른 사람이 팀을 바꿨다. 무엇을 다시 할지 동작마다 말한다 */
const STALE = {
    invite: "그사이 팀이 바뀌었어요. 새로고침한 뒤 다시 초대해 주세요.",
    role: "그사이 팀이 바뀌었어요. 새로고침한 뒤 다시 바꿔 주세요.",
    removal: "그사이 팀이 바뀌었어요. 새로고침한 뒤 다시 빼 주세요.",
} as const;

const INVITE_MESSAGES = {
    not_allowed: "소유자와 관리자만 초대할 수 있어요.",
    invalid_email: "이메일 형식이 맞지 않아요.",
    owner_role: "소유자로는 초대할 수 없어요.",
    already_member: "이미 팀에 있는 사람이에요.",
    // 나간 계정인지는 다른 조직의 일이라 알리지 않는다
    deactivated: "이 주소로는 초대할 수 없어요.",
} as const;

const ROLE_MESSAGES: Readonly<Record<TeamRefusal, string>> = {
    not_allowed: "소유자와 관리자만 역할을 바꿀 수 있어요.",
    owner: "소유자의 역할은 바꿀 수 없어요.",
    owner_only: "관리자의 역할은 소유자만 바꿀 수 있어요.",
    self: "내 역할은 바꿀 수 없어요.",
};

const REMOVAL_MESSAGES: Readonly<Record<TeamRefusal, string>> = {
    not_allowed: "소유자와 관리자만 팀에서 뺄 수 있어요.",
    owner: "소유자는 팀에서 뺄 수 없어요.",
    owner_only: "관리자는 소유자만 팀에서 뺄 수 있어요.",
    self: "나를 팀에서 뺄 수는 없어요.",
};

const failed = (message: string, field?: "email" | "name"): TeamActionResult =>
    field === undefined ? { ok: false, message } : { ok: false, field, message };

const OK: TeamActionResult = { ok: true };

/** 팀 화면이 그리는 것. 같은 테넌트면 누구나 목록을 보고, 관리 단추는 `canManage` 일 때만 선다 */
export const listTeam = (actor: Actor): Effect.Effect<{ readonly members: ReadonlyArray<MemberRow>; readonly canManage: boolean }, unknown, TeamDirectory> =>
    Effect.map(
        Effect.flatMap(TeamDirectory, (directory) => directory.listMembers(actor.tenantId)),
        (members) => ({ members, canManage: canManageMembers(actor, actor) }),
    );

/** 내 계정 한 줄. 내 계정 화면이 이름 칸의 처음 값으로 쓴다 */
export const myself = (actor: Actor): Effect.Effect<MemberRow | null, unknown, TeamDirectory> =>
    Effect.map(listTeam(actor), ({ members }) => members.find((member) => member.accountId === actor.accountId) ?? null);

/**
 * 사이드바에 적을 지금 조직의 이름. 여러 조직에 속한 사람에게만 뜻이 있어서, 조직이 하나면 `null` 이다
 * (2026-09-29 사용자 결정). 조직이 하나인 사람에게 적으면 모든 화면에 같은 소음이 선다.
 */
export const currentOrgName = (actor: Actor): Effect.Effect<string | null, unknown, TeamDirectory> =>
    Effect.map(
        Effect.flatMap(TeamDirectory, (directory) => directory.accountOrgs(actor.accountId)),
        (orgs) => (orgs.length > 1 ? orgs.find((org) => org.tenantId === actor.tenantId)?.name ?? null : null),
    );

/** 초대. 메일은 보내지 않는다. 명부에 주소를 세우면 그 주소의 계정이 처음 로그인할 때 이어진다(INV-ACCESS-08) */
export const invite = (actor: Actor, input: InviteInput): Effect.Effect<TeamActionResult, unknown, TeamDirectory> =>
    Effect.gen(function*()
    {
        const directory = yield* TeamDirectory;
        const email = input.email.trim().toLowerCase();
        const found = yield* directory.inviteTarget(actor.tenantId, email);
        const plan = planInvite(actor, input, found);

        switch (plan._tag)
        {
            case "Refuse":
                return failed(INVITE_MESSAGES[plan.reason], plan.reason === "invalid_email" ? "email" : undefined);
            case "CreateAccount":
                return (yield* directory.createMember({ tenantId: actor.tenantId, email: plan.email, role: plan.role })) === "done" ? OK : failed(STALE.invite);
            case "AddMembership":
                return (yield* directory.addMembership({ tenantId: actor.tenantId, accountId: plan.accountId, role: plan.role })) === "done" ? OK : failed(STALE.invite);
            case "Reactivate":
                return (yield* directory.reactivate({ membershipId: plan.membershipId, role: plan.role })) === "done" ? OK : failed(STALE.invite);
        }
    });

export const changeRole = (actor: Actor, input: ChangeRoleInput): Effect.Effect<TeamActionResult, unknown, TeamDirectory> =>
    Effect.gen(function*()
    {
        const directory = yield* TeamDirectory;
        const target = yield* directory.findMember(actor.tenantId, input.membershipId);

        if (target === null)
        {
            return failed(NOT_FOUND);
        }

        // 사람이 본 역할과 지금 역할이 다르면 판정하기 전에 멈춘다. 판정은 지금 역할로 하므로 본 적 없는 상태를 바꾸게 된다
        if (target.role !== input.from)
        {
            return failed(STALE.role);
        }

        const plan = planRoleChange(actor, target, input.to);

        switch (plan._tag)
        {
            case "Refuse":
                return failed(ROLE_MESSAGES[plan.reason]);
            case "Unchanged":
                return OK;
            case "Change":
                return (yield* directory.changeRole(plan)) === "done" ? OK : failed(STALE.role);
        }
    });

export const removeMember = (actor: Actor, input: RemoveMemberInput): Effect.Effect<TeamActionResult, unknown, TeamDirectory> =>
    Effect.gen(function*()
    {
        const directory = yield* TeamDirectory;
        const target = yield* directory.findMember(actor.tenantId, input.membershipId);

        if (target === null)
        {
            return failed(NOT_FOUND);
        }

        const plan = planRemoval(actor, target);

        if (plan._tag === "Refuse")
        {
            return failed(REMOVAL_MESSAGES[plan.reason]);
        }

        return (yield* directory.deactivate(plan.membershipId)) === "done" ? OK : failed(STALE.removal);
    });

export const renameMe = (actor: Actor, input: RenameInput): Effect.Effect<TeamActionResult, unknown, TeamDirectory> =>
    Effect.gen(function*()
    {
        const plan = planRename(actor, input.name);

        if (plan._tag === "Refuse")
        {
            return plan.reason === "blank"
                ? failed("이름을 적어 주세요.", "name")
                : failed(`이름은 ${NAME_MAX}자까지 적을 수 있어요.`, "name");
        }

        yield* Effect.flatMap(TeamDirectory, (directory) => directory.rename(plan));

        return OK;
    });
