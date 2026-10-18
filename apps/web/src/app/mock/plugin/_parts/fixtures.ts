import type {
    BoardsView,
    CompanyRef,
    CompanyView,
    FilingsView,
    FinancialsView,
    HomeView,
    PeersView,
    ScreenView,
    ValuationView,
} from "@/modules/plugin/investing/contract";

/**
 * ⚠ **표본 데이터다.** 목업의 사진을 찍으려고 손으로 지은 숫자이고 실제 공시 · 재무 값이 아니다. 크기와 자릿수만 그럴듯하게 맞췄다.
 * 화면이 받는 모양(`investing/contract.ts`)은 그대로 따른다. 금액은 원 단위 정수, 비율은 퍼센트 수다.
 */
const JO = 1_000_000_000_000;
const EOK = 100_000_000;

const SOURCE = "표본 데이터 · DART 사업보고서 형식 · 연결";

export const KRAFTON: CompanyRef = { stockCode: "259960", name: "크래프톤", market: "KOSPI", sector: "소프트웨어 개발 및 공급업" };
const NETMARBLE: CompanyRef = { stockCode: "251270", name: "넷마블", market: "KOSPI", sector: "소프트웨어 개발 및 공급업" };
const NCSOFT: CompanyRef = { stockCode: "036570", name: "엔씨소프트", market: "KOSPI", sector: "소프트웨어 개발 및 공급업" };
const PEARLABYSS: CompanyRef = { stockCode: "263750", name: "펄어비스", market: "KOSDAQ", sector: "게임 소프트웨어 개발 및 공급업" };
const SHIFTUP: CompanyRef = { stockCode: "462870", name: "시프트업", market: "KOSPI", sector: "게임 소프트웨어 개발 및 공급업" };
const ECOPRO: CompanyRef = { stockCode: "247540", name: "에코프로비엠", market: "KOSDAQ", sector: "일차전지 및 축전지 제조업" };

const years = ["2021", "2022", "2023", "2024", "2025"];
const points = (values: ReadonlyArray<number | null>, labels = years) => labels.map((label, index) => ({ label, value: values[index] ?? null }));

export const company: CompanyView = {
    page: "company",
    company: KRAFTON,
    headline: [
        { key: "revenue", label: "TTM 매출", value: 3.02 * JO, unit: "won", change: 18.4 },
        { key: "opm_pct", label: "영업이익률", value: 40.1, unit: "pct", change: 0.4 },
        { key: "roe_pct", label: "ROE", value: 17.8, unit: "pct", change: -1.2 },
    ],
    metrics: [
        { key: "operating_income", label: "TTM 영업이익", value: 1.21 * JO, unit: "won", change: 19.6 },
        { key: "net_income", label: "TTM 순이익", value: 0.98 * JO, unit: "won", change: 12.1 },
        { key: "debt_ratio_pct", label: "부채비율", value: 21.4, unit: "pct", change: -2.3 },
        { key: "cf_operating", label: "영업현금흐름", value: 1.12 * JO, unit: "won", change: 8.7 },
    ],
    revenue: points([1.89 * JO, 1.85 * JO, 1.91 * JO, 2.71 * JO, 2.95 * JO]),
    operatingIncome: points([0.65 * JO, 0.75 * JO, 0.77 * JO, 1.18 * JO, 1.21 * JO]),
    source: SOURCE,
};

const quarters = ["24.3Q", "24.4Q", "25.1Q", "25.2Q", "25.3Q", "25.4Q", "26.1Q", "26.2Q"];

export const financials: FinancialsView = {
    page: "financials",
    company: KRAFTON,
    basis: "quarter",
    series: [
        { key: "revenue", label: "매출", unit: "won", points: points([7_193 * EOK, 5_441 * EOK, 8_742 * EOK, 6_620 * EOK, 7_870 * EOK, 6_310 * EOK, 9_105 * EOK, 7_402 * EOK], quarters) },
        { key: "operating_income", label: "영업이익", unit: "won", points: points([3_244 * EOK, 1_418 * EOK, 4_573 * EOK, 2_460 * EOK, 3_480 * EOK, 1_905 * EOK, 4_610 * EOK, 2_981 * EOK], quarters) },
        { key: "opm_pct", label: "영업이익률", unit: "pct", points: points([45.1, 26.1, 52.3, 37.2, 44.2, 30.2, 50.6, 40.3], quarters) },
    ],
    source: SOURCE,
};

