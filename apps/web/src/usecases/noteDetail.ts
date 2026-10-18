import { Effect } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import type { MemberRow, TeamDirectory } from "@hathway/access/ports/TeamDirectory";
import type { Note } from "@hathway/notes/domain/Note";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";

import { CreditMeter } from "@/extensions/CreditMeter";

import { openNote } from "./notes";
import { listTeam } from "./team";

/**
 * 쪽지 상세가 그리는 것(`/ia-design` 의 대시보드 해부도 5번). 머리 · 본문 · 속성 기둥이고, 속성 기둥은 목록에서 거르던 것과 같은 이름을 쓴다.
 *
 * ⚠ **볼 수 있는지는 `openNote` 가 이미 정했다.** 여기서는 그 쪽지에 사람이 알아볼 이름과 단추에 필요한 값을 더할 뿐이다.
 * ⚠ `mine` 은 보관 메뉴를 세울지의 편의다. 판정은 액션이 `archiveVerdict` 로 다시 한다.
 */
export interface NoteDetail
{
    readonly note: Note;
    /** 속성 기둥의 「쓴 사람」 */
    readonly author: string;
    readonly mine: boolean;
    /** 요약 한 번에 쓸 수 있는 크레딧의 최대. 재지 않거나 보관한 쪽지면 `null` 이다 */
    readonly maxCredits: number | null;
}

/** 쓴 사람을 무엇으로 적는가. 계정 id 를 그대로 적지 않는다 */
export const authorLabel = (me: string, authorId: string, members: ReadonlyArray<MemberRow>): string =>
{
    if (authorId === me)
    {
        return "나";
    }

    const author = members.find((member) => member.accountId === authorId);

    return author === undefined ? "팀을 떠난 사람" : (author.name ?? author.email);
};

/** 볼 수 없거나 없는 쪽지면 `null` 이고 화면은 404 를 그린다(INV-NOTE-02) */
export const loadNoteDetail = (actor: Actor, noteId: string): Effect.Effect<NoteDetail | null, unknown, NoteStore | TeamDirectory | CreditMeter> =>
    Effect.gen(function*()
    {
        const note = yield* openNote(actor, noteId);

        if (note === null)
        {
            return null;
        }

        const { members } = yield* listTeam(actor);
        const maxCredits = note.status === "active"
            ? yield* Effect.flatMap(CreditMeter, (meter) => meter.quote(actor, "note_summary"))
            : null;

        return {
            note,
            author: authorLabel(actor.accountId, note.authorId, members),
            mine: note.authorId === actor.accountId && note.status === "active",
            maxCredits,
        };
    });
