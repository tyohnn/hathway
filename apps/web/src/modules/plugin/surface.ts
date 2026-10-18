import type { McpSurfaceShape, McpToolDefinition } from "@/lib/mcp";

import { FINANCIAL_FIELD_KEYS, BOARD_PREFIX, COMPANY_PREFIX } from "./views";

/**
 * 플러그인이 MCP 에 더하는 것의 선언. 요청과 무관한 조각이라 순수하고, 봉투(`lib/mcp.ts`)가 목록과 capability 로 답한다.
 *
 * ChatGPT 의 플러그인 익스텐션은 따로 서는 패키지가 아니라 MCP 서버 위의 표시다. 도구의 `_meta` 가 「이 도구를
 * 사이드바에 세워라 · 이 화면으로 그려라」를 말한다. 화면은 `ui://` 자원으로 내주는 HTML 한 장이고 호스트가 iframe 으로
 * 띄운다(MCP Apps). 여덟 주소가 같은 HTML 을 내주고, 화면은 `structuredContent.page` 로 갈래를 고른다.
 *
 * | 익스텐션 | 이 파일의 자리 |
 * |---|---|
 * | 사이드바 앱 · 바로 가기 | `open_home` 의 `global` 진입점과 `quickAction` 「종목 분석 시작」 |
 * | 대화 옆 패널 | `open_boards` 의 `thread` 진입점 |
 * | 표시 방식 | `uiContents` 가 자원에 싣는 `openai/ui`. 스크리너만 전체 화면을 먼저 청한다 |
 * | 컴포저 멘션 | `search_mentions` 의 `mentions/search`. 종목과 보드를 `company://` · `board://` 로 돌려준다 |
 *
 * 도구의 지도는 `docs/plugin/흐름표.md` 2절이다(초안은 프로젝트 파일의 `plugin-ux/흐름표.md`).
 *
 * ⚠ **설명(`description`)은 모델이 읽고 심사가 읽는다.** 그래서 영어로 쓰고 언제 부르는지를 적는다. 제목은 사람이 보는 한국어다.
 * ⚠ **도구의 이름에 점을 쓰지 않는다.** 이 서버에는 클로드 코드도 붙고 그쪽은 영문자 · 숫자 · 밑줄 · 붙임표만 받는다.
 * ⚠ **도구의 인자로 테넌트나 계정을 받지 않는다.** 코어의 도구와 같은 규칙이다.
 * ⚠ **주소(`ui://…`)를 바꾸면 호스트가 새 화면으로 본다.** 화면을 크게 바꿔 옛 화면이 남으면 안 될 때 주소 끝의 판을 올린다.
 */
export const UI_MIME = "text/html;profile=mcp-app";

export const UI_COMPANY = "ui://hathway/company/v1";
export const UI_FINANCIALS = "ui://hathway/financials/v1";
export const UI_PEERS = "ui://hathway/peers/v1";
export const UI_VALUATION = "ui://hathway/valuation/v1";
export const UI_FILINGS = "ui://hathway/filings/v1";
export const UI_SCREEN = "ui://hathway/screen/v1";
export const UI_HOME = "ui://hathway/home/v1";
export const UI_BOARDS = "ui://hathway/boards/v1";

/**
 * 사이드바와 탭에 서는 아이콘. 호스트의 지침대로 20×20 판에 1.33px 선의 단색이고, `currentColor` 라 테마를 따른다.
 * 플러그인 패키지의 `plugin/assets/icon.svg` 와 같은 그림이다(`package.test.ts` 가 대조한다).
 */
export const ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.33\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 3.5h7l3.5 3.5v9.5h-10.5z\"/><path d=\"M12 3.5v3.5h3.5\"/><path d=\"M7.5 10.5h5\"/><path d=\"M7.5 13.5h3.5\"/></svg>\n";

const ICON = { src: `data:image/svg+xml,${encodeURIComponent(ICON_SVG.trim())}`, mimeType: "image/svg+xml", sizes: ["any"] } as const;

const EMPTY_INPUT = { type: "object", properties: {}, additionalProperties: false } as const;

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

const APP_ONLY = { ui: { visibility: ["app"] } } as const;

const STOCK_CODE = { type: "string", pattern: "^[0-9A-Z]{6}$", description: "Six-character KRX stock code, e.g. 259960. Use find_company first if you only know the name." } as const;

