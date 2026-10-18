/**
 * 화면(iframe)에 서는 글. 한 파일에 모아 같은 것을 같은 말로 부르게 한다.
 *
 * 규칙은 `.claude/skills/ux-writing` 이 갖는다. 단추는 누르면 일어나는 일을 동사로 적고, 문장은 해요체로 맺는다.
 * 단추가 대화에 보내는 말(`prompts`)은 사람이 직접 쓴 것처럼 짧은 반말 요청으로 둔다. 대화에 그대로 남기 때문이다.
 *
 * ⚠ 이 파일은 화면의 묶음에 들어간다. 아무것도 import 하지 않는다.
 */
export const COPY = {
    waiting: "불러오는 중이에요.",
    actions: {
        analyze: "분석 시작",
        fullscreen: "크게 보기",
        add: "대화에 추가",
        added: "추가됨",
        quarter: "분기로 보기",
        annual: "연간으로 보기",
        value: "적정가 계산",
        scenarios: "시나리오 9칸 보기",
        saveBoard: "보드에 담기",
        summarizeFilings: "최근 공시 요약해 줘",
        openDart: "DART 원문 열기",
        continueBoard: "이어서 분석",
    },
    prompts: {
        analyze: (name: string) => `${name} 기본 분석해 줘`,
        basis: (name: string, basis: "annual" | "quarter") => `${name} ${basis === "quarter" ? "분기" : "연간"} 실적 보여 줘`,
        value: (name: string) => `${name} 적정가 계산해 줘`,
        saveBoard: (name: string) => `${name} 적정가 계산을 리서치 보드에 담아 줘`,
        filings: (name: string) => `${name} 최근 공시 요약해 줘`,
        board: (title: string) => `「${title}」 보드 이어서 분석해 줘`,
    },
    company: {
        headline: "핵심 숫자",
        trend: "5년 매출 · 영업이익",
        revenue: "매출",
        operatingIncome: "영업이익",
        allMetrics: "핵심 지표",
        table: "연도별",
        yoy: "전년 대비",
    },
    financials: {
        annual: "연간",
        quarter: "분기",
        unitWon: "단위 억원",
        unitPct: "단위 %",
        empty: "이 기간의 재무 자료가 없어요.",
    },
    peers: {
        company: "종목",
        revenue: "매출(억원)",
        growth: "성장률",
        opm: "영업이익률",
        roe: "ROE",
        empty: "비교할 종목이 없어요.",
    },
    valuation: {
        fair: "적정가",
        buy: "매수가",
        buyHint: "적정가 ÷ 3",
        current: "오늘 주가",
        gap: (pct: string) => `오늘 주가가 매수가보다 ${pct} 높아요.`,
        below: (pct: string) => `오늘 주가가 매수가보다 ${pct} 낮아요.`,
        noCurrent: "오늘 주가를 말하면 매수가와 비교해 줘요.",
        method: { per: "PER 기준", psr: "PSR 기준" },
        year: (year: number) => `${year}년 기준`,
        grid: "시나리오 9칸",
        revenueCase: { bear: "매출 보수", base: "매출 기본", bull: "매출 낙관" },
        perCase: { low: "낮은 배수", mid: "중간 배수", high: "높은 배수" },
        assumptions: "가정",
        refused: "적정가를 계산하지 않았어요",
    },
    filings: {
        empty: "최근 공시가 없어요.",
        kind: { regular: "정기", major: "주요사항", ownership: "지분", other: "기타" },
    },
    screen: {
        title: "종목 찾기 결과",
        total: (shown: number, total: number) => (shown === total ? `${total}곳` : `${total}곳 중 ${shown}곳`),
        cagr: "3년 성장률",
        empty: "조건에 맞는 종목이 없어요.",
        picked: (count: number) => `${count}곳을 대화에 추가했어요.`,
    },
    home: {
        title: "기업분석",
        quick: "이렇게 물어보세요",
        quickPrompts: ["크래프톤 기본 분석해 줘", "게임 업종 경쟁사 비교해 줘", "적정가 계산 방법 알려 줘"],
        quickLabels: ["크래프톤 기본 분석", "게임 업종 비교", "적정가 계산 방법"],
        recent: "최근 본 종목",
        recentEmpty: "아직 본 종목이 없어요.",
        boards: "내 리서치 보드",
        boardsEmpty: "아직 보드가 없어요. 분석하다가 「보드에 담기」를 누르면 여기 모여요.",
        signedOut: "로그인하면 내 리서치 보드가 여기 보여요.",
    },
    boards: {
        title: "리서치 보드",
        empty: "아직 보드가 없어요. 분석을 보드에 담으면 여기 모여요.",
        signedOut: "로그인하면 내 리서치 보드를 대화에 가져올 수 있어요.",
        widgets: (count: number) => `위젯 ${count}개`,
        theme: { stocks: "주식", "real-estate": "부동산" },
    },
    market: { KOSPI: "코스피", KOSDAQ: "코스닥", KONEX: "코넥스" },
    errors: {
        message: "대화에 보내지 못했어요. 입력창에 직접 적어 주세요.",
        context: "대화에 추가하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
        link: "링크를 열지 못했어요.",
        load: "화면을 불러오지 못했어요. 대화에서 다시 물어봐 주세요.",
    },
} as const;
