import { Effect, Exit, Schema } from "effect";

import type { CompanyDirectory, FilingLedger, FinancialPeriods } from "@hathway/market/ports/MarketStore";
import type { ScreenFilters } from "@hathway/market/rules/universe";
import { valuate, type ValuationInput } from "@hathway/market/rules/valuation";
import type { BoardStore } from "@hathway/research/ports/BoardStore";
import { ownsBoard } from "@hathway/research/rules/edit";

import type { SurfaceCall, SurfaceOutcome, SurfaceRead } from "@/extensions/McpSurface";
import {
    company,
    companyFilings,
    companyWithPeriods,
    FINANCIAL_PERIOD_TYPES,
    PEER_LIMIT,
    peerTable,
    screenCompanies,
    searchCompanies,
} from "@/usecases/market";
import { boardsOf, openBoard, saveNoteToBoard } from "@/usecases/research";

import { isUiResource, uiContents } from "./surface";
import {
    boardMarkdown,
    boardsView,
    companySummary,
    companyView,
    DISCLAIMER,
    filingsView,
    financialsView,
    FINANCIAL_FIELD_KEYS,
    homeView,
    mentionItems,
    peersView,
    resourceOf,
    screenView,
    valuationView,
    wonText,
    type FinancialField,
} from "./views";

/**
 * 플러그인의 도구와 자원의 조립. 라우트가 세운 행위자를 받아 코어의 유스케이스(`usecases/market.ts` · `research.ts`)를 잇는다.
 *
 * ⚠ **시장 데이터는 행위자 없이 읽는다.** 공시된 숫자라 웹의 종목 화면처럼 누구에게나 같다. 토큰을 지난 사람이면 누구든 부른다.
 * ⚠ **보드는 이 사람의 테넌트 것만 담고 모은다.** 담기는 코어의 저장(`saveBoard`)을 지나 같은 판정(`editVerdict`)을 받는다(REQ-02).
 * ⚠ **인자는 밖에서 온 입력이다.** 모델이 지어낸 종목코드와 값이 올 수 있다. 스키마로 거른 뒤에만 유스케이스에 넘긴다.
 * ⚠ **모델이 읽는 글(`content`)에는 핵심 숫자와 출처와 다음 걸음만 싣는다.** 카드는 `structuredContent` 로 화면이 그린다.
 */
export interface PluginConfig
{
    /** 화면 자원이 내주는 HTML 한 장 */
    readonly appHtml: string;
    /** 새 보드와 노트의 식별자. 순수 규칙이 난수를 스스로 읽지 않게 밖에서 받는다 */
    readonly newId: (prefix: string) => string;
}

export type PluginStores = CompanyDirectory | FinancialPeriods | FilingLedger | BoardStore;

type Outcome = Effect.Effect<SurfaceOutcome, unknown, PluginStores>;

const text = (value: string): { readonly type: "text"; readonly text: string } => ({ type: "text", text: value });

const done = (message: string, structuredContent?: unknown): SurfaceOutcome => ({
    kind: "result",
    result: { content: [text(message)], ...(structuredContent === undefined ? {} : { structuredContent }), isError: false },
});

const failed = (message: string): SurfaceOutcome => ({ kind: "result", result: { content: [text(message)], isError: true } });

/** 스키마를 지나면 값, 아니면 `null` */
const decode = <S extends Schema.ConstraintDecoder<unknown>>(schema: S, input: unknown): S["Type"] | null =>
{
    const exit = Schema.decodeUnknownExit(schema)(input);

    return Exit.isSuccess(exit) ? exit.value : null;
};

const StockCode = Schema.String.check(Schema.isPattern(/^[0-9A-Z]{6}$/));

const Field = Schema.Literals(FINANCIAL_FIELD_KEYS);

const Scenarios = Schema.Struct({ bear: Schema.Finite, base: Schema.Finite, bull: Schema.Finite });

/** 피어 표의 줄 수 상한. 이름을 댄 종목도 이 수를 넘지 못한다 */
const PEER_LIMIT_MAX = 8;

/** 출처 한 줄. 화면과 모델의 글에 그대로 실리므로 길이를 막는다 */
const SourceText = Schema.String.check(Schema.isMaxLength(300));

