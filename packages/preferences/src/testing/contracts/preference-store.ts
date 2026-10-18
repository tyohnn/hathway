import { assert, describe, it } from "@effect/vitest";
import { Effect, type Layer } from "effect";

import { customerActor, operatorActor } from "@hathway/access/testing/actor";

import { DEFAULT_PREFERENCES } from "../../domain/Preference.ts";
import { PreferenceStore } from "../../ports/PreferenceStore.ts";

/**
 * 설정 저장소의 계약. 메모리 구현과 Postgres 구현이 **같은 코드로** 돈다.
 *
 * ⚠ **계정과 테넌트는 `supabase/seed.sql` 의 고정 id 다.** 3 과 5 는 고객사 2 의 사람이고, 7 은 운영팀 1 과 고객사 2 에
 *    함께 속한 사람이다. 설정의 줄이 그 멤버십을 가리킨다.
 * ⚠ **검사마다 빈 자리에서 시작한다.** 메모리는 새로 만들고, Postgres 는 `make` 가 이 세 사람의 줄을 치운 뒤에 준다.
 *    설정은 사람마다 한 줄이라 검사가 새 행을 심어 격리할 수 없다.
 */
export type MakePreferenceStore = () => Effect.Effect<Layer.Layer<PreferenceStore>>;

/** 이 계약이 쓰는 사람들. Postgres 쪽이 이 줄들을 치운다 */
export const CONTRACT_MEMBERS = [
    { accountId: "3", tenantId: "2" },
    { accountId: "5", tenantId: "2" },
    { accountId: "7", tenantId: "1" },
    { accountId: "7", tenantId: "2" },
] as const;

export const preferenceStoreContract = (name: string, make: MakePreferenceStore): void =>
{
    const within = <A, E>(program: Effect.Effect<A, E, PreferenceStore>) =>
        Effect.gen(function*()
        {
            const layer = yield* make();

            return yield* program.pipe(Effect.provide(layer));
        });

    describe(`설정 저장소 (${name})`, () =>
    {
        it.effect("고른 적 없는 사람의 설정은 없는 것으로 답한다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* PreferenceStore;

                assert.isNull(yield* store.find(customerActor("5")));
            })));

        it.effect("처음 고칠 때 말하지 않은 칸은 기본값으로 선다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* PreferenceStore;
                const saved = yield* store.apply(customerActor("3"), { showArchived: true });

                assert.deepStrictEqual(saved, { ...DEFAULT_PREFERENCES, showArchived: true });
                assert.deepStrictEqual(yield* store.find(customerActor("3")), saved);
            })));

        it.effect("바뀐 칸만 고치고 나머지는 그대로 돌려준다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* PreferenceStore;

                yield* store.apply(customerActor("3"), { defaultVisibility: "private", showArchived: true });

                const saved = yield* store.apply(customerActor("3"), { showArchived: false });

                assert.deepStrictEqual(saved, { defaultVisibility: "private", showArchived: false });
            })));

        it.effect("INV-PREFERENCE-01 남의 설정은 읽히지 않는다. 같은 조직의 다른 사람도, 다른 조직으로 들어온 같은 사람도 따로다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* PreferenceStore;

                yield* store.apply(customerActor("3"), { defaultVisibility: "private" });
                yield* store.apply(customerActor("7"), { showArchived: true });

                assert.isNull(yield* store.find(customerActor("5")));
                assert.isNull(yield* store.find(operatorActor("7")));
                assert.deepStrictEqual(yield* store.find(customerActor("7")), { ...DEFAULT_PREFERENCES, showArchived: true });
                assert.deepStrictEqual(yield* store.find(customerActor("3")), { ...DEFAULT_PREFERENCES, defaultVisibility: "private" });
            })));

        it.effect("INV-PREFERENCE-03 서로 다른 칸을 동시에 고쳐도 한 줄에 둘 다 남는다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* PreferenceStore;

                yield* Effect.all([
                    store.apply(customerActor("3"), { defaultVisibility: "private" }),
                    store.apply(customerActor("3"), { showArchived: true }),
                ], { concurrency: "unbounded" });

                assert.deepStrictEqual(yield* store.find(customerActor("3")), { defaultVisibility: "private", showArchived: true });
            })));
    });
};
