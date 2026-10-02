"use server";

import { revalidatePath } from "next/cache";
import { Effect } from "effect";

import type { TeamDirectory } from "@investment/access/ports/TeamDirectory";

import { appAction } from "@/lib/action";
import { REFUSAL_MESSAGES, refusalOf } from "@/lib/gateRefusal";
import { paths } from "@/lib/paths";
import { teamDirectoryLayer } from "@/lib/teamRuntime";
import {
    changeRole,
    ChangeRoleInput,
    invite,
    InviteInput,
    removeMember,
    RemoveMemberInput,
    renameMe,
    RenameInput,
    type TeamActionResult,
} from "@/usecases/team";

/**
 * 설정의 서버 액션 넷. **이 파일의 export 는 전부 관문(`appAction`)을 지난 것이다.**
 *
 *   ① Schema 파싱 · ② 인증        관문
 *   ③ 판정 · ④ 도메인 규칙          유스케이스가 부르는 `packages/access` 의 계획 함수(INV-ACCESS-09 · 10)
 *   ⑤ 저장                         명부의 조건부 쓰기
 *   ⑥ 밖으로                       화면을 다시 그린다. 초대 메일은 보내지 않는다
 *
 * ⚠ 관문이나 저장에서 끊긴 요청은 화면이 읽을 글로 바꿔 돌려준다(`lib/gateRefusal.ts`). 원문은 기록에만 남긴다.
 */
const withTeam = (program: Effect.Effect<TeamActionResult, unknown, TeamDirectory>, path: string, layout = false) =>
    Effect.flatMap(teamDirectoryLayer, (layer) => program.pipe(Effect.provide(layer))).pipe(
        Effect.tap((result) => Effect.sync(() => (result.ok ? revalidatePath(path, layout ? "layout" : "page") : undefined))),
    );

const refused = (label: string, cause: unknown): TeamActionResult =>
{
    const reason = refusalOf(cause);

    if (reason === "failed")
    {
        Effect.runFork(Effect.logError(`팀 ${label} 실패`, { module: "team", cause: String(cause) }));
    }

    return { ok: false, message: REFUSAL_MESSAGES[reason] };
};

const guarded = (label: string, action: (raw: unknown) => Promise<TeamActionResult>) =>
    async (raw: unknown): Promise<TeamActionResult> =>
    {
        try
        {
            return await action(raw);
        }
        catch (cause)
        {
            return refused(label, cause);
        }
    };

const inviteGate = guarded("초대", appAction({ input: InviteInput }, ({ input, actor }) =>
    withTeam(invite(actor, input), paths.team())));

const changeRoleGate = guarded("역할 바꾸기", appAction({ input: ChangeRoleInput }, ({ input, actor }) =>
    withTeam(changeRole(actor, input), paths.team())));

const removeMemberGate = guarded("팀에서 빼기", appAction({ input: RemoveMemberInput }, ({ input, actor }) =>
    withTeam(removeMember(actor, input), paths.team())));

// 이름은 사이드바에도 서므로 셸까지 다시 그린다
const renameGate = guarded("이름 바꾸기", appAction({ input: RenameInput }, ({ input, actor }) =>
    withTeam(renameMe(actor, input), "/", true)));

export async function inviteAction(raw: unknown): Promise<TeamActionResult>
{
    return inviteGate(raw);
}

export async function changeRoleAction(raw: unknown): Promise<TeamActionResult>
{
    return changeRoleGate(raw);
}

export async function removeMemberAction(raw: unknown): Promise<TeamActionResult>
{
    return removeMemberGate(raw);
}

export async function renameAction(raw: unknown): Promise<TeamActionResult>
{
    return renameGate(raw);
}
