import type { AnnualSummary } from "@investment/schema";

import type { FinPeriodRow, GuideFinPeriod, MemberFinancials } from "../domain/rows.ts";

/**
 * 읽은 재무 기간을 접는 규칙.
 *
 * `fin_periods` 의 열쇠는 (회사, 기간, 연결/별도)라 한 기간에 연결(CFS)과 별도(OFS)가 둘 다 있을 수 있다.
 * 화면은 기간마다 한 줄을 그리므로 여기서 접는다.
 *
 * ⚠ **연결이 있으면 연결을 쓴다.** 개념마다 큰 값을 고르지 않는다. 그렇게 하면 연결과 별도가 한 줄에서 섞이고
 *    비율까지 그 섞인 값으로 다시 계산해야 한다. 재무제표 한 벌을 통째로 고른다.
 * ⚠ 적재된 연간 행 가운데 연결과 별도가 함께 있는 경우는 실측으로 없었다. 그것은 적재가 그렇게 생겼다는 사실일 뿐
 *    스키마가 보장하는 성질이 아니어서 규칙을 적어 둔다.
 */
const collapseBy = <T extends { fs_div: string }, K>(rows: ReadonlyArray<T>, keyOf: (row: T) => K): Map<K, T> =>
{
    const picked = new Map<K, T>();

    for (const row of rows)
    {
        const key = keyOf(row);
        const prev = picked.get(key);

        if (prev === undefined || (prev.fs_div !== "CFS" && row.fs_div === "CFS"))
        {
            picked.set(key, row);
        }
    }

    return picked;
};

/** 해마다 한 줄. 연도순 */
export const collapseByYear = <T extends { bsns_year: number; fs_div: string }>(rows: ReadonlyArray<T>): T[] =>
    [...collapseBy(rows, (row) => row.bsns_year).values()].sort((a, b) => a.bsns_year - b.bsns_year);

/** 기간 열쇠마다 한 줄. 분기는 같은 해에 넷이라 연도로 접으면 뭉개진다 */
export const collapseByPeriodKey = <T extends { period_key: string; fs_div: string }>(rows: ReadonlyArray<T>): T[] =>
    [...collapseBy(rows, (row) => row.period_key).values()].sort((a, b) => a.period_key.localeCompare(b.period_key));

const valueOf = (row: FinPeriodRow, column: string): number | null => row.values[column] ?? null;

/**
 * 연간 요약. 계약(`AnnualSummary`)의 열둘만 싣는다.
 *
 * ⚠ 넓은 표의 나머지 칸을 실으면 「뷰가 내보이던 표면」이라는 계약이 조용히 넓어진다.
 */
export const annualSummaryOf = (rows: ReadonlyArray<FinPeriodRow>): AnnualSummary[] =>
    collapseByYear(rows.filter((row) => row.period_type === "A")).map((row) => ({
        corp_code: row.corp_code,
        bsns_year: row.bsns_year,
        revenue: valueOf(row, "revenue"),
        operating_income: valueOf(row, "operating_income"),
        net_income: valueOf(row, "net_income"),
        assets: valueOf(row, "assets"),
        liabilities: valueOf(row, "liabilities"),
        equity: valueOf(row, "equity"),
        cf_operating: valueOf(row, "cf_operating"),
        opm_pct: valueOf(row, "opm_pct"),
        roe_pct: valueOf(row, "roe_pct"),
        debt_ratio_pct: valueOf(row, "debt_ratio_pct"),
    }));

const guidePeriodOf = (row: FinPeriodRow, concepts: ReadonlyArray<string>): GuideFinPeriod => ({
    year: row.bsns_year,
    periodType: row.period_type,
    periodKey: row.period_key,
    fsDiv: row.fs_div,
    values: Object.fromEntries(concepts.map((concept) => [concept, valueOf(row, concept)])),
});

/** 화면의 재무 격자. 연간과 분기를 가르고 고른 개념만 싣는다. TTM 은 싣지 않는다 */
export const guideGridOf = (
    rows: ReadonlyArray<FinPeriodRow>,
    concepts: ReadonlyArray<string>,
): { annual: GuideFinPeriod[]; quarters: GuideFinPeriod[] } => ({
    annual: collapseByYear(rows.filter((row) => row.period_type === "A")).map((row) => guidePeriodOf(row, concepts)),
    quarters: collapseByPeriodKey(rows.filter((row) => /^Q[1-4]$/.test(row.period_type)))
        .map((row) => guidePeriodOf(row, concepts)),
});

/** 개념 하나의 연간 시계열. 값이 있는 행만 남긴 뒤에 접는다 */
export const conceptSeriesOf = (
    rows: ReadonlyArray<FinPeriodRow>,
    concept: string,
): { bsns_year: number; amount: number | null }[] =>
    collapseByYear(rows.filter((row) => row.period_type === "A" && valueOf(row, concept) !== null))
        .map((row) => ({ bsns_year: row.bsns_year, amount: valueOf(row, concept) }));

/** 여러 회사의 연간 행을 회사마다 묶어 접는다 */
export const memberFinancialsOf = (rows: ReadonlyArray<FinPeriodRow>): Map<string, MemberFinancials[]> =>
{
    const grouped = new Map<string, FinPeriodRow[]>();

    for (const row of rows)
    {
        grouped.set(row.corp_code, [...(grouped.get(row.corp_code) ?? []), row]);
    }

    return new Map([...grouped].map(([corpCode, list]) => [
        corpCode,
        collapseByYear(list).map((row) => ({
            bsns_year: row.bsns_year,
            fs_div: row.fs_div,
            revenue: valueOf(row, "revenue"),
            opm_pct: valueOf(row, "opm_pct"),
            roe_pct: valueOf(row, "roe_pct"),
            debt_ratio_pct: valueOf(row, "debt_ratio_pct"),
        })),
    ]));
};
