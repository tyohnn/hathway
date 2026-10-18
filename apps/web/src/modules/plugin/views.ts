import type { CompanyIndexRow, FinPeriodRow, MemberFinancials } from "@hathway/market/domain/rows";
import { growthPct, round1 } from "@hathway/market/rules/growth";
import { collapseByPeriodKey, collapseByYear } from "@hathway/market/rules/periods";
import type { ScreenFilters, ScreenHit } from "@hathway/market/rules/universe";
import type { ValuationInput, ValuationOutcome, ValuationRefusal } from "@hathway/market/rules/valuation";
import type { Board } from "@hathway/research/domain/Board";
import { ksicDivision, ksicDivisionName, SECTOR_NAMES, type Company, type Filing } from "@hathway/schema";

import type {
    BoardCard,
    BoardsView,
    CompanyRef,
    CompanyView,
    FilingItem,
    FilingKind,
    FilingsView,
    FinancialSeries,
    FinancialsView,
    HomeView,
    KeyMetric,
    Market,
    PeerRow,
    PeersView,
    PeriodPoint,
    ScreenView,
    ValuationView,
} from "./investing/contract";

export { DISCLAIMER } from "./investing/contract";

/**
 * 도구의 답과 화면에 싣는 모양(`investing/contract.ts`). 순수 함수라 도커 없이 잰다(`views.test.ts`).
 *
 * ⚠ **실을 칸을 여기서 고른다.** 행을 통째로 내보내지 않는다. 화면은 호스트 안의 iframe 이라 우리 브라우저 탭보다 멀다.
 *    보드의 테넌트와 만든 사람의 id 는 화면이 그리지 않아도 실리면 밖으로 나간 것이다.
 * ⚠ **숫자는 고치지 않는다.** 금액은 원 단위 정수, 비율은 퍼센트 수 그대로 싣는다. 글로 펴는 것은 모델이 읽는 `content`
 *    한 줄(`wonText`)뿐이다.
 */
const MARKETS = ["KOSPI", "KOSDAQ", "KONEX"] as const;

const marketOf = (value: string | null): Market => MARKETS.find((known) => known === value) ?? null;

/** 세세분류 이름이 있으면 그것, 없으면 중분류 이름이다 */
export const sectorLabel = (code: string | null): string | null =>
    (code === null ? null : SECTOR_NAMES[code] ?? ksicDivisionName(ksicDivision(code)));

export const companyRef = (company: Pick<Company, "stock_code" | "name" | "market" | "sector_code">): CompanyRef => ({
    stockCode: company.stock_code ?? "",
    name: company.name,
    market: marketOf(company.market),
    sector: sectorLabel(company.sector_code),
});

export const indexRef = (row: CompanyIndexRow): CompanyRef =>
    companyRef({ stock_code: row.stock_code, name: row.name, market: row.market, sector_code: row.sector_code });


/** 1.2조 · 3,925억 · 1,234만 · 980원. 모델이 읽는 글과 가정의 줄에만 쓴다 */
export const wonText = (value: number | null): string =>
{
    if (value === null)
    {
        return "–";
    }

    const sign = value < 0 ? "-" : "";
    const size = Math.abs(value);

    if (size >= 1e12)
    {
        return `${sign}${(size / 1e12).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}조`;
    }

    if (size >= 1e8)
    {
        return `${sign}${Math.round(size / 1e8).toLocaleString("ko-KR")}억`;
    }

    if (size >= 1e4)
    {
        return `${sign}${Math.round(size / 1e4).toLocaleString("ko-KR")}만`;
    }

    return `${sign}${Math.round(size).toLocaleString("ko-KR")}원`;
};

const pctText = (value: number | null): string => (value === null ? "–" : `${round1(value)}%`);

const valueOf = (row: FinPeriodRow | undefined, column: string): number | null => row?.values[column] ?? null;

const basisLabel = (fsDiv: string | undefined): string => (fsDiv === "OFS" ? "별도" : "연결");

