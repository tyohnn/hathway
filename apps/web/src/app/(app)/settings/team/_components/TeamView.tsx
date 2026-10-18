import { Effect, Layer } from "effect";

import { planRemoval } from "@hathway/access/access/team";

import { extensionsLayer } from "@/lib/modules";
import { appRead } from "@/lib/read";
import { teamDirectoryLayer } from "@/lib/teamRuntime";
import { teamOverview } from "@/usecases/team";

import { TeamBody } from "./TeamBody";
import type { MemberLine } from "./roster";

/**
 * 팀 조회를 기다리는 조각. 요청 시점이라 `<Suspense>` 안쪽에서만 쓴다.
 *
 * ⚠ **줄을 고칠 수 있는지는 판정(`planRemoval`)에 그대로 묻는다.** 역할 바꾸기와 팀에서 빼기는 같은 거절을 지나므로 하나로
 *    충분하다. 여기서 조건을 다시 적으면 판정이 바뀌는 날 화면만 옛 규칙으로 남는다.
 * ⚠ **행위자는 여기서 멈춘다.** 표는 클라이언트 조각이라 행위자를 넘기지 않고, 줄마다 답(`me` · `editable`)만 싣는다.
 * ⚠ 멤버 한도는 초대와 같은 확장 지점에 묻는다. 그래서 명부와 확장 지점을 함께 붙인다.
 */
export async function TeamView()
{
    const screen = await appRead((actor) =>
        Effect.flatMap(Effect.all([teamDirectoryLayer, extensionsLayer]), ([team, extensions]) =>
            teamOverview(actor).pipe(Effect.provide(Layer.mergeAll(team, extensions)))).pipe(
            Effect.map(({ members, canManage, summary, upgradeHref }) => ({
                lines: members.map((member): MemberLine => ({
                    membershipId: member.membershipId,
                    name: member.name,
                    email: member.email,
                    role: member.role,
                    pending: member.pending,
                    me: member.accountId === actor.accountId,
                    editable: canManage && planRemoval(actor, member)._tag !== "Refuse",
                })),
                canManage,
                summary,
                upgradeHref,
            })),
        ));

    return <TeamBody screen={screen} />;
}
