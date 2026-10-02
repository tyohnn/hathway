import { describe, expect, it } from "vitest";

import type { FinPeriodRow } from "../domain/rows.ts";
import {
    annualSummaryOf,
    collapseByPeriodKey,
    collapseByYear,
    conceptSeriesOf,
    guideGridOf,
    memberFinancialsOf,
} from "./periods.ts";

const row = (over: Partial<FinPeriodRow> & { values?: Record<string, number | null> } = {}): FinPeriodRow => ({
    corp_code: "C1",
    period_key: "2024A",
    fs_div: "CFS",
    bsns_year: 2024,
    period_type: "A",
    values: {},
    ...over,
});

describe("연결과 별도가 함께 있을 때", () =>
{
    it("연결이 있으면 연결을 쓴다. 재무제표 한 벌을 통째로 고른다", () =>
    {
        const rows = [
            row({ fs_div: "OFS", values: { revenue: 10 } }),
            row({ fs_div: "CFS", values: { revenue: 30 } }),
        ];

        expect(collapseByYear(rows).map((r) => [r.fs_div, r.values.revenue])).toEqual([["CFS", 30]]);
    });

    it("연결이 없는 회사는 별도로 읽는다. 종속회사가 없으면 연결이 아예 없다", () =>
    {
        expect(collapseByYear([row({ fs_div: "OFS", values: { revenue: 10 } })]).map((r) => r.fs_div)).toEqual(["OFS"]);
    });

    it("연결이 먼저 와도 뒤의 별도가 덮지 않는다", () =>
    {
        const rows = [row({ fs_div: "CFS" }), row({ fs_div: "OFS" })];

        expect(collapseByYear(rows).map((r) => r.fs_div)).toEqual(["CFS"]);
    });

    it("해마다 한 줄로 접고 연도순으로 돌려준다", () =>
    {
        const rows = [
            row({ bsns_year: 2025, period_key: "2025A" }),
            row({ bsns_year: 2023, period_key: "2023A" }),
            row({ bsns_year: 2025, period_key: "2025A", fs_div: "OFS" }),
        ];

        expect(collapseByYear(rows).map((r) => r.bsns_year)).toEqual([2023, 2025]);
    });

    it("분기는 period_key 마다 한 줄로 접는다. 같은 해의 분기 넷이 한 줄로 뭉개지지 않는다", () =>
    {
        const rows = [
            row({ period_key: "2024Q2", period_type: "Q2" }),
            row({ period_key: "2024Q1", period_type: "Q1", fs_div: "OFS" }),
            row({ period_key: "2024Q1", period_type: "Q1" }),
        ];

        expect(collapseByPeriodKey(rows).map((r) => [r.period_key, r.fs_div])).toEqual([["2024Q1", "CFS"], ["2024Q2", "CFS"]]);
    });
});

describe("읽은 기간을 화면의 모양으로 접는다", () =>
{
    it("연간 요약은 계약의 열둘만 싣는다. 넓은 표의 나머지 칸이 따라오지 않는다", () =>
    {
        const [summary] = annualSummaryOf([row({ values: { revenue: 100, ebitda: 7, opm_pct: 12.5 } })]);

        expect(summary).toEqual({
            corp_code: "C1", bsns_year: 2024, revenue: 100, operating_income: null, net_income: null, assets: null,
            liabilities: null, equity: null, cf_operating: null, opm_pct: 12.5, roe_pct: null, debt_ratio_pct: null,
        });
    });

    it("연간 요약은 연간 행만 본다. 분기와 TTM 이 섞여 와도 싣지 않는다", () =>
    {
        const rows = [row(), row({ period_key: "2024Q1", period_type: "Q1" }), row({ period_key: "2024TTM", period_type: "TTM" })];

        expect(annualSummaryOf(rows)).toHaveLength(1);
    });

    it("재무 격자는 연간과 분기를 가르고, 고른 개념만 싣는다", () =>
    {
        const grid = guideGridOf(
            [
                row({ values: { revenue: 100, cogs: 40 } }),
                row({ period_key: "2024Q1", period_type: "Q1", values: { revenue: 20 } }),
            ],
            ["revenue"],
        );

        expect(grid.annual).toEqual([{ year: 2024, periodType: "A", periodKey: "2024A", fsDiv: "CFS", values: { revenue: 100 } }]);
        expect(grid.quarters.map((p) => [p.periodKey, p.values])).toEqual([["2024Q1", { revenue: 20 }]]);
    });

    it("값이 없는 개념은 null 로 싣는다. 0 으로 그리면 급락으로 읽힌다", () =>
    {
        const grid = guideGridOf([row({ values: {} })], ["revenue"]);

        expect(grid.annual[0]?.values).toEqual({ revenue: null });
    });

    it("개념 하나의 시계열은 값이 있는 해만 싣는다. 그 뒤에 연결과 별도를 접는다", () =>
    {
        const rows = [
            row({ bsns_year: 2023, period_key: "2023A", values: { cf_investing: null } }),
            row({ bsns_year: 2024, fs_div: "CFS", values: { cf_investing: null } }),
            row({ bsns_year: 2024, fs_div: "OFS", values: { cf_investing: -5 } }),
        ];

        expect(conceptSeriesOf(rows, "cf_investing")).toEqual([{ bsns_year: 2024, amount: -5 }]);
    });

    it("여러 회사의 연간 행은 회사마다 묶어 접는다", () =>
    {
        const rows = [
            row({ corp_code: "A", values: { revenue: 1, opm_pct: 2, roe_pct: 3, debt_ratio_pct: 4 } }),
            row({ corp_code: "B", fs_div: "OFS", values: { revenue: 9 } }),
            row({ corp_code: "A", fs_div: "OFS", values: { revenue: 0 } }),
        ];
        const byCorp = memberFinancialsOf(rows);

        expect(byCorp.get("A")).toEqual([{ bsns_year: 2024, fs_div: "CFS", revenue: 1, opm_pct: 2, roe_pct: 3, debt_ratio_pct: 4 }]);
        expect(byCorp.get("B")).toEqual([{ bsns_year: 2024, fs_div: "OFS", revenue: 9, opm_pct: null, roe_pct: null, debt_ratio_pct: null }]);
    });
});
