import { Effect } from "effect";

import { planRemoval } from "@investment/access/access/team";
import { ItemList, type ListItem } from "@investment/blocks/item-list";
import { Badge } from "@investment/ui/components/badge";

import { paths } from "@/lib/paths";
import { appRead } from "@/lib/read";
import { teamDirectoryLayer } from "@/lib/teamRuntime";
import { listTeam } from "@/usecases/team";

import { InviteForm } from "./InviteForm";
import { MemberControls } from "./MemberControls";
import { ROLE_LABELS } from "./roles";

/**
 * 팀 목록과, 관리할 수 있는 사람에게만 서는 초대 폼.
 *
 * ⚠ **판정이 어차피 거절할 줄에는 고치는 단추가 없다.** 소유자 줄, 내 줄, 관리자가 보는 다른 관리자 줄이다.
 *    눌러 본 뒤에야 안 되는 것을 알게 하지 않는다. 단추를 세울지는 판정(`planRemoval`)에 그대로 묻는다. 역할 바꾸기와
 *    팀에서 빼기는 같은 거절을 지나므로 하나로 충분하다.
 * ⚠ **멤버 배지는 달지 않는다.** 기본 역할을 모든 줄에 적으면 같은 소음이 선다. 소유자와 관리자만 적는다.
 * ⚠ **초대만 받고 아직 로그인하지 않은 사람에게는 「초대됨」을 단다.** 이름이 없어 이메일만 서므로 들어온 사람과 가를 수 없다.
 */
export async function TeamList()
{
    const { actor, members, canManage } = await appRead((actor) =>
        Effect.flatMap(teamDirectoryLayer, (layer) => listTeam(actor).pipe(Effect.provide(layer))).pipe(
            Effect.map((team) => ({ actor, ...team })),
        ), paths.team());

    const items: ReadonlyArray<ListItem> = members.map((member) =>
    {
        const who = member.name ?? member.email;
        const fixed = !canManage || planRemoval(actor, member)._tag === "Refuse";

        return {
            id: member.membershipId,
            title: member.accountId === actor.accountId ? `${who} (나)` : who,
            ...(member.name === null ? {} : { description: member.email }),
            actions: (
                <div className="flex items-center gap-2">
                    {member.pending ? <Badge variant="secondary">초대됨</Badge> : null}
                    {!fixed
                        ? <MemberControls membershipId={member.membershipId} role={member.role} who={who} />
                        : member.role === "member" ? null : <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>}
                </div>
            ),
        };
    });

    return (
        <div className="flex flex-col gap-6">
            {canManage ? <InviteForm /> : null}
            <ItemList items={items} appearance="divided" />
        </div>
    );
}