/** 숫자가 어디서 왔는지. 모든 카드의 바닥에 선다 */
const dartSource = (period: string, fsDiv: string | undefined): string => `DART 정기보고서 · ${period} · ${basisLabel(fsDiv)}`;

/** 화면에 쓰는 재무 칸. 도구의 `series` 인자가 이 열쇠만 받는다 */
export const FINANCIAL_FIELDS = {
    revenue: { label: "매출", unit: "won" },
    operating_income: { label: "영업이익", unit: "won" },
    net_income: { label: "순이익", unit: "won" },
    opm_pct: { label: "영업이익률", unit: "pct" },
    npm_pct: { label: "순이익률", unit: "pct" },
    roe_pct: { label: "ROE", unit: "pct" },
    debt_ratio_pct: { label: "부채비율", unit: "pct" },
    cf_operating: { label: "영업현금흐름", unit: "won" },
    cf_investing: { label: "투자현금흐름", unit: "won" },
    cf_financing: { label: "재무현금흐름", unit: "won" },
    net_debt: { label: "순차입금", unit: "won" },
    cash: { label: "현금", unit: "won" },
} as const satisfies Readonly<Record<string, { readonly label: string; readonly unit: "won" | "pct" }>>;

export type FinancialField = keyof typeof FINANCIAL_FIELDS;

export const FINANCIAL_FIELD_KEYS = Object.keys(FINANCIAL_FIELDS) as ReadonlyArray<FinancialField>;

export const isFinancialField = (value: unknown): value is FinancialField =>
    typeof value === "string" && Object.hasOwn(FINANCIAL_FIELDS, value);

/** 금액은 바뀐 비율(%), 비율은 바뀐 폭(%p)이다 */
const changeOf = (unit: "won" | "pct", previous: number | null, current: number | null): number | null =>
{
    if (unit === "won")
    {
        return growthPct(previous, current);
    }

    return previous === null || current === null ? null : round1(current - previous);
};

const metricOf = (
    key: KeyMetric["key"],
    current: FinPeriodRow | undefined,
    previous: FinPeriodRow | undefined,
): KeyMetric =>
{
    const field = FINANCIAL_FIELDS[key];
    const value = valueOf(current, key);

    return { key, label: field.label, value, unit: field.unit, change: changeOf(field.unit, valueOf(previous, key), value) };
};

const annualOf = (rows: ReadonlyArray<FinPeriodRow>): ReadonlyArray<FinPeriodRow> =>
    collapseByYear(rows.filter((row) => row.period_type === "A"));

/** 네 분기가 다 차지 않은 해의 TTM 은 매출이 비어 있다. 그런 줄은 견줄 기준이 못 되어 뺀다 */
const ttmOf = (rows: ReadonlyArray<FinPeriodRow>): ReadonlyArray<FinPeriodRow> =>
    collapseByPeriodKey(rows.filter((row) => row.period_type === "TTM")).filter((row) => valueOf(row, "revenue") !== null);

const HEADLINE_KEYS = ["revenue", "opm_pct", "roe_pct"] as const;

const METRIC_KEYS = ["operating_income", "net_income", "debt_ratio_pct", "cf_operating"] as const;

/** 연간은 5개년, 분기는 8분기를 싣는다 */
export const ANNUAL_SPAN = 5;
export const QUARTER_SPAN = 8;

/**
 * 종목 요약. 먼저 보여 줄 셋은 최근 네 분기 합(TTM)이고, TTM 이 없으면 가장 최근 연간이다.
 * 바뀐 값은 한 해 전 같은 기준과 견준다. 열두 달 간격이 아닌 TTM 끼리는 견주지 않는다.
 */
