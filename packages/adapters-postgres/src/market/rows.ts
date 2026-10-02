import { Effect } from "effect";

import { MarketStoreError } from "@investment/market/ports/MarketStore";

import type { SqlExecutor } from "../connection.ts";

/**
 * 시장 데이터 어댑터 셋이 함께 쓰는 조각.
 *
 * ⚠ **계약을 어긴 행은 버리지 않고 건너뛰며 기록한다.** 행 하나가 스키마에 맞지 않는다고 화면 전체가 죽지 않는다.
 *    옮기기 전의 조회가 그렇게 했고 그대로 지킨다.
 */
interface RowSchema<T>
{
    readonly safeParse: (row: unknown) => { success: true; data: T } | { success: false; error: unknown };
}

export const parseAll = <T>(schema: RowSchema<T>, rows: ReadonlyArray<unknown>, label: string): T[] =>
{
    const out: T[] = [];

    for (const row of rows)
    {
        const parsed = schema.safeParse(row);

        if (parsed.success)
        {
            out.push(parsed.data);
        }
        else
        {
            Effect.runFork(Effect.logWarning(`${label} 행이 계약과 다르다`, { module: "market", error: String(parsed.error) }));
        }
    }

    return out;
};

/** `pg` 는 bigint 를 문자열로 돌려준다. 이 표들의 id 는 화면의 열쇠로만 쓰이는 작은 수라 수로 바꾼다 */
export const withNumericId = <R extends { id: string }>(row: R): Omit<R, "id"> & { id: number } =>
    ({ ...row, id: Number(row.id) });

export const read = <R extends Record<string, unknown>>(
    sql: SqlExecutor,
    operation: string,
    statement: string,
    params: ReadonlyArray<unknown> = [],
): Effect.Effect<ReadonlyArray<R>, MarketStoreError> =>
    Effect.tryPromise({
        try: () => sql.query<R>(statement, params),
        catch: (cause) => new MarketStoreError({ message: `${operation} 실패: ${String(cause)}` }),
    }).pipe(Effect.map((result) => result.rows));
