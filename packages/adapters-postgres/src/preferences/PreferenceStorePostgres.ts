// ⚠ 이 import 가 게이트다. DB 자격증명을 다루는 모듈은 클라이언트 번들로 새면 빌드가 깨져야 한다.
import "server-only";

import { Effect, Layer } from "effect";

import { DEFAULT_PREFERENCES, type Preferences } from "@hathway/preferences/domain/Preference";
import { PreferenceStore, PreferenceStoreError } from "@hathway/preferences/ports/PreferenceStore";

import type { SqlExecutor } from "../connection.ts";

/**
 * `PreferenceStore` 의 Postgres 구현. `preferences.member_preference` 를 읽고 쓴다.
 *
 * ⚠ **줄은 행위자의 계정과 테넌트로만 찾는다**(INV-PREFERENCE-01). 질의마다 `$1` 이 계정이고 `$2` 가 테넌트다.
 * ⚠ **쓰기는 한 문장이다.** 처음이면 넣고 있으면 고친다(INV-PREFERENCE-03). 말하지 않은 칸은 `null` 로 넘기고
 *    `coalesce` 가 지금 값을 남긴다. 미리 `select` 로 읽고 쓰면 그 틈에 다른 칸을 고친 요청을 덮는다.
 * ⚠ **기본값은 도메인이 준다.** 표의 칸에는 기본값이 없고, 처음 넣을 때 `$5` · `$6` 으로 넘긴다.
 * ⚠ **값은 전부 `$n` 파라미터다.** 템플릿의 `${}` 에는 모듈 상수 조각만 넣는다.
 */
type PreferenceRow =
{
    default_visibility: "private" | "tenant";
    show_archived: boolean;
};

const COLUMNS = "default_visibility, show_archived";

const FIND = `
    select ${COLUMNS}
      from preferences.member_preference
     where account_id = $1::bigint
       and tenant_id = $2::bigint
`;

const APPLY = `
    insert into preferences.member_preference as current (account_id, tenant_id, default_visibility, show_archived)
    values ($1::bigint, $2::bigint, coalesce($3::text, $5::text), coalesce($4::boolean, $6::boolean))
    on conflict (account_id, tenant_id) do update
       set default_visibility = coalesce($3::text, current.default_visibility),
           show_archived = coalesce($4::boolean, current.show_archived),
           updated_at = now()
    returning ${COLUMNS}
`;

const preferencesOf = (row: PreferenceRow): Preferences => ({
    defaultVisibility: row.default_visibility,
    showArchived: row.show_archived,
});

const failure = (operation: string) =>
    (cause: unknown): PreferenceStoreError => new PreferenceStoreError({ message: `설정 ${operation} 실패: ${String(cause)}` });

export const preferenceStorePostgresLayer = (sql: SqlExecutor): Layer.Layer<PreferenceStore> =>
    Layer.succeed(PreferenceStore, PreferenceStore.of({
        find: (actor) =>
            Effect.tryPromise({
                try: () => sql.query<PreferenceRow>(FIND, [actor.accountId, actor.tenantId]),
                catch: failure("찾기"),
            }).pipe(Effect.map((result) =>
            {
                const row = result.rows[0];

                return row === undefined ? null : preferencesOf(row);
            })),

        apply: (actor, changes) =>
            Effect.tryPromise({
                try: () => sql.query<PreferenceRow>(APPLY, [
                    actor.accountId,
                    actor.tenantId,
                    changes.defaultVisibility ?? null,
                    changes.showArchived ?? null,
                    DEFAULT_PREFERENCES.defaultVisibility,
                    DEFAULT_PREFERENCES.showArchived,
                ]),
                catch: failure("쓰기"),
            }).pipe(Effect.flatMap((result) =>
            {
                const row = result.rows[0];

                return row === undefined
                    ? Effect.fail(new PreferenceStoreError({ message: "설정 쓰기가 행을 돌려주지 않았다" }))
                    : Effect.succeed(preferencesOf(row));
            })),
    }));