export const companyView = (company: Company, rows: ReadonlyArray<FinPeriodRow>): CompanyView =>
{
    const annual = annualOf(rows);
    const ttm = ttmOf(rows);
    const useTtm = ttm.length > 0;
    const series = useTtm ? ttm : annual;
    const current = series.at(-1);
    // TTM 은 해마다 그 해의 마지막 분기에서 끝난다. 사업보고서가 아직 없는 해의 TTM 은 Q4 가 아닌 분기에서 끝나므로
    // 한 해 전 TTM(Q4 에서 끝남)과 열두 달 간격이 아니다. 두 해 모두 연간이 있을 때만 견준다
    const closed = (year: number): boolean => !useTtm || annual.some((row) => row.bsns_year === year);
    const previousYear = (current?.bsns_year ?? 0) - 1;
    const previous = current !== undefined && closed(current.bsns_year) && closed(previousYear)
        ? series.find((row) => row.bsns_year === previousYear)
        : undefined;
    const span = annual.slice(-ANNUAL_SPAN);
    const point = (column: string) => (row: FinPeriodRow): PeriodPoint => ({ label: String(row.bsns_year), value: valueOf(row, column) });

    return {
        page: "company",
        company: companyRef(company),
        headline: HEADLINE_KEYS.map((key) => metricOf(key, current, previous)),
        metrics: METRIC_KEYS.map((key) => metricOf(key, current, previous)),
        revenue: span.map(point("revenue")),
        operatingIncome: span.map(point("operating_income")),
        source: current === undefined
            ? "DART 정기보고서 · 재무 없음"
            : dartSource(useTtm ? `${current.bsns_year} TTM` : `${current.bsns_year} 연간`, current.fs_div),
    };
};

const quarterLabel = (row: FinPeriodRow): string => `${String(row.bsns_year).slice(2)}.${row.period_type.slice(1)}Q`;

/** 재무 추이. 첫 계열이 막대이고 셋까지 표에 함께 싣는다 */
export const financialsView = (
    company: Company,
    rows: ReadonlyArray<FinPeriodRow>,
    basis: "annual" | "quarter",
    fields: ReadonlyArray<FinancialField>,
): FinancialsView =>
{
    const periods = basis === "annual"
        ? annualOf(rows).slice(-ANNUAL_SPAN)
        : collapseByPeriodKey(rows.filter((row) => /^Q[1-4]$/.test(row.period_type))).slice(-QUARTER_SPAN);
    const labelOf = basis === "annual" ? (row: FinPeriodRow) => String(row.bsns_year) : quarterLabel;
    const picked = (fields.length === 0 ? ["revenue", "operating_income"] as const : fields).slice(0, 3);
    const series: ReadonlyArray<FinancialSeries> = picked.map((key) => ({
        key,
        label: FINANCIAL_FIELDS[key].label,
        unit: FINANCIAL_FIELDS[key].unit,
        points: periods.map((row) => ({ label: labelOf(row), value: valueOf(row, key) })),
    }));
    const first = periods[0];
    const last = periods.at(-1);

    return {
        page: "financials",
        company: companyRef(company),
        basis,
        series,
        source: first === undefined || last === undefined
            ? "DART 정기보고서 · 재무 없음"
            : dartSource(`${labelOf(first)}~${labelOf(last)} ${basis === "annual" ? "연간" : "분기"}`, last.fs_div),
    };
};

/** 피어 표. 주인공이 맨 앞이고 굵게 선다. 기준 해가 없으면 줄이 없다 */
export const peersView = (
    focus: Company,
    year: number | null,
    rows: ReadonlyArray<{ readonly company: Company; readonly financials: ReadonlyArray<MemberFinancials> }>,
): PeersView =>
{
    const peerRows: ReadonlyArray<PeerRow> = year === null ? [] : rows.map(({ company, financials }) =>
    {
        const current = financials.find((row) => row.bsns_year === year);
        const previous = financials.find((row) => row.bsns_year === year - 1);

        return {
            company: companyRef(company),
            focus: company.corp_code === focus.corp_code,
            revenue: current?.revenue ?? null,
            revenueGrowthPct: growthPct(previous?.revenue ?? null, current?.revenue ?? null),
            opmPct: current?.opm_pct ?? null,
            roePct: current?.roe_pct ?? null,
            debtRatioPct: current?.debt_ratio_pct ?? null,
        };
    });

    return {
        page: "peers",
        title: `${focus.name}와 같은 업종`,
        period: year === null ? "–" : `${year} 연간`,
        rows: peerRows,
        source: year === null
            ? "DART 정기보고서 · 재무 없음"
            : `DART 정기보고서 · ${year} 연간 · 연결 우선(없으면 별도) · 업종 코드 앞 세 자리가 같은 상장사`,
    };
};