export const peers: PeersView = {
    page: "peers",
    title: "게임 업종 비교",
    period: "2025 연간",
    rows: [
        { company: KRAFTON, focus: true, revenue: 2.95 * JO, revenueGrowthPct: 8.9, opmPct: 41.0, roePct: 17.8, debtRatioPct: 21.4 },
        { company: NETMARBLE, focus: false, revenue: 2.66 * JO, revenueGrowthPct: 2.1, opmPct: 7.4, roePct: 2.0, debtRatioPct: 58.3 },
        { company: NCSOFT, focus: false, revenue: 1.52 * JO, revenueGrowthPct: -4.3, opmPct: 1.1, roePct: 0.5, debtRatioPct: 31.0 },
        { company: PEARLABYSS, focus: false, revenue: 3_610 * EOK, revenueGrowthPct: 5.6, opmPct: -2.0, roePct: -1.5, debtRatioPct: 44.9 },
        { company: SHIFTUP, focus: false, revenue: 2_405 * EOK, revenueGrowthPct: 9.8, opmPct: 63.0, roePct: 18.0, debtRatioPct: 9.2 },
    ],
    source: SOURCE,
};

const fair = 520_000;

export const valuation: ValuationView = {
    page: "valuation",
    company: KRAFTON,
    targetYear: 2028,
    method: "per",
    fairPrice: fair,
    buyPrice: Math.round(fair / 3),
    currentPrice: 268_000,
    currentPriceSource: "사용자가 넣은 값 · 10월 17일 종가",
    gapToBuyPct: ((268_000 - Math.round(fair / 3)) / Math.round(fair / 3)) * 100,
    cells: [
        { revenueCase: "bear", perCase: "low", fairPrice: 286_000 },
        { revenueCase: "bear", perCase: "mid", fairPrice: 381_000 },
        { revenueCase: "bear", perCase: "high", fairPrice: 476_000 },
        { revenueCase: "base", perCase: "low", fairPrice: 390_000 },
        { revenueCase: "base", perCase: "mid", fairPrice: fair },
        { revenueCase: "base", perCase: "high", fairPrice: 650_000 },
        { revenueCase: "bull", perCase: "low", fairPrice: 488_000 },
        { revenueCase: "bull", perCase: "mid", fairPrice: 651_000 },
        { revenueCase: "bull", perCase: "high", fairPrice: 814_000 },
    ],
    assumptions: [
        "3년 뒤 매출 4.1조원 · 기본 시나리오(보수 3.4조 · 낙관 4.8조)",
        "순이익률 30% · 최근 3년 평균",
        "PER 15배 · 피어 범위 12~18배의 가운데",
        "발행주식수 4,800만 주 · 2025 사업보고서",
    ],
    refusal: null,
    source: SOURCE,
};

export const valuationRefused: ValuationView = {
    ...valuation,
    company: PEARLABYSS,
    fairPrice: null,
    buyPrice: null,
    currentPrice: null,
    currentPriceSource: null,
    gapToBuyPct: null,
    cells: [],
    assumptions: [],
    refusal: "최근 3년 중 2년이 영업적자예요. PER 대신 PSR로 계산하려면 3년 뒤 매출을 알려 주세요.",
};

