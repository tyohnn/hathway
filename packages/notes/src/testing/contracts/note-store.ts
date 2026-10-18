import { assert, describe, it } from "@effect/vitest";
import { Effect, type Layer } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import { customerActor, operatorActor, otherCustomerActor } from "@hathway/access/testing/actor";

import type { NewNote, Note } from "../../domain/Note.ts";
import type { NoteQuery } from "../../domain/NoteQuery.ts";
import { NoteStore } from "../../ports/NoteStore.ts";
import { canSeeNote } from "../../rules/visibility.ts";

/**
 * 쪽지 저장소의 계약. 메모리 구현과 Postgres 구현이 **같은 코드로** 돈다.
 *
 * 가장 중요한 것은 첫 묶음이다. **질의가 돌려주는 집합이 도메인 술어가 고르는 집합과 같은가.** 둘이
 * 갈라지면 단위 검사는 전부 초록인데 화면에는 볼 수 없는 행이 나온다. 모든 요청이 같은 롤로 나가므로
 * 데이터베이스가 받아 줄 두 번째 방어선이 없다.
 *
 * ⚠ **목록 단언은 이 검사가 심은 것만 본다.** Postgres 는 여러 검사와 로컬 시드가 한 표를 함께 쓴다. 쪽으로 읽는 검사는
 *    제목에 그 검사만의 표식을 달고 그 표식으로 찾아서 다른 행을 떼어 낸다.
 * ⚠ **테넌트와 계정은 `supabase/seed.sql` 의 고정 id 다.** 운영팀 1, 고객사 둘이 2 와 3 이고, 계정 2 와 3 은
 *    고객사 2 의 사람, 4 는 고객사 3 의 사람이다. 쪽지의 FK 가 그 행을 가리킨다.
 */
export type MakeNoteStore = () => Effect.Effect<Layer.Layer<NoteStore>>;

const fresh = (): string => crypto.randomUUID().slice(0, 8);

const draft = (over: Partial<NewNote> = {}): NewNote => ({
    tenantId: "2",
    authorId: "2",
    title: `계약 ${fresh()}`,
    body: "",
    visibility: "tenant",
    ...over,
});

/** 이 질의의 모든 쪽을 차례로 읽는다. 쪽마다 총수가 같은지도 함께 본다 */
const readAll = (actor: Actor, q: string, pageSize: number) =>
    Effect.gen(function*()
    {
        const store = yield* NoteStore;
        const first = yield* store.listPage(actor, { q, page: 1, pageSize });
        const notes: Array<Note> = [...first.notes];

        for (let page = 2; (page - 1) * pageSize < first.total; page++)
        {
            const next = yield* store.listPage(actor, { q, page, pageSize });

            assert.strictEqual(next.total, first.total, `${page}쪽의 총수`);
            notes.push(...next.notes);
        }

        return { notes, total: first.total };
    });

const query = (q: string, over: Partial<NoteQuery> = {}): NoteQuery => ({ q, page: 1, pageSize: 20, ...over });