const REFUSALS: Readonly<Record<ValuationRefusal, string>> = {
    "use-psr": "기본 시나리오의 순이익이 0 이하라 PER 로는 계산하지 않아요. PSR 로 다시 계산해 주세요.",
    "no-shares": "발행주식수가 없어 계산하지 못했어요. DART 의 발행주식수를 넣어 주세요.",
    "no-revenue": "기본 시나리오의 매출이 0 이하라 PSR 로도 계산하지 않아요. 3년 뒤 매출을 다시 세워 주세요.",
    "bad-multiple": "배수가 0 이하라 계산하지 않아요. PER 이나 PSR 을 0보다 크게 넣어 주세요.",
};

const multipleName = (method: ValuationInput["method"]): string => (method === "per" ? "PER" : "PSR");

/** 사람이 넣은 가정과 서버가 계산한 값. 숫자를 지어내지 않도록 가정은 받은 그대로 줄로 편다 */
export const valuationView = (
    company: Company,
    input: ValuationInput,
    outcome: ValuationOutcome,
    sources: { readonly currentPrice: string | null; readonly shares: string | null },
): ValuationView =>
{
    const name = multipleName(input.method);
    const assumptions = [
        `${input.targetYear}년 매출 ${wonText(input.revenue.bear)} · ${wonText(input.revenue.base)} · ${wonText(input.revenue.bull)} (비관 · 기본 · 낙관)`,
        ...(input.method === "per"
            ? [`순이익률 ${pctText(input.netMarginPct.bear)} · ${pctText(input.netMarginPct.base)} · ${pctText(input.netMarginPct.bull)}`]
            : []),
        `${name} ${input.multiple.low}배 · ${input.multiple.mid}배 · ${input.multiple.high}배`,
        `발행주식수 ${Number.isFinite(input.sharesOutstanding) ? input.sharesOutstanding.toLocaleString("ko-KR") : "–"}주${sources.shares === null ? "" : ` (${sources.shares})`}`,
    ];
    const currentPrice = input.currentPrice ?? null;
    const base = {
        page: "valuation",
        company: companyRef(company),
        targetYear: input.targetYear,
        method: input.method,
        currentPrice,
        currentPriceSource: currentPrice === null ? null : sources.currentPrice,
        assumptions,
        source: `매출 · 이익률 · 배수는 대화에서 세운 가정 · 발행주식수와 주가는 DB 밖(${sources.shares ?? "출처 없음"}) · 계산은 Hathway 기업분석`,
    } as const;

    if (outcome._tag === "Refused")
    {
        return { ...base, fairPrice: null, buyPrice: null, gapToBuyPct: null, cells: [], refusal: REFUSALS[outcome.reason] };
    }

    return {
        ...base,
        fairPrice: outcome.fairPrice,
        buyPrice: outcome.buyPrice,
        gapToBuyPct: outcome.gapToBuyPct,
        cells: outcome.cells,
        refusal: null,
    };
};

const OWNERSHIP_WORDS = ["대량보유", "주요주주", "소유상황"];
const MAJOR_WORDS = ["주요사항보고서", "자기주식", "결정", "배당"];
const REGULAR_WORDS = ["사업보고서", "분기보고서", "반기보고서"];

