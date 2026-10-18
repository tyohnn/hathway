import type { Actor } from "@hathway/access/domain/Actor";

import type { Note } from "../domain/Note.ts";
import { canSeeNote } from "./visibility.ts";

/**
 * 이 사람이 이 쪽지를 지금 보관할 수 있는가(INV-NOTE-03). 상태 전이의 판정이다.
 *
 * ⚠ **보이는 것과 고칠 수 있는 것은 다른 물음이다.** 같은 테넌트의 공개 쪽지는 모두에게 보이지만
 *    보관은 쓴 사람만 한다. 그래서 먼저 `canSeeNote` 를 지나고, 그다음에 쓴 사람인지를 본다.
 * ⚠ **볼 수 없는 쪽지는 `NotFound` 다.** 「쓴 사람이 아니다」로 답하면 그 쪽지가 있다는 사실이
 *    새어 나간다(INV-NOTE-02).
 * ⚠ **판을 대조한다.** 사람이 연 뒤에 쪽지가 바뀌었으면 덮어쓰지 않는다. 저장소의 쓰기도 같은 판을
 *    조건으로 걸어 판정과 쓰기 사이의 틈을 닫는다(`NoteStore.archive`).
 */
export type ArchiveVerdict =
    | { readonly _tag: "Allowed" }
    | { readonly _tag: "NotFound" }
    | { readonly _tag: "NotAuthor" }
    | { readonly _tag: "AlreadyArchived" }
    | { readonly _tag: "Stale"; readonly current: number };

export const archiveVerdict = (actor: Actor, note: Note | null, openedVersion: number): ArchiveVerdict =>
{
    if (note === null || !canSeeNote(actor, note))
    {
        return { _tag: "NotFound" };
    }

    if (note.authorId !== actor.accountId)
    {
        return { _tag: "NotAuthor" };
    }

    if (note.status === "archived")
    {
        return { _tag: "AlreadyArchived" };
    }

    if (note.version !== openedVersion)
    {
        return { _tag: "Stale", current: note.version };
    }

    return { _tag: "Allowed" };
};
