import { Context, type Effect, Schema } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";

import type { PreferenceChanges, Preferences } from "../domain/Preference.ts";

/**
 * 설정을 읽고 쓰는 포트. 구현은 메모리(`testing/preferenceStoreMemory.ts`)와 Postgres
 * (`@hathway/adapters-postgres/preferences/PreferenceStorePostgres`) 둘이고, 계약 테스트 한 벌이 둘을 함께 잰다.
 *
 * ⚠ **누구의 설정인지는 행위자가 정한다**(INV-PREFERENCE-01). 메서드에 계정이나 테넌트를 받는 인자가 없어서
 *    남의 설정을 가리킬 길이 없다. 인자로 받으면 도구를 부르는 모델이 그 값을 지어낸다.
 * ⚠ **쓰기는 바뀐 칸만 받는다.** 통째로 받으면 두 요청이 서로 다른 칸을 고칠 때 뒤의 것이 앞의 것을 덮는다.
 */
export class PreferenceStoreError extends Schema.TaggedError<PreferenceStoreError>()(
    "PreferenceStoreError",
    { message: Schema.String },
)
{}

export class PreferenceStore extends Context.Service<PreferenceStore, {
    /** 이 사람이 이 조직에서 고른 설정. 고른 적이 없으면 `null` 이다 */
    readonly find: (actor: Actor) => Effect.Effect<Preferences | null, PreferenceStoreError>;
    /** 판정을 지난 변경을 적고 고친 뒤의 설정을 돌려준다. 처음이면 말하지 않은 칸은 기본값으로 선다 */
    readonly apply: (actor: Actor, changes: PreferenceChanges) => Effect.Effect<Preferences, PreferenceStoreError>;
}>()("@hathway/preferences/ports/PreferenceStore")
{}
