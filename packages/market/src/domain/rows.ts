import type { Filing, FilingSection } from "@investment/schema";

/**
 * 읽은 행의 모양. 회사 · 공시 · 이벤트처럼 화면까지 그대로 가는 행은 `@investment/schema` 의 계약을 쓰고,
 * 여기에는 이 도메인이 접거나 고르기 전의 중간 모양만 둔다.
 */

/** 종목 검색과 첫 화면이 쓰는 가벼운 회사 행. 종목코드가 있는 회사만 온다 */
export interface CompanyIndexRow
{
    readonly stock_code: string;
    readonly name: string;
    readonly market: "KOSPI" | "KOSDAQ" | "KONEX" | null;
    readonly sector_code: string | null;
}

/** 상장 분포를 세는 데 쓰는 두 칸 */
export interface ListedSectorRow
{
    readonly sector_code: string | null;
    readonly market: string | null;
}

export type PeriodType = "A" | "Q1" | "Q2" | "Q3" | "Q4" | "TTM";

/**
 * `fin_periods` 의 한 행. 넓은 표라 숫자 칸을 이름 → 값으로 든다.
 *
 * ⚠ **숫자는 수로 온다.** `pg` 는 numeric 을 문자열로 돌려주므로 어댑터가 수로 바꾸고, 비었거나 수가 아니면 `null` 이다.
 */
export interface FinPeriodRow
{
    readonly corp_code: string;
    readonly period_key: string;
    readonly fs_div: string;
    readonly bsns_year: number;
    readonly period_type: string;
    readonly values: Readonly<Record<string, number | null>>;
}

/** `fin_periods` 의 숫자 칸. 어댑터가 이 목록만 읽는다. 표에 칸이 늘면 여기에 더한다 */
export const FIN_PERIOD_COLUMNS = [
    "revenue", "cogs", "gross_profit", "sga", "operating_income", "net_income", "depreciation", "amortisation", "ebitda",
    "cf_operating", "cf_investing", "cf_financing", "assets", "liabilities", "equity", "cash", "st_borrowings",
    "current_lt_borrowings", "lt_borrowings", "bonds", "current_bonds", "borrowings_total", "net_debt", "gpm_pct",
    "opm_pct", "npm_pct", "roe_pct", "debt_ratio_pct", "current_assets", "current_liabilities", "inventories",
    "capital_stock", "retained_earnings", "capital_surplus", "current_ratio_pct", "quick_ratio_pct", "reserve_ratio_pct",
    "equity_ratio_pct", "capex", "interest_expense", "interest_coverage",
] as const;

export type FinPeriodColumn = (typeof FIN_PERIOD_COLUMNS)[number];

/** 주석과 「사업의 내용」을 찾을 정기보고서 후보 */
export type ReportRef = Pick<Filing, "rcept_no" | "report_nm" | "rcept_dt">;

/** 저장소(Storage)에 공시마다 한 덩이로 든 본문 조각 */
export interface RawSection
{
    readonly rcept_no: string;
    readonly sec_no: number;
    readonly title: string;
    readonly content: string;
    readonly is_note: boolean;
    readonly is_biz: boolean;
}

export type NoteSectionListItem = FilingSection & { report_nm: string; filing_rcept_dt: string };

/** 화면의 재무 격자 한 칸 묶음 */
export interface GuideFinPeriod
{
    year: number;
    periodType: string;
    periodKey: string;
    fsDiv: string;
    values: Partial<Record<string, number | null>>;
}

export interface MemberFinancials
{
    bsns_year: number;
    fs_div: string;
    revenue: number | null;
    opm_pct: number | null;
    roe_pct: number | null;
    debt_ratio_pct: number | null;
}

export interface DivisionCount
{
    division: string;
    kospi: number;
    kosdaq: number;
    total: number;
}