const ValueArgs = Schema.Struct({
    stockCode: StockCode,
    targetYear: Schema.Int,
    method: Schema.optional(Schema.Literals(["per", "psr"])),
    revenue: Scenarios,
    netMarginPct: Scenarios,
    multiple: Schema.Struct({ low: Schema.Finite, mid: Schema.Finite, high: Schema.Finite }),
    sharesOutstanding: Schema.Finite,
    sharesSource: Schema.optional(SourceText),
    currentPrice: Schema.optional(Schema.Finite),
    currentPriceSource: Schema.optional(SourceText),
});

const ScreenArgs = Schema.Struct({
    sectorPrefix: Schema.optional(Schema.String.check(Schema.isPattern(/^[0-9]{2,5}$/))),
    market: Schema.optional(Schema.Literals(["KOSPI", "KOSDAQ"])),
    minOpmPct: Schema.optional(Schema.Finite),
    minRoePct: Schema.optional(Schema.Finite),
    minRevenueCagrPct: Schema.optional(Schema.Finite),
    minRevenue: Schema.optional(Schema.Finite),
    sortBy: Schema.optional(Schema.Literals(["opm", "roe", "revenueCagr", "revenue"])),
    year: Schema.optional(Schema.Int),
    limit: Schema.optional(Schema.Int),
});

const SaveArgs = Schema.Struct({
    stockCode: StockCode,
    title: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200)),
    body: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(20_000)),
    boardSlug: Schema.optional(Schema.String.check(Schema.isMaxLength(120))),
});

const stringArg = (value: unknown): string => (typeof value === "string" ? value : "");

const intArg = (value: unknown, fallback: number, min: number, max: number): number =>
    (typeof value === "number" && Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback);

const fieldsArg = (value: unknown): ReadonlyArray<FinancialField> =>
    (Array.isArray(value) ? value.flatMap((each) => decode(Field, each) ?? []) : []);

const stockCodeArg = (call: SurfaceCall): string | null => decode(StockCode, call.args["stockCode"]);

const NO_STOCK = "종목코드를 알 수 없어요. find_company 로 먼저 종목코드를 찾아 주세요."; // ux-writing: 모델이 읽는 답

const notFound = (stockCode: string): SurfaceOutcome => failed(`종목코드 ${stockCode} 인 회사가 없어요. find_company 로 다시 찾아 주세요.`); // ux-writing: 모델이 읽는 답

const FIND_LIMIT = 8;

const findCompany = (call: SurfaceCall): Outcome =>
    Effect.map(searchCompanies(stringArg(call.args["query"]), FIND_LIMIT), (hits) =>
    {
        if (hits.length === 0)
        {
            return done("맞는 종목이 없어요. 다른 이름이나 종목코드로 찾아 주세요."); // ux-writing: 모델이 읽는 답
        }

        const lines = hits.map((hit) => `- ${hit.name} (${hit.stock_code}, ${hit.market ?? "비상장"})`).join("\n");

        return done(hits.length === 1
            ? `찾았어요.\n${lines}\nshow_company 로 요약을 보여 줄 수 있어요.`
            : `${hits.length}곳이 맞아요. 어느 회사인지 사용자에게 물어보세요.\n${lines}`, { companies: hits.map((hit) => ({ stockCode: hit.stock_code, name: hit.name, market: hit.market })) });
    });

const showCompany = (call: SurfaceCall): Outcome =>
    Effect.gen(function*()
    {
        const stockCode = stockCodeArg(call);

        if (stockCode === null)
        {
            return failed(NO_STOCK);
        }

        const found = yield* companyWithPeriods(stockCode, ["A", "TTM"]);

        if (found === null)
        {
            return notFound(stockCode);
        }

        const view = companyView(found.company, found.rows);

        return done(`${companySummary(view)}\n다음: 매출 추이(show_financials) · 피어 비교(compare_peers) · 적정가(value_company). ${DISCLAIMER}`, view);
    });

