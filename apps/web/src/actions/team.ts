"use server";

import { revalidatePath } from "next/cache";
import { Effect, Layer } from "effect";

import type { TeamDirectory } from "@hathway/access/ports/TeamDirectory";


import { appAction } from "@/lib/action";
import type { PlanLimits } from "@/extensions/PlanLimits";
import { extensionsLayer } from "@/lib/modules";
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
 *   ⑥ 밖으로                       화면을 다시 그린다. 초대 메일은 아직 없다(2026-09-29 사용자 결정)
 */
// 초대는 멤버 한도를 확장 지점(`PlanLimits`)에 물으므로 확장 지점도 함께 붙인다
const withTeam = (program: Effect.Effect<TeamActionResult, unknown, TeamDirectory | PlanLimits>, path: string, layout = false) =>
    Effect.flatMap(Effect.all([teamDirectoryLayer, extensionsLayer]), ([team, extensions]) => program.pipe(Effect.provide(Layer.mergeAll(team, extensions)))).pipe(
        Effect.tap((result) => Effect.sync(() => (result.ok ? revalidatePath(path, layout ? "layout" : "page") : undefined))),
    );

export const inviteAction = appAction({ input: InviteInput }, ({ input, actor }) =>
    withTeam(invite(actor, input), paths.team()));

export const changeRoleAction = appAction({ input: ChangeRoleInput }, ({ input, actor }) =>
    withTeam(changeRole(actor, input), paths.team()));

export const removeMemberAction = appAction({ input: RemoveMemberInput }, ({ input, actor }) =>
    withTeam(removeMember(actor, input), paths.team()));

// 이름은 사이드바에도 서므로 셸까지 다시 그린다
export const renameAction = appAction({ input: RenameInput }, ({ input, actor }) =>
    withTeam(renameMe(actor, input), "/", true));