/** 공시의 갈래. 보고서 이름의 낱말로 가른다. 지분이 먼저인 까닭은 「주요주주」가 「주요사항」보다 좁아서다 */
export const filingKindOf = (reportNm: string): FilingKind =>
{
    if (OWNERSHIP_WORDS.some((word) => reportNm.includes(word)))
    {
        return "ownership";
    }

    if (REGULAR_WORDS.some((word) => reportNm.includes(word)))
    {
        return "regular";
    }

    return MAJOR_WORDS.some((word) => reportNm.includes(word)) ? "major" : "other";
};

export const dartUrl = (rceptNo: string): string => `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${encodeURIComponent(rceptNo)}`;

/** 공시 타임라인. 고른 갈래만 남기고 한도까지 싣는다 */
export const filingsView = (
    company: Company,
    filings: ReadonlyArray<Filing>,
    kind: FilingKind | "all",
    limit: number,
): FilingsView =>
{
    const items: ReadonlyArray<FilingItem> = filings
        .map((filing) => ({ rceptNo: filing.rcept_no, date: filing.rcept_dt, title: filing.report_nm, kind: filingKindOf(filing.report_nm), url: dartUrl(filing.rcept_no) }))
        .filter((item) => kind === "all" || item.kind === kind)
        .slice(0, limit);

    return { page: "filings", company: companyRef(company), items, source: "DART 전자공시 · 접수일 순" };
};

const SORT_LABELS: Readonly<Record<ScreenFilters["sortBy"], string>> = {
    opm: "영업이익률 순",
    roe: "ROE 순",
    revenueCagr: "3년 매출 CAGR 순",
    revenue: "매출 순",
};

/** 조건을 칩으로 편다. 받은 조건만 선다 */
export const screenFilterChips = (filters: ScreenFilters, year: number): ReadonlyArray<string> => [
    `${year} 연간`,
    ...(filters.sectorPrefix === undefined || filters.sectorPrefix === "" ? [] : [`업종 ${filters.sectorPrefix}${sectorLabel(filters.sectorPrefix) === null ? "" : ` ${sectorLabel(filters.sectorPrefix)}`}`]),
    ...(filters.market === undefined ? [] : [filters.market]),
    ...(filters.minOpmPct === undefined ? [] : [`영업이익률 ≥ ${filters.minOpmPct}%`]),
    ...(filters.minRoePct === undefined ? [] : [`ROE ≥ ${filters.minRoePct}%`]),
    ...(filters.minRevenueCagrPct === undefined ? [] : [`3년 매출 CAGR ≥ ${filters.minRevenueCagrPct}%`]),
    ...(filters.minRevenue === undefined ? [] : [`매출 ≥ ${wonText(filters.minRevenue)}`]),
    SORT_LABELS[filters.sortBy],
];

export const screenView = (
    filters: ScreenFilters,
    year: number,
    screened: { readonly rows: ReadonlyArray<ScreenHit>; readonly total: number },
): ScreenView => ({
    page: "screen",
    filters: screenFilterChips(filters, year),
    rows: screened.rows.map((hit) => ({
        company: companyRef(hit.company),
        revenue: hit.revenue,
        revenueCagrPct: hit.revenueCagrPct,
        opmPct: hit.opmPct,
        roePct: hit.roePct,
    })),
    total: screened.total,
    source: `DART 정기보고서 · ${year} 연간 · 연결 우선(없으면 별도) · KOSPI · KOSDAQ 상장사`,
});

/** 보드 카드. 테넌트와 만든 사람은 싣지 않는다 */
export const boardCard = (board: Board): BoardCard => ({
    slug: board.slug,
    title: board.title,
    theme: board.theme,
    widgets: board.groups.reduce((sum, group) => sum + group.widgets.length, 0),
    updatedAt: null,
});

export const boardsView = (signedIn: boolean, boards: ReadonlyArray<Board>): BoardsView => ({
    page: "boards",
    signedIn,
    boards: signedIn ? boards.map(boardCard) : [],
});