const SCENARIOS = {
    type: "object",
    properties: { bear: { type: "number" }, base: { type: "number" }, bull: { type: "number" } },
    required: ["bear", "base", "bull"],
    additionalProperties: false,
} as const;

const SERIES = {
    type: "array",
    items: { type: "string", enum: FINANCIAL_FIELD_KEYS },
    maxItems: 3,
    description: "Up to three fin_periods fields. The first is drawn as bars. Defaults to revenue and operating_income.",
} as const;

const ui = (resourceUri: string): Readonly<Record<string, unknown>> => ({ ui: { resourceUri } });

const TOOLS: ReadonlyArray<McpToolDefinition> = [
    {
        name: "find_company",
        title: "종목 찾기",
        description: "Find Korean listed companies by name or six-digit stock code. Call this first whenever the user names a company and you do not yet know its stock code. If several match, ask the user which one before calling another tool. Returns text only.",
        inputSchema: {
            type: "object",
            properties: { query: { type: "string", minLength: 1, description: "Company name (Korean) or stock code." } },
            required: ["query"],
            additionalProperties: false,
        },
        annotations: READ_ONLY,
    },
    {
        name: "show_company",
        title: "종목 요약",
        description: "Show a summary card for one company: sector, market, trailing-twelve-month revenue, operating margin and ROE, and five years of revenue and operating income from DART filings. Call it when the user asks about a company or wants to start analysing it.",
        inputSchema: { type: "object", properties: { stockCode: STOCK_CODE }, required: ["stockCode"], additionalProperties: false },
        annotations: READ_ONLY,
        _meta: ui(UI_COMPANY),
    },
    {
        name: "show_financials",
        title: "재무 추이",
        description: "Show annual (five years) or quarterly (eight quarters) financial trends for one company as a bar chart and table. Use it for questions about revenue or profit trends, quarterly results, cash flow (cf_operating, cf_investing, cf_financing) or leverage (debt_ratio_pct, net_debt).",
        inputSchema: {
            type: "object",
            properties: {
                stockCode: STOCK_CODE,
                basis: { type: "string", enum: ["annual", "quarter"], description: "annual by default." },
                series: SERIES,
            },
            required: ["stockCode"],
            additionalProperties: false,
        },
        annotations: READ_ONLY,
        _meta: ui(UI_FINANCIALS),
    },
    {
        name: "compare_peers",
        title: "피어 비교",
        description: "Compare a company with listed peers that share the first three digits of its KSIC sector code, on revenue, revenue growth, operating margin, ROE and debt ratio for its latest fiscal year. Peers are picked by revenue; pass withStockCodes to force specific peers the user named. Use it for moat, pricing-power and industry questions.",
        inputSchema: {
            type: "object",
            properties: {
                stockCode: STOCK_CODE,
                withStockCodes: { type: "array", items: STOCK_CODE, maxItems: 5, description: "Peers the user asked for by name." },
                limit: { type: "integer", minimum: 1, maximum: 8, description: "Number of peers besides the company. 5 by default." },
            },
            required: ["stockCode"],
            additionalProperties: false,
        },
        annotations: READ_ONLY,
        _meta: ui(UI_PEERS),
    },
    {
        name: "value_company",
        title: "적정가 계산",
        description: "Compute a fair price with the textbook method: target-year revenue × net margin × PER ÷ shares outstanding (or revenue × PSR ÷ shares for loss-making companies), the buy price as one third of the fair price, and a 3×3 grid of revenue and multiple scenarios. You must supply the scenarios you reasoned out with the user, and sharesOutstanding and currentPrice from a source you name, because prices and share counts are not in the database. Call it when the user asks for a fair value, a target price or whether the stock is cheap.",
        inputSchema: {
            type: "object",
            properties: {
                stockCode: STOCK_CODE,
                targetYear: { type: "integer", minimum: 2000, maximum: 2100, description: "Fiscal year the scenarios describe, usually three years ahead." },
                method: { type: "string", enum: ["per", "psr"], description: "per by default. Use psr when base-case net income is zero or negative." },
                revenue: { ...SCENARIOS, description: "Target-year revenue in KRW (won), bear/base/bull." },
                netMarginPct: { ...SCENARIOS, description: "Target-year net margin in percent, bear/base/bull. Ignored for psr." },
                multiple: {
                    type: "object",
                    properties: { low: { type: "number" }, mid: { type: "number" }, high: { type: "number" } },
                    required: ["low", "mid", "high"],
                    additionalProperties: false,
                    description: "PER (or PSR) multiples, low/mid/high.",
                },
                sharesOutstanding: { type: "number", description: "Shares outstanding from DART or an exchange page." },
                sharesSource: { type: "string", maxLength: 200, description: "Where sharesOutstanding came from, e.g. a URL." },
                currentPrice: { type: "number", description: "Today's share price in KRW, if you looked it up." },
                currentPriceSource: { type: "string", maxLength: 200, description: "Where currentPrice came from, with the date." },
            },
            required: ["stockCode", "targetYear", "revenue", "netMarginPct", "multiple", "sharesOutstanding"],
            additionalProperties: false,
        },
        annotations: READ_ONLY,
        _meta: ui(UI_VALUATION),
    },
    {
        name: "list_filings",
        title: "최근 공시",
        description: "List a company's recent DART filings as a timeline with links to the original documents. Filter by kind: regular (annual and quarterly reports), major (major-event reports such as buybacks, dividends, issuance), ownership (large-holder and insider changes). Use it for questions about recent disclosures, buybacks or whether insiders sold.",
        inputSchema: {
            type: "object",
            properties: {
                stockCode: STOCK_CODE,
                kind: { type: "string", enum: ["all", "regular", "major", "ownership"], description: "all by default." },
                limit: { type: "integer", minimum: 1, maximum: 30, description: "10 by default." },
            },
            required: ["stockCode"],
            additionalProperties: false,
        },
        annotations: READ_ONLY,
        _meta: ui(UI_FILINGS),
    },
    {
        name: "screen_stocks",
        title: "종목 스크리너",
        description: "Screen KOSPI and KOSDAQ companies by KSIC sector-code prefix, market, operating margin, ROE, three-year revenue CAGR and revenue for one fiscal year, sorted by the metric you choose. Use it when the user asks to find companies matching conditions, such as game companies with operating margin above 20%. Pass a sectorPrefix whenever the user names an industry.",
        inputSchema: {
            type: "object",
            properties: {
                sectorPrefix: { type: "string", pattern: "^[0-9]{2,5}$", description: "KSIC prefix, e.g. 582 for games and software, 282 for battery materials." },
                market: { type: "string", enum: ["KOSPI", "KOSDAQ"] },
                minOpmPct: { type: "number" },
                minRoePct: { type: "number" },
                minRevenueCagrPct: { type: "number" },
                minRevenue: { type: "number", description: "Minimum revenue in KRW." },
                sortBy: { type: "string", enum: ["opm", "roe", "revenueCagr", "revenue"], description: "opm by default." },
                year: { type: "integer", minimum: 2000, maximum: 2100, description: "Fiscal year. Last year by default." },
                limit: { type: "integer", minimum: 1, maximum: 50, description: "20 by default." },
            },
            additionalProperties: false,
        },
        annotations: READ_ONLY,
        _meta: { ...ui(UI_SCREEN) },
    },
    {
        name: "open_home",
        title: "Hathway",
        description: "Open the Hathway home: the user's research boards and a few companies to start from. The sidebar opens it with no arguments.",
        inputSchema: EMPTY_INPUT,
        annotations: READ_ONLY,
        icons: [ICON],
        _meta: {
            ...ui(UI_HOME),
            "openai/ui": {
                entrypoints: [{
                    type: "global",
                    quickAction: { title: "종목 분석 시작", icons: [ICON], target: { type: "tool", name: "open_home", arguments: {} } },
                }],
            },
        },
    },
    {
        name: "open_boards",
        title: "리서치 보드",
        description: "Open the user's research boards next to the conversation so they can add one to the chat.",
        inputSchema: EMPTY_INPUT,
        annotations: READ_ONLY,
        icons: [ICON],
        _meta: { ...ui(UI_BOARDS), "openai/ui": { entrypoints: [{ type: "thread" }] } },
    },
    {
        name: "save_to_board",
        title: "보드에 담기",
        description: "Save a markdown note from this analysis to one of the user's research boards, under a group named after the company. Pass boardSlug to add to an existing board; without it a new board is created. Call it only when the user asks to save or keep the analysis. Report the saved board title from the result; if it fails, say so and do not claim it was saved.",
        inputSchema: {
            type: "object",
            properties: {
                stockCode: STOCK_CODE,
                title: { type: "string", minLength: 1, maxLength: 120, description: "Note title, e.g. 적정가 2028." },
                body: { type: "string", minLength: 1, maxLength: 20000, description: "Markdown note. Keep the numbers and their sources." },
                boardSlug: { type: "string", pattern: "^[a-z0-9][a-z0-9-]{0,63}$" },
            },
            required: ["stockCode", "title", "body"],
            additionalProperties: false,
        },
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    {
        name: "browse_company",
        title: "종목 다시 읽기",
        description: "Load company or financials data for the widget when the user switches views inside it.",
        inputSchema: {
            type: "object",
            properties: {
                stockCode: STOCK_CODE,
                view: { type: "string", enum: ["company", "financials"] },
                basis: { type: "string", enum: ["annual", "quarter"] },
                series: SERIES,
            },
            required: ["stockCode", "view"],
            additionalProperties: false,
        },
        annotations: READ_ONLY,
        _meta: APP_ONLY,
    },
    {
        name: "search_mentions",
        title: "종목 · 보드 찾기",
        inputSchema: { type: "object", properties: { query: { type: "string" } } },
        outputSchema: { type: "object", properties: { items: { type: "array", items: { type: "object" } } }, required: ["items"] },
        annotations: READ_ONLY,
        _meta: { "openai/extensions": { "mentions/search": {} }, ...APP_ONLY },
    },
];

/**
 * 화면마다 먼저 청하는 표시 방식. 진입점으로 열 때는 호스트가 늘 전체 화면으로 띄우고, 모델이 도구를 불러 뜰 때 이 값을 본다.
 * 카드는 대화 안에 서고 「크게 보기」로 넓힌다. 스크리너는 표가 넓어서 처음부터 전체 화면이다.
 */
const DISPLAY: Readonly<Record<string, "inline" | "fullscreen">> = {
    [UI_COMPANY]: "inline",
    [UI_FINANCIALS]: "inline",
    [UI_PEERS]: "inline",
    [UI_VALUATION]: "inline",
    [UI_FILINGS]: "inline",
    [UI_SCREEN]: "fullscreen",
    [UI_HOME]: "fullscreen",
    [UI_BOARDS]: "inline",
};

/** `resources/read` 가 돌려주는 화면 자원의 내용. 여덟 화면이 같은 HTML 을 쓰고 표시 방식만 다르다 */
export const uiContents = (uri: string, html: string): ReadonlyArray<Record<string, unknown>> => [{
    uri,
    mimeType: UI_MIME,
    text: html,
    _meta: {
        "openai/ui": { preferredDisplayMode: DISPLAY[uri] ?? "inline", availableDisplayModes: ["inline", "fullscreen"] },
        // 화면은 밖의 주소를 부르지 않는다. 서버와는 호스트를 지나는 도구 호출로만 말한다
        ui: { csp: { connectDomains: [], resourceDomains: [] } },
    },
}];

export const isUiResource = (uri: string): boolean => Object.hasOwn(DISPLAY, uri);

const RESOURCE_TITLES: ReadonlyArray<readonly [string, string, string]> = [
    [UI_COMPANY, "company", "종목 요약"],
    [UI_FINANCIALS, "financials", "재무 추이"],
    [UI_PEERS, "peers", "피어 비교"],
    [UI_VALUATION, "valuation", "적정가 계산"],
    [UI_FILINGS, "filings", "최근 공시"],
    [UI_SCREEN, "screen", "종목 스크리너"],
    [UI_HOME, "home", "Hathway"],
    [UI_BOARDS, "boards", "리서치 보드"],
];

export const PLUGIN_SHAPE: McpSurfaceShape = {
    tools: TOOLS,
    resources: RESOURCE_TITLES.map(([uri, name, title]) => ({ uri, name, title, mimeType: UI_MIME })),
    resourcePrefixes: [COMPANY_PREFIX, BOARD_PREFIX],
    extensions: {},
};