const financialsOutcome = (stockCode: string, basis: "annual" | "quarter", fields: ReadonlyArray<FinancialField>): Outcome =>
    Effect.gen(function*()
    {
        const found = yield* companyWithPeriods(stockCode, FINANCIAL_PERIOD_TYPES);

        if (found === null)
        {
            return notFound(stockCode);
        }

        const view = financialsView(found.company, found.rows, basis, fields);
        const lines = view.series.map((series) =>
            `${series.label}: ${series.points.map((point) => `${point.label} ${series.unit === "won" ? wonText(point.value) : point.value === null ? "–" : `${point.value}%`}`).join(", ")}`);

        return done(`${found.company.name} ${basis === "annual" ? "연간" : "분기"} 추이\n${lines.join("\n")}\n출처: ${view.source}. ${DISCLAIMER}`, view);
    });

const showFinancials = (call: SurfaceCall): Outcome =>
{
    const stockCode = stockCodeArg(call);

    return stockCode === null
        ? Effect.succeed(failed(NO_STOCK))
        : financialsOutcome(stockCode, call.args["basis"] === "quarter" ? "quarter" : "annual", fieldsArg(call.args["series"]));
};

const comparePeers = (call: SurfaceCall): Outcome =>
    Effect.gen(function*()
    {
        const stockCode = stockCodeArg(call);

        if (stockCode === null)
        {
            return failed(NO_STOCK);
        }

        const withStockCodes = Array.isArray(call.args["withStockCodes"])
            ? call.args["withStockCodes"].flatMap((each) => decode(StockCode, each) ?? []).slice(0, PEER_LIMIT_MAX)
            : [];
        const table = yield* peerTable(stockCode, { withStockCodes, limit: intArg(call.args["limit"], PEER_LIMIT, 1, PEER_LIMIT_MAX) });

        if (table === null)
        {
            return notFound(stockCode);
        }

        const view = peersView(table.focus, table.year, table.rows);
        const lines = view.rows.map((row) =>
            `- ${row.company.name}: 매출 ${wonText(row.revenue)}, 영업이익률 ${row.opmPct ?? "–"}%, ROE ${row.roePct ?? "–"}%`);

        return done(view.rows.length <= 1
            ? `${table.focus.name}와 견줄 상장 피어를 찾지 못했어요. withStockCodes 로 비교할 회사를 넣어 주세요.`
            : `${view.title} · ${view.period}\n${lines.join("\n")}\n출처: ${view.source}. 피어는 업종 코드로 넓게 고른 후보라 사용자와 함께 추려 주세요. ${DISCLAIMER}`, view);
    });

const valueCompany = (call: SurfaceCall): Outcome =>
    Effect.gen(function*()
    {
        const args = decode(ValueArgs, call.args);

        if (args === null)
        {
            return failed("적정가 입력이 맞지 않아요. 매출 · 순이익률 · 배수의 세 갈래와 발행주식수를 숫자로 넣어 주세요."); // ux-writing: 모델이 읽는 답
        }

        const found = yield* company(args.stockCode);

        if (found === null)
        {
            return notFound(args.stockCode);
        }

        const input: ValuationInput = {
            targetYear: args.targetYear,
            sharesOutstanding: args.sharesOutstanding,
            method: args.method ?? "per",
            revenue: args.revenue,
            netMarginPct: args.netMarginPct,
            multiple: args.multiple,
            currentPrice: args.currentPrice ?? null,
        };
        const outcome = valuate(input);
        const view = valuationView(found, input, outcome, { currentPrice: args.currentPriceSource ?? null, shares: args.sharesSource ?? null });

        if (view.refusal !== null)
        {
            return done(view.refusal, view);
        }

        const gap = view.gapToBuyPct === null ? "오늘 주가를 넣지 않아 거리는 재지 않았어요." : `오늘 주가는 매수가보다 ${view.gapToBuyPct}% ${view.gapToBuyPct >= 0 ? "위" : "아래"}예요.`;

        return done(`${found.name} ${view.targetYear}년 기준 적정가 ${view.fairPrice?.toLocaleString("ko-KR") ?? "–"}원, 매수가(÷3) ${view.buyPrice?.toLocaleString("ko-KR") ?? "–"}원. ${gap}\n`
            + `가정: ${view.assumptions.join(" / ")}\n출처: ${view.source}. ${DISCLAIMER}`, view);
    });

const FILING_LIMIT = 10;

/** 고른 갈래가 드문 공시(지분 · 주요사항)여도 한도가 차도록 넉넉히 읽은 뒤 거른다 */
const FILING_READ = 100;

