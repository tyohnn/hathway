import { assert, describe, it } from "@effect/vitest";
import { Effect, type Layer } from "effect";

import type { NewBoard } from "../../domain/Board.ts";
import { BoardStore } from "../../ports/BoardStore.ts";

/**
 * 보드 저장소의 계약. 메모리 구현과 Postgres 구현이 **같은 코드로** 돈다.
 *
 * ⚠ **목록 단언은 이 검사가 심은 것만 본다.** Postgres 는 여러 검사와 로컬 시드가 한 표를 함께 쓴다.
 * ⚠ **테넌트와 계정은 로컬 시드(`platform/supabase/seeds/org.sql`)의 고정 id 다.** 운영팀 1, 고객사 둘이 2 와 3 이고,
 *    계정 2 와 3 은 고객사 2 의 사람이다. 보드의 FK 가 그 행을 가리킨다.
 */
export type MakeBoardStore = () => Effect.Effect<Layer.Layer<BoardStore>>;

const fresh = (): string => crypto.randomUUID().slice(0, 8);

const draft = (over: Partial<NewBoard> = {}): NewBoard => ({
    slug: `contract-${fresh()}`,
    tenantId: "2",
    createdBy: "2",
    theme: "stocks",
    title: `계약 ${fresh()}`,
    tagline: "",
    groups: [],
    ...over,
});

export const boardStoreContract = (name: string, make: MakeBoardStore): void =>
{
    const within = <A, E>(program: Effect.Effect<A, E, BoardStore>) =>
        Effect.gen(function*()
        {
            const layer = yield* make();

            return yield* program.pipe(Effect.provide(layer));
        });

    describe(`보드 저장소 (${name})`, () =>
    {
        it.effect("INV-RESEARCH-01 보드는 누구에게나 보인다. 목록과 찾기가 행위자를 받지 않는다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;
                const mine = yield* store.create(draft({ tenantId: "2" }));
                const theirs = yield* store.create(draft({ tenantId: "3", createdBy: "4" }));
                const listed = (yield* store.listByTheme("stocks")).map((board) => board.slug);

                assert.include(listed, mine.slug);
                assert.include(listed, theirs.slug);
                assert.strictEqual((yield* store.findBySlug(theirs.slug))?.tenantId, "3");
            })));

        it.effect("목록은 테마로 가른다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;
                const estate = yield* store.create(draft({ theme: "real-estate" }));
                const stocks = (yield* store.listByTheme("stocks")).map((board) => board.slug);
                const estates = (yield* store.listByTheme("real-estate")).map((board) => board.slug);

                assert.notInclude(stocks, estate.slug);
                assert.include(estates, estate.slug);
            })));

        it.effect("최근에 고친 보드가 목록의 앞에 온다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;
                const older = yield* store.create(draft());
                const newer = yield* store.create(draft());

                yield* store.save({
                    slug: older.slug,
                    tenantId: "2",
                    expectedVersion: 1,
                    change: { title: "다시 고침", tagline: "", groups: [] },
                });

                const order = (yield* store.listByTheme("stocks"))
                    .map((board) => board.slug)
                    .filter((slug) => slug === older.slug || slug === newer.slug);

                assert.deepStrictEqual(order, [older.slug, newer.slug]);
            })));

        it.effect("없는 slug 는 null 로 답한다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;

                assert.isNull(yield* store.findBySlug(`없음-${fresh()}`));
            })));

        it.effect("새 보드는 판 1 에서 시작하고 문서가 적은 그대로 돌아온다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;
                const groups = [{
                    id: "g1",
                    title: "그룹",
                    summary: "요약",
                    layout: { i: "g1", x: 0, y: 0, w: 6, h: 10, minW: 4 },
                    widgets: [{
                        id: "w1",
                        kind: "metric" as const,
                        title: "지표",
                        layout: { i: "w1", x: 0, y: 0, w: 4, h: 3 },
                        metric: { value: "31.7%", caption: "영업이익률" },
                    }],
                }];
                const created = yield* store.create(draft({ groups, relatedStockCode: "247540" }));
                const found = yield* store.findBySlug(created.slug);

                assert.strictEqual(created.version, 1);
                assert.deepStrictEqual(found?.groups, groups);
                assert.strictEqual(found?.relatedStockCode, "247540");
                assert.strictEqual(found?.createdBy, "2");
            })));

        it.effect("같은 slug 로 두 번 만들지 못한다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;
                const first = yield* store.create(draft());
                const second = yield* Effect.exit(store.create(draft({ slug: first.slug })));

                assert.strictEqual(second._tag, "Failure");
            })));

        it.effect("INV-RESEARCH-03 열었을 때의 판으로 저장하면 판이 하나 는다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;
                const created = yield* store.create(draft());
                const outcome = yield* store.save({
                    slug: created.slug,
                    tenantId: "2",
                    expectedVersion: 1,
                    change: { title: "고친 제목", tagline: "설명", groups: [] },
                });

                assert.strictEqual(outcome._tag, "saved");
                assert.deepStrictEqual(
                    outcome._tag === "saved" ? [outcome.board.version, outcome.board.title, outcome.board.tagline] : [],
                    [2, "고친 제목", "설명"],
                );
            })));

        it.effect("INV-RESEARCH-03 지난 판으로 저장하면 쓰지 않고 conflict 로 답한다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;
                const created = yield* store.create(draft());
                const change = { title: "고친 제목", tagline: "", groups: [] };

                yield* store.save({ slug: created.slug, tenantId: "2", expectedVersion: 1, change });

                const stale = yield* store.save({
                    slug: created.slug,
                    tenantId: "2",
                    expectedVersion: 1,
                    change: { ...change, title: "덮어쓰기" },
                });

                assert.strictEqual(stale._tag, "conflict");
                assert.strictEqual((yield* store.findBySlug(created.slug))?.title, "고친 제목");
            })));

        it.effect("INV-RESEARCH-02 다른 테넌트의 이름으로는 저장되지 않는다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;
                const created = yield* store.create(draft({ tenantId: "2" }));
                const outcome = yield* store.save({
                    slug: created.slug,
                    tenantId: "3",
                    expectedVersion: 1,
                    change: { title: "남의 보드", tagline: "", groups: [] },
                });

                assert.strictEqual(outcome._tag, "conflict");
                assert.strictEqual((yield* store.findBySlug(created.slug))?.title, created.title);
            })));

        it.effect("INV-RESEARCH-02 지우기는 그 테넌트의 보드만 지운다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* BoardStore;
                const created = yield* store.create(draft({ tenantId: "2" }));

                assert.strictEqual(yield* store.remove({ slug: created.slug, tenantId: "3" }), "missing");
                assert.isNotNull(yield* store.findBySlug(created.slug));
                assert.strictEqual(yield* store.remove({ slug: created.slug, tenantId: "2" }), "removed");
                assert.isNull(yield* store.findBySlug(created.slug));
            })));
    });
};
