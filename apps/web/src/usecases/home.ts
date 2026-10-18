import { Effect } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import type { MemberRow, TeamDirectory } from "@hathway/access/ports/TeamDirectory";
import type { Note } from "@hathway/notes/domain/Note";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";

import { listNotes } from "./notes";
import { listTeam } from "./team";

/**
 * 홈이 보이는 것(`/ia-design` 의 대시보드 해부도 3번). 위에서부터 루프 진입점 → 처리할 것 → 최근이다. 루프 진입점은 누가 열어도 같아
 * 화면이 굽고, 여기서는 사람마다 다른 두 칸을 정한다.
 *
 * ⚠ **판정을 여기서 다시 하지 않는다.** 무엇을 볼 수 있는지는 이미 판정을 지난 목록(`listNotes` · `listTeam`)이 정했다. 이 함수는 그 목록을
 *    홈의 칸으로 나눌 뿐이다.
 * ⚠ **지어낸 할 일을 세우지 않는다.** 처리할 것은 실제로 사람을 기다리는 일만이다. 없으면 비어 있고, 화면은 「처리할 것이 없어요」라고 적는다.
 */
export const RECENT_LIMIT = 5;

/** 처리할 것 한 줄. 객체가 늘면 갈래가 는다 */
export type HomeTodo = { readonly kind: "pending-invites"; readonly count: number };

/** 시작 점검표 한 줄. 첫날의 홈에서 최근 자리에 선다 */
export interface ChecklistItem
{
    readonly kind: "first-note" | "invite" | "connect";
    /** 끝났는가. 연결처럼 이 앱이 알 수 없는 일은 `null` 이고 화면은 「선택」으로 적는다 */
    readonly done: boolean | null;
}

export interface HomePlan
{
    readonly todos: ReadonlyArray<HomeTodo>;
    /** 이어 할 쪽지. 하나도 없으면 `null` 이고 그 자리에 점검표가 선다 */
    readonly recent: ReadonlyArray<Note> | null;
    readonly checklist: ReadonlyArray<ChecklistItem> | null;
}

export interface HomeInput
{
    /** 지금 들어온 사람의 계정 id */
    readonly me: string;
    /** 이 사람이 볼 수 있는 쪽지(판정을 지난 것) */
    readonly notes: ReadonlyArray<Note>;
    /** 지금 들어온 조직의 사람들 */
    readonly members: ReadonlyArray<MemberRow>;
    /** 팀을 관리할 수 있는가. 초대 단추가 이 사람에게 서는가와 같은 답이다 */
    readonly canManage: boolean;
}

export const planHome = ({ me, notes, members, canManage }: HomeInput): HomePlan =>
{
    const pending = members.filter((member) => member.pending).length;
    const todos: ReadonlyArray<HomeTodo> = canManage && pending > 0 ? [{ kind: "pending-invites", count: pending }] : [];

    // 보관한 것은 끝낸 일이라 이어 할 것이 아니다. 새것부터 몇 개만 보인다. 나머지는 목록 화면의 몫이다
    // `filter` 가 새 배열을 내므로 그 자리에서 줄 세워도 받은 목록은 그대로다
    const active = notes
        .filter((note) => note.status !== "archived")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, RECENT_LIMIT);

    if (active.length > 0)
    {
        return { todos, recent: active, checklist: null };
    }

    const checklist: ReadonlyArray<ChecklistItem> = [
        { kind: "first-note", done: notes.some((note) => note.authorId === me) },
        ...(canManage ? [{ kind: "invite" as const, done: members.some((member) => member.accountId !== me) }] : []),
        { kind: "connect", done: null },
    ];

    return { todos, recent: null, checklist };
};

/** 홈의 조회. 쪽지와 팀을 함께 읽어 `planHome` 에 넘긴다 */
export const loadHome = (actor: Actor): Effect.Effect<HomePlan, unknown, NoteStore | TeamDirectory> =>
    Effect.map(
        Effect.all({ notes: listNotes(actor), team: listTeam(actor) }),
        ({ notes, team }) => planHome({ me: actor.accountId, notes, members: team.members, canManage: team.canManage }),
    );