export const homeView = (
    signedIn: boolean,
    boards: ReadonlyArray<Board>,
    companies: ReadonlyArray<{ readonly company: Company; readonly rows: ReadonlyArray<FinPeriodRow> }>,
): HomeView => ({
    page: "home",
    signedIn,
    boards: signedIn ? boards.map(boardCard) : [],
    companies: companies.map(({ company, rows }) => ({ ...companyRef(company), headline: companyView(company, rows).headline })),
});

/** 모델이 읽는 한 줄. 카드를 통째로 옮기지 않고 핵심 숫자 셋과 출처만 싣는다 */
export const companySummary = (view: CompanyView): string =>
{
    const [revenue, opm, roe] = view.headline;

    return `${view.company.name}(${view.company.stockCode}) · ${view.company.sector ?? "업종 없음"}: 매출 ${wonText(revenue?.value ?? null)}, `
        + `영업이익률 ${pctText(opm?.value ?? null)}, ROE ${pctText(roe?.value ?? null)}. 출처: ${view.source}.`;
};

export const COMPANY_PREFIX = "company://";
export const BOARD_PREFIX = "board://";

export const companyUri = (stockCode: string): string => `${COMPANY_PREFIX}${stockCode}`;
export const boardUri = (slug: string): string => `${BOARD_PREFIX}${slug}`;

/** `company://259960` 에서 종목코드를, `board://slug` 에서 slug 를 꺼낸다. 모양이 틀리면 `null` 이다 */
export const resourceOf = (uri: string): { readonly kind: "company" | "board"; readonly key: string } | null =>
{
    if (uri.startsWith(COMPANY_PREFIX))
    {
        const key = uri.slice(COMPANY_PREFIX.length);

        return /^[0-9A-Z]{6}$/.test(key) ? { kind: "company", key } : null;
    }

    if (uri.startsWith(BOARD_PREFIX))
    {
        const key = uri.slice(BOARD_PREFIX.length);

        return /^[a-z0-9][a-z0-9-]{0,63}$/.test(key) ? { kind: "board", key } : null;
    }

    return null;
};

export const MENTION_LIMIT = 20;

export interface MentionItem
{
    readonly type: "resource_link";
    readonly uri: string;
    readonly name: string;
    readonly title: string;
    readonly description?: string;
    readonly mimeType: "text/markdown";
}

/**
 * 컴포저에서 `@` 로 찾는 것. 종목은 이미 찾은 것(`searchCompanies`)을 받고, 보드는 제목으로 여기서 거른다. 종목이 먼저다. 고른 것은 주소로 메시지에 붙고, 호스트가 읽을 때 다시 조회를 지난다.
 */
export const mentionItems = (
    companies: ReadonlyArray<CompanyIndexRow>,
    boards: ReadonlyArray<Board>,
    query: string,
): ReadonlyArray<MentionItem> =>
{
    const needle = query.replace(/\s+/g, "").toLowerCase();
    const companyItems = companies.map((row): MentionItem => ({
        type: "resource_link",
        uri: companyUri(row.stock_code),
        name: row.name,
        title: row.name,
        description: [row.stock_code, row.market].filter((part) => part !== null).join(" · "),
        mimeType: "text/markdown",
    }));
    const boardItems = boards
        .filter((board) => board.title.replace(/\s+/g, "").toLowerCase().includes(needle))
        .map((board): MentionItem => ({ type: "resource_link", uri: boardUri(board.slug), name: board.title, title: board.title, description: "리서치 보드", mimeType: "text/markdown" }));

    return [...companyItems, ...boardItems].slice(0, MENTION_LIMIT);
};

/** 멘션으로 붙은 보드를 모델이 읽는 글. 그룹과 노트의 제목과 본문만 싣는다 */
export const boardMarkdown = (board: Board): string =>
    [
        `# ${board.title}`,
        ...(board.tagline === "" ? [] : [board.tagline]),
        ...board.groups.flatMap((group) => [
            `## ${group.title}`,
            ...group.widgets.map((widget) => (widget.body === undefined || widget.body === "" ? `- ${widget.title}` : `### ${widget.title}\n\n${widget.body}`)),
        ]),
    ].join("\n\n");