const listFilings = (call: SurfaceCall): Outcome =>
    Effect.gen(function*()
    {
        const stockCode = stockCodeArg(call);

        if (stockCode === null)
        {
            return failed(NO_STOCK);
        }

        const found = yield* companyFilings(stockCode, FILING_READ);

        if (found === null)
        {
            return notFound(stockCode);
        }

        const kind = call.args["kind"] === "regular" || call.args["kind"] === "major" || call.args["kind"] === "ownership" ? call.args["kind"] : "all";
        const view = filingsView(found.company, found.filings, kind, intArg(call.args["limit"], FILING_LIMIT, 1, 30));
        const lines = view.items.map((item) => `- ${item.date} ${item.title} (${item.url})`);

        return done(view.items.length === 0
            ? `${found.company.name}의 그 갈래 공시가 없어요.`
            : `${found.company.name} 최근 공시 ${view.items.length}건\n${lines.join("\n")}\n출처: ${view.source}.`, view);
    });

const SCREEN_LIMIT = 20;

const screenStocks = (call: SurfaceCall): Outcome =>
    Effect.gen(function*()
    {
        const args = decode(ScreenArgs, call.args);

        if (args === null)
        {
            return failed("스크리너 조건이 맞지 않아요. 업종 코드는 숫자 두~다섯 자리, 비율은 퍼센트 수로 넣어 주세요."); // ux-writing: 모델이 읽는 답
        }

        const year = args.year ?? call.now.getUTCFullYear() - 1;
        const filters: ScreenFilters = {
            ...(args.sectorPrefix === undefined ? {} : { sectorPrefix: args.sectorPrefix }),
            ...(args.market === undefined ? {} : { market: args.market }),
            ...(args.minOpmPct === undefined ? {} : { minOpmPct: args.minOpmPct }),
            ...(args.minRoePct === undefined ? {} : { minRoePct: args.minRoePct }),
            ...(args.minRevenueCagrPct === undefined ? {} : { minRevenueCagrPct: args.minRevenueCagrPct }),
            ...(args.minRevenue === undefined ? {} : { minRevenue: args.minRevenue }),
            sortBy: args.sortBy ?? "opm",
            limit: intArg(args.limit, SCREEN_LIMIT, 1, 50),
        };
        const view = screenView(filters, year, yield* screenCompanies(filters, year));
        const lines = view.rows.slice(0, 10).map((row) =>
            `- ${row.company.name} (${row.company.stockCode}): 영업이익률 ${row.opmPct ?? "–"}%, 3년 CAGR ${row.revenueCagrPct ?? "–"}%`);

        return done(view.total === 0
            ? `조건(${view.filters.join(" · ")})에 맞는 상장사가 없어요. 조건을 넓혀 보세요.`
            : `조건(${view.filters.join(" · ")})에 맞는 상장사 ${view.total}곳\n${lines.join("\n")}\n출처: ${view.source}. ${DISCLAIMER}`, view);
    });

/** 홈에 처음 서는 종목. 아직 사람마다 최근에 본 것을 적지 않아서 시드에 있는 두 종목을 둔다 */
export const FEATURED_STOCK_CODES: ReadonlyArray<string> = ["259960", "247540"];

const openHome = (call: SurfaceCall): Outcome =>
    Effect.gen(function*()
    {
        const boards = yield* boardsOf(call.actor, "stocks");
        const featured = yield* Effect.all(FEATURED_STOCK_CODES.map((stockCode) => companyWithPeriods(stockCode, ["A", "TTM"])));
        const view = homeView(true, boards, featured.flatMap((each) => (each === null ? [] : [each])));

        return done(`Hathway 기업분석 홈을 열었어요. 보드 ${view.boards.length}개. 종목 이름을 말하면 요약 카드부터 보여 줄 수 있어요.`, view);
    });

const openBoardsPanel = (call: SurfaceCall): Outcome =>
    Effect.map(boardsOf(call.actor, "stocks"), (boards) =>
    {
        const view = boardsView(true, boards);

        return done(view.boards.length === 0
            ? "아직 리서치 보드가 없어요. 분석을 마치고 save_to_board 로 담을 수 있어요."
            : `리서치 보드 ${view.boards.length}개: ${view.boards.map((board) => `${board.title}(${board.slug})`).join(", ")}`, view);
    });