const dart = (rceptNo: string): string => `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;

export const filings: FilingsView = {
    page: "filings",
    company: KRAFTON,
    items: [
        { rceptNo: "20261014000412", date: "2026-10-14", title: "주요사항보고서(자기주식취득결정)", kind: "major", url: dart("20261014000412") },
        { rceptNo: "20261002000187", date: "2026-10-02", title: "임원ㆍ주요주주특정증권등소유상황보고서", kind: "ownership", url: dart("20261002000187") },
        { rceptNo: "20260814001033", date: "2026-08-14", title: "반기보고서 (2026.06)", kind: "regular", url: dart("20260814001033") },
        { rceptNo: "20260731000255", date: "2026-07-31", title: "연결재무제표기준영업(잠정)실적(공정공시)", kind: "other", url: dart("20260731000255") },
        { rceptNo: "20260611000094", date: "2026-06-11", title: "주식등의대량보유상황보고서(일반)", kind: "ownership", url: dart("20260611000094") },
        { rceptNo: "20260515000771", date: "2026-05-15", title: "분기보고서 (2026.03)", kind: "regular", url: dart("20260515000771") },
    ],
    source: "표본 데이터 · DART 공시 목록",
};

export const screen: ScreenView = {
    page: "screen",
    filters: ["업종 582 접두", "영업이익률 20% 이상", "코스피 · 코스닥"],
    rows: [
        { company: SHIFTUP, revenue: 2_405 * EOK, revenueCagrPct: 24.1, opmPct: 63.0, roePct: 18.0 },
        { company: KRAFTON, revenue: 2.95 * JO, revenueCagrPct: 16.0, opmPct: 41.0, roePct: 17.8 },
        { company: { stockCode: "112040", name: "위메이드", market: "KOSDAQ", sector: "소프트웨어 개발 및 공급업" }, revenue: 6_120 * EOK, revenueCagrPct: 11.2, opmPct: 22.4, roePct: 9.1 },
        { company: { stockCode: "293490", name: "카카오게임즈", market: "KOSDAQ", sector: "소프트웨어 개발 및 공급업" }, revenue: 9_870 * EOK, revenueCagrPct: -3.5, opmPct: 21.0, roePct: 4.2 },
        { company: { stockCode: "192080", name: "더블유게임즈", market: "KOSDAQ", sector: "게임 소프트웨어 개발 및 공급업" }, revenue: 6_540 * EOK, revenueCagrPct: 4.8, opmPct: 36.5, roePct: 13.4 },
        { company: { stockCode: "225570", name: "넥슨게임즈", market: "KOSDAQ", sector: "게임 소프트웨어 개발 및 공급업" }, revenue: 2_980 * EOK, revenueCagrPct: 19.6, opmPct: 20.3, roePct: 11.0 },
    ],
    total: 6,
    source: "표본 데이터 · fin_periods 2025 연간",
};

const boards = [
    { slug: "game-2026", title: "게임 업종 2026", theme: "stocks", widgets: 7, updatedAt: "10월 16일" },
    { slug: "krafton-value", title: "크래프톤 적정가", theme: "stocks", widgets: 4, updatedAt: "10월 12일" },
    { slug: "battery-materials", title: "2차전지 소재", theme: "stocks", widgets: 9, updatedAt: "9월 28일" },
] as const;

export const home: HomeView = {
    page: "home",
    signedIn: true,
    boards: boards.slice(0, 2),
    companies: [
        { ...KRAFTON, headline: company.headline.slice(0, 2) },
        { ...ECOPRO, headline: [{ key: "revenue", label: "TTM 매출", value: 2.84 * JO, unit: "won", change: -38.2 }, { key: "opm_pct", label: "영업이익률", value: 1.9, unit: "pct", change: -3.1 }] },
        { ...NETMARBLE, headline: [{ key: "revenue", label: "TTM 매출", value: 2.66 * JO, unit: "won", change: 2.1 }, { key: "opm_pct", label: "영업이익률", value: 7.4, unit: "pct", change: 1.9 }] },
        { ...SHIFTUP, headline: [{ key: "revenue", label: "TTM 매출", value: 2_405 * EOK, unit: "won", change: 9.8 }, { key: "opm_pct", label: "영업이익률", value: 63.0, unit: "pct", change: -4.4 }] },
    ],
};

export const homeSignedOut: HomeView = { ...home, signedIn: false, boards: [] };

export const boardsView: BoardsView = { page: "boards", signedIn: true, boards };

export const boardsSignedOut: BoardsView = { page: "boards", signedIn: false, boards: [] };
