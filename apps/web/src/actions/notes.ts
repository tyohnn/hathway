"use server";

import { revalidatePath } from "next/cache";
import { Effect, Layer } from "effect";

import { ProductEvents } from "@/extensions/ProductEvents";
import { appAction } from "@/lib/action";
import { extensionsLayer } from "@/lib/modules";
import { paths } from "@/lib/paths";
import { noteStoreLayer } from "@/lib/notesRuntime";
import { archiveNote, ArchiveNoteInput, createNote, CreateNoteInput } from "@/usecases/notes";

/**
 * 쪽지의 서버 액션 둘. **이 파일의 export 는 전부 관문(`appAction`)을 지난 것이다.**
 *
 * 액션은 관문 한 줄이고 본체는 `usecases/notes.ts` 다(`docs/개발-방법론.md` 「서버 액션 규약」).
 *
 *   ① Schema 파싱 · ② 인증        관문
 *   ③ 행 단위 판정 · ④ 도메인 규칙  유스케이스가 부르는 `packages/notes` 의 순수 함수
 *   ⑤ 저장                         저장소의 조건부 쓰기
 *   ⑥ 밖으로                       목록을 다시 그리게 하고, 한 일을 제품 분석에 알린다(`ProductEvents`).
 *                                  알림이 생기면 `after()` 로 여기서 띄운다
 */
export const createNoteAction = appAction({ input: CreateNoteInput }, ({ input, actor }) =>
    withNotes(createNote(actor, input).pipe(
        Effect.tap((result) => result.ok ? afterChange("note_created", { visibility: input.visibility }, actor) : Effect.void),
    )));

export const archiveNoteAction = appAction({ input: ArchiveNoteInput }, ({ input, actor }) =>
    withNotes(archiveNote(actor, input).pipe(
        Effect.tap((result) => result.ok ? afterChange("note_archived", {}, actor) : Effect.void),
    )));

/** ⑥ 목록을 다시 그리게 하고 한 일을 알린다 */
const afterChange = (event: string, properties: Readonly<Record<string, string>>, actor: Parameters<typeof createNote>[0]) =>
    Effect.andThen(
        Effect.sync(() => revalidatePath(paths.notes())),
        Effect.flatMap(ProductEvents, (events) => events.capture(actor, event, properties)),
    );

const withNotes = <A, E>(program: Effect.Effect<A, E, Layer.Success<Effect.Success<typeof noteStoreLayer>> | ProductEvents>) =>
    Effect.flatMap(Effect.all([noteStoreLayer, extensionsLayer]), ([notes, extensions]) => program.pipe(Effect.provide(Layer.mergeAll(notes, extensions))));
