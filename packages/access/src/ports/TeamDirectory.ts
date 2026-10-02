import { Context, type Effect, Schema } from "effect";

import type { InviteTarget, TeamMember } from "../access/team.ts";
import type { MembershipRole } from "../domain/AppAudience.ts";

/**
 * 한 테넌트의 사람을 읽고 고치는 포트. 설정의 팀 화면과 내 계정 화면이 쓴다. 구현은 메모리
 * (`testing/teamDirectoryMemory.ts`)와 Postgres(`@investment/adapters-postgres/org/TeamDirectoryPostgres`) 둘이고,
 * 계약 한 벌(`testing/contracts/team-directory.ts`)이 둘을 함께 잰다.
 *
 * ⚠ **판정은 여기서 하지 않는다.** 누가 무엇을 할 수 있는지는 `access/team.ts` 의 계획 함수가 정하고, 이 포트는
 *    그 계획을 적는다. 다만 쓰는 문장은 판정과 쓰기 사이의 틈을 한 번 더 막는다. 역할은 바꾸기 전 역할이 그대로일
 *    때만 바꾸고, 소유주의 멤버십은 끊지 않는다(INV-ACCESS-10).
 * ⚠ **읽는 메서드는 테넌트를 받는다.** 다른 테넌트의 멤버십 id 를 넘기면 `null` 이다. 있다는 것도 알리지 않는다.
 */
export class TeamDirectoryError extends Schema.TaggedError<TeamDirectoryError>()(
    "TeamDirectoryError",
    { message: Schema.String },
)
{}

/** 목록의 한 줄. 판정이 보는 멤버십에 사람이 알아볼 주소와 이름을 더했다 */
export interface MemberRow extends TeamMember
{
    readonly email: string;
    readonly name: string | null;
    /** 초대만 받고 아직 로그인하지 않았다. 계정에 세션이 이어지지 않은 것이다(`auth_user_id` 가 빈 칸) */
    readonly pending: boolean;
}

/** 한 계정이 속한 조직 하나 */
export interface AccountOrg
{
    readonly tenantId: string;
    readonly name: string;
}

/** 쓰기가 판정대로 되지 않았다. 그사이 다른 사람이 바꾼 것이다 */
export type WriteOutcome = "done" | "conflict";

export class TeamDirectory extends Context.Service<TeamDirectory, {
    /**
     * 이 테넌트의 살아 있는 멤버십. 소유주 · 관리자 · 구성원 차례이고 같은 역할 안에서는 먼저 들어온 사람이 먼저다.
     * 나간 계정은 멤버십이 살아 있어도 빠진다(INV-ACCESS-03). 어느 조직에도 들어오지 못하는 사람이다(2026-09-29 사용자 결정).
     */
    readonly listMembers: (tenantId: string) => Effect.Effect<ReadonlyArray<MemberRow>, TeamDirectoryError>;
    /** 이 테넌트의 살아 있는 멤버십 하나. 없거나 끊겼거나 나간 계정이거나 다른 테넌트의 것이면 `null` 이다 */
    readonly findMember: (tenantId: string, membershipId: string) => Effect.Effect<MemberRow | null, TeamDirectoryError>;
    /** 접은 주소의 계정과 이 테넌트의 멤버십(끊긴 것 포함). 초대 계획(`planInvite`)이 받는 모양 그대로다 */
    readonly inviteTarget: (tenantId: string, email: string) => Effect.Effect<InviteTarget, TeamDirectoryError>;
    /** 명부에 없는 주소로 계정과 멤버십을 함께 세운다. 그사이 같은 주소가 섰으면 `conflict` 다 */
    readonly createMember: (request: {
        readonly tenantId: string;
        readonly email: string;
        readonly role: MembershipRole;
    }) => Effect.Effect<WriteOutcome, TeamDirectoryError>;
    /** 명부에 있는 계정에 이 테넌트의 멤버십을 더한다. 그사이 멤버십이 섰으면 `conflict` 다 */
    readonly addMembership: (request: {
        readonly tenantId: string;
        readonly accountId: string;
        readonly role: MembershipRole;
    }) => Effect.Effect<WriteOutcome, TeamDirectoryError>;
    /** 끊긴 멤버십을 다시 잇는다. 이미 살아 있으면 `conflict` 다 */
    readonly reactivate: (request: {
        readonly membershipId: string;
        readonly role: MembershipRole;
    }) => Effect.Effect<WriteOutcome, TeamDirectoryError>;
    /** 역할이 `from` 그대로일 때만 `to` 로 바꾼다 */
    readonly changeRole: (request: {
        readonly membershipId: string;
        readonly from: MembershipRole;
        readonly to: MembershipRole;
    }) => Effect.Effect<WriteOutcome, TeamDirectoryError>;
    /** 살아 있고 소유주가 아닌 멤버십만 끊는다 */
    readonly deactivate: (membershipId: string) => Effect.Effect<WriteOutcome, TeamDirectoryError>;
    /** 이 계정이 살아 있는 멤버십으로 속한 열린 조직들. 사이드바가 여러 조직을 오가는 사람에게 지금 조직을 적는다 */
    readonly accountOrgs: (accountId: string) => Effect.Effect<ReadonlyArray<AccountOrg>, TeamDirectoryError>;
    /** 계정 하나의 이름을 바꾼다 */
    readonly rename: (request: { readonly accountId: string; readonly name: string }) => Effect.Effect<void, TeamDirectoryError>;
}>()("@investment/access/ports/TeamDirectory")
{}
