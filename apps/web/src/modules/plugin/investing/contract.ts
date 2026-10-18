/**
 * 투자 분석 화면이 도구 결과로 받는 모양. 서버(`views.ts`)가 만들고 화면(`app/`)이 그린다.
 *
 * ⚠ **이 파일은 서버 코드를 부르지 않는다.** 화면 묶음에 함께 실리므로 타입과 상수만 둔다.
 * ⚠ **금액은 원 단위 정수, 비율은 퍼센트 수(12.3 은 12.3%)다.** 값이 없으면 `null` 이고 화면은 「–」로 그린다.
 *    서버에서 글로 펴지 않는다. 화면이 단위와 색을 고른다.
 * ⚠ **숫자마다 출처를 단다.** `source` 는 「DART 사업보고서 · 2025 연간 · 연결」처럼 사람이 읽는 한 줄이다.
 */

export type Market = "KOSPI" | "KOSDAQ" | "KONEX" | null;

/** 기간 하나. `label` 은 「2025」 · 「25.2Q」 · 「TTM」처럼 화면에 그대로 쓴다 */
export interface PeriodPoint
{
    readonly label: string;
    readonly value: number | null;
}

export interface CompanyRef
{
    readonly stockCode: string;
    readonly name: string;
    readonly market: Market;
    /** KSIC 업종 이름. 「소프트웨어 개발 및 공급업」 */
    readonly sector: string | null;
}

/** 핵심 숫자 하나. `tone` 은 좋고 나쁨이 아니라 값의 방향(오름 · 내림 · 같음)이다 */
export interface KeyMetric
{
    readonly key: "revenue" | "operating_income" | "opm_pct" | "roe_pct" | "debt_ratio_pct" | "net_income" | "cf_operating";
    readonly label: string;
    readonly value: number | null;
    readonly unit: "won" | "pct";
    /** 한 해 전 같은 기간 대비 변화(퍼센트 포인트 또는 퍼센트). 없으면 null */
    readonly change: number | null;
}

export interface CompanyView
{
    readonly page: "company";
    readonly company: CompanyRef;
    /** 먼저 보여 줄 숫자 셋: TTM 매출 · 영업이익률 · ROE */
    readonly headline: ReadonlyArray<KeyMetric>;
    /** 나머지 핵심 숫자(크게 보기에서만 모두 그린다) */
    readonly metrics: ReadonlyArray<KeyMetric>;
    /** 연간 5개년 매출 · 영업이익 */
    readonly revenue: ReadonlyArray<PeriodPoint>;
    readonly operatingIncome: ReadonlyArray<PeriodPoint>;
    readonly source: string;
}

export interface FinancialSeries
{
    readonly key: string;
    readonly label: string;
    readonly unit: "won" | "pct";
    readonly points: ReadonlyArray<PeriodPoint>;
}

export interface FinancialsView
{
    readonly page: "financials";
    readonly company: CompanyRef;
    readonly basis: "annual" | "quarter";
    /** 막대로 그리는 첫 계열과 표에 함께 싣는 계열(셋까지) */
    readonly series: ReadonlyArray<FinancialSeries>;
    readonly source: string;
}

export interface PeerRow
{
    readonly company: CompanyRef;
    /** 이 표의 주인공이면 true. 화면이 그 줄을 굵게 한다 */
    readonly focus: boolean;
    readonly revenue: number | null;
    readonly revenueGrowthPct: number | null;
    readonly opmPct: number | null;
    readonly roePct: number | null;
    readonly debtRatioPct: number | null;
}

export interface PeersView
{
    readonly page: "peers";
    readonly title: string;
    /** 비교 기준 기간. 「2025 연간」 */
    readonly period: string;
    readonly rows: ReadonlyArray<PeerRow>;
    readonly source: string;
}

/** 9칸의 한 칸. 매출 시나리오 × PER 시나리오 */
export interface ValuationCell
{
    readonly revenueCase: "bear" | "base" | "bull";
    readonly perCase: "low" | "mid" | "high";
    readonly fairPrice: number | null;
}

export interface ValuationView
{
    readonly page: "valuation";
    readonly company: CompanyRef;
    /** 기준이 되는 해. 「2028」 */
    readonly targetYear: number;
    readonly method: "per" | "psr";
    /** 기본 칸(base × mid)의 적정가와 매수가(÷3) */
    readonly fairPrice: number | null;
    readonly buyPrice: number | null;
    /** 사람이 넣은 오늘 주가. 없으면 거리 칸을 그리지 않는다 */
    readonly currentPrice: number | null;
    readonly currentPriceSource: string | null;
    /** (오늘 주가 − 매수가) ÷ 매수가 × 100 */
    readonly gapToBuyPct: number | null;
    readonly cells: ReadonlyArray<ValuationCell>;
    /** 입력을 사람이 읽는 줄로. 「3년 뒤 매출 2.1조 · 순이익률 25% · PER 15배」 */
    readonly assumptions: ReadonlyArray<string>;
    /** 계산을 거절한 까닭. 있으면 화면은 숫자 대신 이 글을 그린다 */
    readonly refusal: string | null;
    readonly source: string;
}

export type FilingKind = "regular" | "major" | "ownership" | "other";

export interface FilingItem
{
    readonly rceptNo: string;
    readonly date: string;
    readonly title: string;
    readonly kind: FilingKind;
    /** DART 원문 주소. 우리 것이 아닌 곳이라 밖으로 열어도 된다 */
    readonly url: string;
}

export interface FilingsView
{
    readonly page: "filings";
    readonly company: CompanyRef;
    readonly items: ReadonlyArray<FilingItem>;
    readonly source: string;
}

export interface ScreenRow
{
    readonly company: CompanyRef;
    readonly revenue: number | null;
    readonly revenueCagrPct: number | null;
    readonly opmPct: number | null;
    readonly roePct: number | null;
}

export interface ScreenView
{
    readonly page: "screen";
    /** 조건을 칩으로. 「업종 582 · 영업이익률 ≥ 20%」 */
    readonly filters: ReadonlyArray<string>;
    readonly rows: ReadonlyArray<ScreenRow>;
    readonly total: number;
    readonly source: string;
}

export interface BoardCard
{
    readonly slug: string;
    readonly title: string;
    readonly theme: "stocks" | "real-estate";
    readonly widgets: number;
    /** 고친 때. 보드의 도메인 모양에 아직 없어서 지금은 늘 null 이고 화면은 그리지 않는다 */
    readonly updatedAt: string | null;
}

export interface HomeView
{
    readonly page: "home";
    /** 로그인하지 않았으면 빈 목록이고 화면은 로그인 권유를 그린다 */
    readonly signedIn: boolean;
    readonly boards: ReadonlyArray<BoardCard>;
    readonly companies: ReadonlyArray<CompanyRef & { readonly headline: ReadonlyArray<KeyMetric> }>;
}

export interface BoardsView
{
    readonly page: "boards";
    readonly signedIn: boolean;
    readonly boards: ReadonlyArray<BoardCard>;
}

export type InvestingView =
    | CompanyView
    | FinancialsView
    | PeersView
    | ValuationView
    | FilingsView
    | ScreenView
    | HomeView
    | BoardsView;

export type InvestingPage = InvestingView["page"];

/** 모든 숫자 카드의 바닥 한 줄 */
export const DISCLAIMER = "분석 연습용 자료예요. 투자 판단은 스스로 하세요.";