export const noteStoreContract = (name: string, make: MakeNoteStore): void =>
{
    const within = <A, E>(program: Effect.Effect<A, E, NoteStore>) =>
        Effect.gen(function*()
        {
            const layer = yield* make();

            return yield* program.pipe(Effect.provide(layer));
        });

    describe(`쪽지 저장소 (${name})`, () =>
    {
        it.effect("INV-NOTE-01 목록은 도메인 술어가 고르는 것과 같은 집합이다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const seeded = yield* Effect.all([
                    store.create(draft({ authorId: "2", visibility: "tenant" })),
                    store.create(draft({ authorId: "2", visibility: "private" })),
                    store.create(draft({ authorId: "3", visibility: "private" })),
                    store.create(draft({ tenantId: "3", authorId: "4", visibility: "tenant" })),
                ]);
                const ids = new Set(seeded.map((note) => note.id));
                const actors: ReadonlyArray<Actor> = [
                    customerActor("2"),
                    customerActor("3"),
                    otherCustomerActor("4"),
                    operatorActor("1"),
                ];

                for (const actor of actors)
                {
                    const listed = (yield* store.listVisible(actor)).filter((note) => ids.has(note.id));
                    const expected = seeded.filter((note) => canSeeNote(actor, note));

                    assert.deepStrictEqual(
                        listed.map((note) => note.id).slice().sort(),
                        expected.map((note) => note.id).slice().sort(),
                        `계정 ${actor.accountId} · 테넌트 ${actor.tenantId}`,
                    );
                }
            })));

        it.effect("INV-NOTE-01 쪽으로 나눠 읽어도 모은 집합이 도메인 술어가 고르는 것과 같다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const mark = `쪽 ${fresh()}`;
                const seeded = yield* Effect.forEach([
                    draft({ title: `${mark} 1`, authorId: "2", visibility: "tenant" }),
                    draft({ title: `${mark} 2`, authorId: "2", visibility: "private" }),
                    draft({ title: `${mark} 3`, authorId: "3", visibility: "private" }),
                    draft({ title: `${mark} 4`, authorId: "3", visibility: "tenant" }),
                    draft({ title: `${mark} 5`, authorId: "2", visibility: "tenant" }),
                    draft({ title: `${mark} 6`, tenantId: "3", authorId: "4", visibility: "tenant" }),
                ], (note) => store.create(note));

                for (const actor of [customerActor("2"), customerActor("3"), otherCustomerActor("4"), operatorActor("1")])
                {
                    const { notes } = yield* readAll(actor, mark, 2);
                    const expected = seeded.filter((note) => canSeeNote(actor, note));

                    assert.deepStrictEqual(
                        notes.map((note) => note.id).slice().sort(),
                        expected.map((note) => note.id).slice().sort(),
                        `계정 ${actor.accountId} · 테넌트 ${actor.tenantId}`,
                    );
                }
            })));

        it.effect("INV-NOTE-02 총수는 볼 수 있는 것만 센다. 남의 비공개 쪽지가 수로 새지 않는다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const mark = `수 ${fresh()}`;

                yield* Effect.forEach([
                    draft({ title: `${mark} 공개`, authorId: "3", visibility: "tenant" }),
                    draft({ title: `${mark} 비공개 1`, authorId: "3", visibility: "private" }),
                    draft({ title: `${mark} 비공개 2`, authorId: "3", visibility: "private" }),
                ], (note) => store.create(note));

                assert.strictEqual((yield* store.listPage(customerActor("2"), query(mark))).total, 1);
                assert.strictEqual((yield* store.listPage(customerActor("3"), query(mark))).total, 3);
                assert.strictEqual((yield* store.listPage(otherCustomerActor("4"), query(mark))).total, 0);
            })));

        it.effect("쪽은 최근에 쓴 것부터 겹치거나 빠짐 없이 이어진다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const mark = `차례 ${fresh()}`;
                // 차례가 곧 단언이라 하나씩 쓴다
                const seeded = yield* Effect.forEach([1, 2, 3, 4, 5], (index) => store.create(draft({ title: `${mark} ${index}` })));
                const { notes, total } = yield* readAll(customerActor("2"), mark, 2);

                assert.strictEqual(total, 5);
                assert.deepStrictEqual(notes.map((note) => note.id), seeded.map((note) => note.id).reverse());
            })));

        it.effect("찾기는 제목에서 대소문자를 가리지 않는다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const mark = `case-${fresh()}`;
                const created = yield* store.create(draft({ title: `Weekly ${mark}` }));
                const found = yield* store.listPage(customerActor("2"), query(`WEEKLY ${mark.toUpperCase()}`));

                assert.deepStrictEqual(found.notes.map((note) => note.id), [created.id]);
            })));

        it.effect("찾는 말의 % 와 _ 는 글자 그대로다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const mark = `기호 ${fresh()}`;
                const percent = yield* store.create(draft({ title: `${mark} 100%` }));
                yield* store.create(draft({ title: `${mark} 1000` }));
                const underscore = yield* store.create(draft({ title: `${mark} a_b` }));
                yield* store.create(draft({ title: `${mark} axb` }));

                const byPercent = yield* store.listPage(customerActor("2"), query(`${mark} 100%`));
                const byUnderscore = yield* store.listPage(customerActor("2"), query(`${mark} a_b`));
                const byBackslash = yield* store.listPage(customerActor("2"), query(`${mark} \\`));

                assert.deepStrictEqual(byPercent.notes.map((note) => note.id), [percent.id]);
                assert.deepStrictEqual(byUnderscore.notes.map((note) => note.id), [underscore.id]);
                assert.strictEqual(byBackslash.total, 0);
            })));

        it.effect("INV-NOTE-02 볼 수 없는 쪽지를 번호로 찾으면 없는 것으로 답한다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const secret = yield* store.create(draft({ authorId: "2", visibility: "private" }));

                assert.isNotNull(yield* store.findVisible(customerActor("2"), secret.id));
                assert.isNull(yield* store.findVisible(customerActor("3"), secret.id));
                assert.isNull(yield* store.findVisible(otherCustomerActor("4"), secret.id));
            })));

        it.effect("적은 쪽지는 판 1 의 활성으로 서고 제목과 본문이 그대로 돌아온다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const title = `왕복 ${fresh()} 🙂`;
                const created = yield* store.create(draft({ title, body: "첫 줄\n둘째 줄" }));
                const found = yield* store.findVisible(customerActor("2"), created.id);

                assert.strictEqual(created.status, "active");
                assert.strictEqual(created.version, 1);
                assert.strictEqual(typeof created.id, "string");
                assert.deepStrictEqual(found, created);
            })));

        it.effect("INV-NOTE-03 보관은 쓴 사람과 판이 맞을 때만 한 번 된다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const note = yield* store.create(draft());

                assert.strictEqual(yield* store.archive({ noteId: note.id, authorId: "3", expectedVersion: 1 }), "conflict");
                assert.strictEqual(yield* store.archive({ noteId: note.id, authorId: "2", expectedVersion: 7 }), "conflict");
                assert.strictEqual(yield* store.archive({ noteId: note.id, authorId: "2", expectedVersion: 1 }), "archived");
                assert.strictEqual(yield* store.archive({ noteId: note.id, authorId: "2", expectedVersion: 2 }), "conflict");

                const after = yield* store.findVisible(customerActor("2"), note.id);

                assert.strictEqual(after?.status, "archived");
                assert.strictEqual(after?.version, 2);
            })));

        it.effect("INV-NOTE-03 같은 판으로 두 번 동시에 보관해도 하나만 이긴다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* NoteStore;
                const note = yield* store.create(draft());
                const outcomes = yield* Effect.all(
                    [1, 2].map(() => store.archive({ noteId: note.id, authorId: "2", expectedVersion: 1 })),
                    { concurrency: "unbounded" },
                );

                assert.deepStrictEqual([...outcomes].slice().sort(), ["archived", "conflict"]);
            })));
    });
};
