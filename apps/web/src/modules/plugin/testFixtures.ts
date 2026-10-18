import type { FinPeriodRow } from "@hathway/market/domain/rows";
import type { Board } from "@hathway/research/domain/Board";
import type { Company, Filing } from "@hathway/schema";

/**
 * 플러그인의 검사가 함께 쓰는 합성 데이터. 숫자는 지어낸 것이고 실제 회사의 것이 아니다.
 */
export const company = (corp_code: string, stock_code: string, name: string, sector_code: string, market: Company["market"] = "KOSPI"): Company => ({
    corp_code, name, stock_code, market, sector_code, fiscal_month: 12, ceo: null, established: null,
});

export const KRAFTON = company("00760971", "259960", "크래프톤", "5821");
export const NETMARBLE = company("00100001", "251270", "넷마블", "5821");
export const PEARL = company("00100002", "263750", "펄어비스", "58211", "KOSDAQ");
export const ECOPRO_BM = company("01160363", "247540", "에코프로비엠", "28202", "KOSDAQ");

export const period = (
    corp_code: string,
    bsns_year: number,
    period_type: string,
    values: Readonly<Record<string, number | null>>,
    fs_div = "CFS",
): FinPeriodRow => ({
    corp_code,
    bsns_year,
    period_type,
    fs_div,
    period_key: `${bsns_year}${period_type === "A" ? "A" : period_type === "TTM" ? "TTM" : period_type}`,
    values,
});

/** 크래프톤의 합성 재무. 해마다 매출이 1천억씩 는다 */
export const KRAFTON_ROWS: ReadonlyArray<FinPeriodRow> = [
    ...[2020, 2021, 2022, 2023, 2024, 2025].map((year) => period(KRAFTON.corp_code, year, "A", {
        revenue: (year - 2010) * 1e11,
        operating_income: (year - 2010) * 4e10,
        net_income: (year - 2010) * 3e10,
        opm_pct: 40,
        roe_pct: 15 + (year - 2020),
        debt_ratio_pct: 30,
        cf_operating: (year - 2010) * 5e10,
    })),
    period(KRAFTON.corp_code, 2024, "TTM", { revenue: 1.4e12, opm_pct: 39, roe_pct: 19 }),
    period(KRAFTON.corp_code, 2025, "TTM", { revenue: 1.54e12, opm_pct: 41.5, roe_pct: 20 }),
    period(KRAFTON.corp_code, 2025, "Q1", { revenue: 4e11, operating_income: 1.6e11 }),
    period(KRAFTON.corp_code, 2025, "Q2", { revenue: 3.5e11, operating_income: 1.3e11 }),
];

export const PEER_ROWS: ReadonlyArray<FinPeriodRow> = [
    period(NETMARBLE.corp_code, 2024, "A", { revenue: 2e12, opm_pct: 2, roe_pct: 1 }),
    period(NETMARBLE.corp_code, 2025, "A", { revenue: 2.2e12, opm_pct: 5, roe_pct: 3 }),
    period(PEARL.corp_code, 2025, "A", { revenue: 3e11, opm_pct: -3, roe_pct: -1 }),
    period(ECOPRO_BM.corp_code, 2025, "A", { revenue: 3e12, opm_pct: 1, roe_pct: 0 }),
];

export const filing = (rcept_no: string, report_nm: string, rcept_dt: string, corp_code = KRAFTON.corp_code): Filing => ({
    rcept_no, corp_code, report_nm, flr_nm: null, rcept_dt, rm: null, is_correction: false,
});

export const FILINGS: ReadonlyArray<Filing> = [
    filing("20260515000001", "분기보고서 (2026.03)", "2026-05-15"),
    filing("20260402000001", "임원ㆍ주요주주특정증권등소유상황보고서", "2026-04-02"),
    filing("20260209000388", "주요사항보고서(자기주식취득결정)", "2026-02-09"),
    filing("20260110000001", "기업설명회(IR)개최(안내공시)", "2026-01-10"),
];

export const board = (slug: string, tenantId: string, title: string, over: Partial<Board> = {}): Board => ({
    slug,
    tenantId,
    createdBy: "2",
    theme: "stocks",
    title,
    tagline: "",
    groups: [{
        id: "g1",
        title: "크래프톤",
        summary: "",
        layout: { i: "g1", x: 0, y: 0, w: 6, h: 10 },
        widgets: [{ id: "w1", kind: "note", title: "요약", body: "해자가 있다", layout: { i: "w1", x: 0, y: 0, w: 6, h: 4 } }],
    }],
    version: 1,
    ...over,
});
