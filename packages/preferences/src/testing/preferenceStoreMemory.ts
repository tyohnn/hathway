import { Effect, Layer, Ref } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";

import { DEFAULT_PREFERENCES, type Preferences } from "../domain/Preference.ts";
import { PreferenceStore } from "../ports/PreferenceStore.ts";

/**
 * 설정 저장소의 메모리 구현. 계약이 도커 없이 도는 자리이고, 앱의 유스케이스 검사가 이것을 쓴다.
 *
 * ⚠ **줄의 열쇠는 테넌트와 계정이다.** 한 사람이 두 조직에 속하면 설정도 둘이다(INV-PREFERENCE-01).
 */
const keyOf = (actor: Actor): string => `${actor.tenantId}:${actor.accountId}`;

export const preferenceStoreMemory = (): Effect.Effect<Layer.Layer<PreferenceStore>> =>
    Effect.gen(function*()
    {
        const rows = yield* Ref.make<ReadonlyMap<string, Preferences>>(new Map());

        return Layer.succeed(PreferenceStore, PreferenceStore.of({
            find: (actor) => Ref.get(rows).pipe(Effect.map((all) => all.get(keyOf(actor)) ?? null)),

            apply: (actor, changes) =>
                Ref.modify(rows, (all): [Preferences, ReadonlyMap<string, Preferences>] =>
                {
                    const next = { ...(all.get(keyOf(actor)) ?? DEFAULT_PREFERENCES), ...changes };

                    return [next, new Map([...all, [keyOf(actor), next]])];
                }),
        }));
    });
