import { Effect, Schema } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import type { Note, NoteVisibility } from "@hathway/notes/domain/Note";
import type { NotePage, NoteQuery } from "@hathway/notes/domain/NoteQuery";
import { NoteStore } from "@hathway/notes/ports/NoteStore";
import { archiveVerdict } from "@hathway/notes/rules/archive";
import { draftNote } from "@hathway/notes/rules/draft";

/**
 * 쪽지 화면과 액션의 조립. 서버 액션의 ③~⑤를 이 파일이 잇는다.
 *
 * ⚠ **`"use server"` 파일에 두지 않는다.** 그 파일의 export 는 전부 공개 엔드포인트가 되므로, 조립을 거기
 *    두고 테스트가 부를 수 있게 내보내는 순간 관문을 지나지 않는 엔드포인트가 하나 더 생긴다. 여기 두면
 *    메모리 저장소(`noteStoreMemory`)로 도커 없이 잰다(`notes.test.ts`).
 * ⚠ **판정은 도메인 패키지의 순수 함수가 한다.** 여기서 조건을 다시 적지 않는다(REQ-02).
 */

/** 액션이 화면에 돌려주는 결과. 오류 객체 대신 어휘로 답해 폼이 그 자리에 문구를 세운다 */
export type NoteActionResult =
    | { readonly ok: true; readonly noteId: string }
    | { readonly ok: false; readonly field?: "title" | "body"; readonly message: string };

export const CreateNoteInput = Schema.Struct({
    title: Schema.String,
    body: Schema.String,
    visibility: Schema.Literals(["private", "tenant"]),
});

export type CreateNoteInput = typeof CreateNoteInput.Type;

export const ArchiveNoteInput = Schema.Struct({
    noteId: Schema.NonEmptyString,
    version: Schema.Number,
});

export type ArchiveNoteInput = typeof ArchiveNoteInput.Type;

/** 목록. 볼 수 있는 것만 온다(INV-NOTE-02) */
export const listNotes = (actor: Actor): Effect.Effect<ReadonlyArray<Note>, unknown, NoteStore> =>
    Effect.flatMap(NoteStore, (store) => store.listVisible(actor));

/** 목록 한 쪽. 거르고 자르고 세는 일은 질의가 하고, 총수도 볼 수 있는 것만 센다(INV-NOTE-02) */
export const listNotePage = (actor: Actor, query: NoteQuery): Effect.Effect<NotePage, unknown, NoteStore> =>
    Effect.flatMap(NoteStore, (store) => store.listPage(actor, query));

/** 상세. 볼 수 없으면 `null` 이고 화면은 404 를 그린다 */
export const openNote = (actor: Actor, noteId: string): Effect.Effect<Note | null, unknown, NoteStore> =>
    Effect.flatMap(NoteStore, (store) => store.findVisible(actor, noteId));

/** 새 쪽지. 테넌트와 쓴 사람은 입력이 아니라 행위자에게서 온다 */
export const createNote = (
    actor: Actor,
    input: { readonly title: string; readonly body: string; readonly visibility: NoteVisibility },
): Effect.Effect<NoteActionResult, unknown, NoteStore> =>
    Effect.gen(function*()
    {
        // ④ 도메인 규칙
        const verdict = draftNote(actor, input);

        if (verdict._tag === "Rejected")
        {
            return { ok: false, field: verdict.field, message: verdict.message } as const;
        }

        // ⑤ 저장
        const note = yield* Effect.flatMap(NoteStore, (store) => store.create(verdict.note));

        return { ok: true, noteId: note.id } as const;
    });

const ARCHIVE_MESSAGES = {
    NotFound: "쪽지를 찾을 수 없어요.",
    NotAuthor: "쓴 사람만 보관할 수 있어요.",
    AlreadyArchived: "이미 보관한 쪽지예요.",
    Stale: "그사이 쪽지가 바뀌었어요. 새로고침한 뒤 다시 보관해 주세요.",
} as const;

/**
 * 보관. 판정(③ 행 단위 · ④ 상태 전이)을 지난 뒤 조건부 쓰기를 한다.
 *
 * ⚠ **판정과 쓰기가 둘 다 판을 본다.** 판정은 사람이 연 판과 지금의 판을 대조하고, 쓰기는 그 사이에
 *    끼어든 요청을 `where` 조건으로 한 번 더 거른다. 쓰기가 졌으면 판정의 `Stale` 과 같은 말로 답한다.
 */
export const archiveNote = (
    actor: Actor,
    input: ArchiveNoteInput,
): Effect.Effect<NoteActionResult, unknown, NoteStore> =>
    Effect.gen(function*()
    {
        const store = yield* NoteStore;
        const note = yield* store.findVisible(actor, input.noteId);
        const verdict = archiveVerdict(actor, note, input.version);

        if (verdict._tag !== "Allowed")
        {
            return { ok: false, message: ARCHIVE_MESSAGES[verdict._tag] } as const;
        }

        const outcome = yield* store.archive({ noteId: input.noteId, authorId: actor.accountId, expectedVersion: input.version });

        return outcome === "archived"
            ? { ok: true, noteId: input.noteId } as const
            : { ok: false, message: ARCHIVE_MESSAGES.Stale } as const;
    });
