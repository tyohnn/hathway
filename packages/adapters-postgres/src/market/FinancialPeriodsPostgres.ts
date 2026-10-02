import "server-only";

import { Effect, Layer } from "effect";

import { FIN_PERIOD_COLUMNS, type FinPeriodRow } from "@investment/market/domain/rows";
import { FinancialPeriods } from "@investment/market/ports/MarketStore";

import type { SqlExecutor } from "../connection.ts";

import { read } from "./rows.ts";

/**
 * 재무 기간의 Postgres 구현. `public.fin_periods` 를 web_app 으로 읽는다.
 *
 * ⚠ **읽기만 하고 접지 않는다.** 연결과 별도를 한 줄로 접는 것은 규칙(`@investment/market/rules/periods`)의 몫이다.
 *    여기서 접으면 그 판단이 SQL 과 코드 두 곳에 생긴다.
 * ⚠ **숫자를 수로 바꾼다.** `pg` 는 numeric 을 문자열로 돌려준다. 비었거나 수가 아니면 `null` 이다.
 * ⚠ 열 목록은 모듈 상수(`FIN_PERIOD_COLUMNS`)다. 화면이 고른 개념 이름을 SQL 에 넣지 않는다.
 */
const COLUMNS = `corp_code, period_key, fs_div, bsns_year, period_type, ${FIN_PERIOD_COLUMNS.join(", ")}`;

const PERIODS_OF = `
    select ${COLUMNS}
      from public.fin_periods
     where corp_code = $1
       and period_type = any($2::text[])
     order by period_key, fs_div
`;

const ANNUAL_OF_MANY = `
    select ${COLUMNS}
      from public.fin_periods
     where corp_code = any($1::text[])
       and bsns_year = any($2::int[])
       and period_type = 'A'
     order by corp_code, period_key, fs_div
`;

type PeriodRow = Record<string, unknown> & {
    corp_code: string;
    period_key: string;
    fs_div: string;
    bsns_year: number;
    period_type: string;
};

const numberOf = (raw: unknown): number | null =>
{
    if (raw === null || raw === undefined || raw === "")
    {
        return null;
    }

    const value = Number(raw);

    return Number.isFinite(value) ? value : null;
};

const periodOf = (row: PeriodRow): FinPeriodRow => ({
    corp_code: row.corp_code,
    period_key: row.period_key,
    fs_div: row.fs_div,
    bsns_year: row.bsns_year,
    period_type: row.period_type,
    values: Object.fromEntries(FIN_PERIOD_COLUMNS.map((column) => [column, numberOf(row[column])])),
});

export const financialPeriodsPostgresLayer = (sql: SqlExecutor): Layer.Layer<FinancialPeriods> =>
    Layer.succeed(FinancialPeriods, FinancialPeriods.of({
        periodsOf: (corpCode, types) =>
            read<PeriodRow>(sql, "재무 기간", PERIODS_OF, [corpCode, [...types]]).pipe(
                Effect.map((rows) => rows.map(periodOf)),
            ),

        annualOfMany: (corpCodes, years) =>
            (corpCodes.length === 0 || years.length === 0
                ? Effect.succeed([])
                : read<PeriodRow>(sql, "여러 회사의 연간 기간", ANNUAL_OF_MANY, [[...corpCodes], [...years]]).pipe(
                    Effect.map((rows) => rows.map(periodOf)),
                )),
    }));
