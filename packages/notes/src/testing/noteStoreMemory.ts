import { Effect, Layer, Ref } from "effect";

import type { Note } from "../domain/Note.ts";
import { canSeeNote } from "../rules/visibility.ts";
import { NoteStore, type ArchiveOutcome } from "../ports/NoteStore.ts";

/**
 * 쪽지 저장소의 메모리 구현. 계약이 도커 없이 도는 자리이고, 앱의 유스케이스 검사가 이것을 쓴다.
 *
 * ⚠ **읽기가 술어를 그대로 부른다.** Postgres 구현은 같은 조건을 SQL 로 적는다. 둘이 갈라지는지를
 *    계약 테스트가 잰다.
 * ⚠ **시각은 받은 시계에서 읽는다.** 검사가 결정적이어야 하므로 `Date.now()` 를 부르지 않는다.
 */
export const noteStoreMemory = (
    seed: ReadonlyArray<Note> = [],
    clock: () => string = () => "2026-09-29T00:00:00.000Z",
): Effect.Effect<Layer.Layer<NoteStore>> =>
    Effect.gen(function*()
    {
        const notes = yield* Ref.make<ReadonlyArray<Note>>(seed);
        const nextId = yield* Ref.make(seed.reduce((max, note) => Math.max(max, Number(note.id)), 0) + 1);

        return Layer.succeed(NoteStore, NoteStore.of({
            listVisible: (actor) =>
                Ref.get(notes).pipe(Effect.map((rows) =>
                    rows.filter((note) => canSeeNote(actor, note))
                        .slice().sort((left, right) => Number(right.id) - Number(left.id)))),

            listPage: (actor, { q, page, pageSize }) =>
                Ref.get(notes).pipe(Effect.map((rows) =>
                {
                    const needle = q.toLowerCase();
                    const matched = rows
                        .filter((note) => canSeeNote(actor, note) && note.title.toLowerCase().includes(needle))
                        .sort((left, right) => Number(right.id) - Number(left.id));

                    return { notes: matched.slice((page - 1) * pageSize, page * pageSize), total: matched.length };
                })),

            findVisible: (actor, noteId) =>
                Ref.get(notes).pipe(Effect.map((rows) =>
                {
                    const found = rows.find((note) => note.id === noteId);

                    return found !== undefined && canSeeNote(actor, found) ? found : null;
                })),

            create: (draft) =>
                Effect.gen(function*()
                {
                    const id = yield* Ref.getAndUpdate(nextId, (value) => value + 1);
                    const note: Note = { ...draft, id: String(id), status: "active", version: 1, createdAt: clock() };

                    yield* Ref.update(notes, (rows) => [...rows, note]);

                    return note;
                }),

            archive: ({ noteId, authorId, expectedVersion }) =>
                Ref.modify(notes, (rows): [ArchiveOutcome, ReadonlyArray<Note>] =>
                {
                    const target = rows.find((note) => note.id === noteId);

                    if (target === undefined || target.authorId !== authorId || target.status !== "active"
                        || target.version !== expectedVersion)
                    {
                        return ["conflict", rows];
                    }

                    return [
                        "archived",
                        rows.map((note) => (note === target
                            ? { ...note, status: "archived" as const, version: note.version + 1 }
                            : note)),
                    ];
                }),
        }));
    });