const saveToBoard = (call: SurfaceCall, config: PluginConfig): Outcome =>
    Effect.gen(function*()
    {
        const args = decode(SaveArgs, call.args);

        if (args === null)
        {
            return failed("담을 노트의 제목과 내용을 넣어 주세요."); // ux-writing: 모델이 읽는 답
        }

        const found = yield* company(args.stockCode);

        if (found === null)
        {
            return notFound(args.stockCode);
        }

        const saved = yield* saveNoteToBoard(call.actor, {
            slug: args.boardSlug ?? null,
            boardTitle: `${found.name} 분석`,
            ...(found.stock_code === null ? {} : { relatedStockCode: found.stock_code }),
            note: { groupTitle: found.name, title: args.title, body: args.body },
        }, config.newId);

        if (!saved.ok)
        {
            return failed(saved.message);
        }

        return done(`「${saved.board.title}」 보드에 담았어요.`, { boardSlug: saved.board.slug, boardTitle: saved.board.title });
    });

const browseCompany = (call: SurfaceCall): Outcome =>
{
    const stockCode = stockCodeArg(call);

    if (stockCode === null)
    {
        return Effect.succeed(failed(NO_STOCK));
    }

    return call.args["view"] === "financials"
        ? financialsOutcome(stockCode, call.args["basis"] === "quarter" ? "quarter" : "annual", fieldsArg(call.args["series"]))
        : showCompany(call);
};

const MENTION_COMPANIES = 12;

const searchMentions = (call: SurfaceCall): Outcome =>
    Effect.gen(function*()
    {
        const query = stringArg(call.args["query"]);
        const [companies, boards] = yield* Effect.all([searchCompanies(query, MENTION_COMPANIES), boardsOf(call.actor, "stocks")]);

        return { kind: "result", result: { content: [], structuredContent: { items: mentionItems(companies, boards, query) }, isError: false } } as const;
    });

export const callTool = (call: SurfaceCall, config: PluginConfig): Outcome =>
{
    switch (call.name)
    {
        case "find_company":
            return findCompany(call);

        case "show_company":
            return showCompany(call);

        case "show_financials":
            return showFinancials(call);

        case "compare_peers":
            return comparePeers(call);

        case "value_company":
            return valueCompany(call);

        case "list_filings":
            return listFilings(call);

        case "screen_stocks":
            return screenStocks(call);

        case "open_home":
            return openHome(call);

        case "open_boards":
            return openBoardsPanel(call);

        case "save_to_board":
            return saveToBoard(call, config);

        case "browse_company":
            return browseCompany(call);

        case "search_mentions":
            return searchMentions(call);

        default:
            return Effect.succeed(failed(`모르는 도구다: ${call.name}`)); // ux-writing: 봉투가 걸러서 닿지 않는 자리의 프로토콜 오류
    }
};

/**
 * 자원을 읽는다. 화면 자원은 누구에게나 같은 틀이고, 멘션으로 붙은 종목은 요약 글을, 보드는 그 보드의 글을 낸다.
 *
 * ⚠ **보드는 이 사람의 테넌트 것만 읽는다.** 보드는 웹에서 누구에게나 보이지만, 멘션은 「내 보드」에서 고른 것이라 같은 술어로 다시 잰다.
 */
export const readResource = (
    read: SurfaceRead,
    config: PluginConfig,
): Effect.Effect<ReadonlyArray<Record<string, unknown>> | null, unknown, PluginStores> =>
{
    if (isUiResource(read.uri))
    {
        return Effect.succeed(uiContents(read.uri, config.appHtml));
    }

    const target = resourceOf(read.uri);

    if (target === null)
    {
        return Effect.succeed(null);
    }

    if (target.kind === "company")
    {
        return Effect.map(companyWithPeriods(target.key, ["A", "TTM"]), (found) =>
            (found === null ? null : [{ uri: read.uri, mimeType: "text/markdown", text: `# ${found.company.name}\n\n${companySummary(companyView(found.company, found.rows))}` }]));
    }

    return Effect.map(openBoard(target.key), (board) =>
        (board === null || !ownsBoard(read.actor, board) ? null : [{ uri: read.uri, mimeType: "text/markdown", text: boardMarkdown(board) }]));
};
