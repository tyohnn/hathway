import { expect, test, type Page } from "@playwright/test";

import { connect } from "./mcpConnect";
import { hostPage, MODERN, said, structured, toolCall, type Rpc } from "./pluginHost";

/**
 * 플러그인이 로컬 스택에서 끝까지 도는가. ChatGPT 가 하는 일을 손으로 밟는다.
 *
 *   1. 토큰으로 도구 목록을 받으면 화면 자원과 진입점이 달려 온다
 *   2. 종목 도구와 적정가 도구가 시드의 크래프톤(259960)을 화면 모양으로 내준다
 *   3. 화면 자원(`ui://`)을 읽으면 구운 HTML 이 캐시 칸과 함께 오고, 호스트를 흉내 낸 창 안에서 받은 결과로 그린다
 *   4. 보드에 담기는 자기 조직의 보드에만 된다
 *
 * ⚠ **실물 ChatGPT 는 여기 없다.** 이 파일이 재는 것은 우리 서버와 화면이 스펙대로 말하는가다. 호스트가 그 말을
 *    알아듣는지는 개발자 모드로 붙여 본 사람이 확인한다.
 * ⚠ 보드를 담는 스펙은 제 보드를 새로 연다. 시드의 보드를 고치지 않는다.
 */
const connectAs = async (page: Page, request: Parameters<typeof connect>[1], email: string): Promise<Rpc> =>
    await connect(page, request, email) as unknown as Rpc;

interface Tool { name: string; title?: string; _meta?: Record<string, unknown> }

const VALUATION = {
    stockCode: "259960",
    targetYear: 2028,
    revenue: { bear: 3_000_000_000_000, base: 3_600_000_000_000, bull: 4_200_000_000_000 },
    netMarginPct: { bear: 25, base: 30, bull: 33 },
    multiple: { low: 12, mid: 15, high: 18 },
    sharesOutstanding: 48_000_000,
    sharesSource: "e2e 의 본보기 값",
    currentPrice: 150_000,
    currentPriceSource: "e2e 의 본보기 값",
};

test.describe("플러그인", () =>
{
    test("도구 목록에 종목 도구가 화면 자원을 달고 서고, 홈은 사이드바의 진입점이다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const listed = await call({ id: 1, method: "tools/list", params: { _meta: MODERN } });
        const tools = listed.result?.["tools"] as Array<Tool>;
        const named = (name: string): Tool | undefined => tools.find((tool) => tool.name === name);
        const home = named("open_home")?._meta?.["openai/ui"] as { entrypoints: Array<{ type: string; quickAction?: { target: { name: string } } }> };

        for (const name of ["find_company", "show_company", "show_financials", "compare_peers", "value_company", "list_filings", "screen_stocks", "open_home", "open_boards", "save_to_board"])
        {
            expect(named(name), name).toBeDefined();
        }

        expect((named("show_company")?._meta?.["ui"] as { resourceUri: string }).resourceUri).toBe("ui://hathway/company/v1");
        expect(home.entrypoints[0]?.type).toBe("global");
        expect(home.entrypoints[0]?.quickAction?.target.name).toBe("open_home");
        expect([listed.result?.["ttlMs"], listed.result?.["cacheScope"]]).toEqual([0, "private"]);
    });

    test("종목 요약은 시드의 크래프톤을 TTM 과 연간 숫자로 그릴 모양으로 내준다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const answer = await call(toolCall(1, "show_company", { stockCode: "259960" }));
        const view = structured<{ page: string; company: { stockCode: string; name: string }; headline: Array<{ key: string; value: number | null }>; revenue: Array<{ value: number | null }>; source: string }>(answer);

        expect(answer.result?.["isError"]).not.toBe(true);
        expect([view.page, view.company.stockCode, view.company.name]).toEqual(["company", "259960", "크래프톤"]);
        expect(view.headline.map((metric) => metric.key)).toEqual(["revenue", "opm_pct", "roe_pct"]);
        expect(view.headline[0]?.value).toBeGreaterThan(0);
        expect(view.revenue.length).toBeGreaterThan(0);
        expect(view.source).toContain("DART");
        expect(said(answer)).toContain("크래프톤");
    });

    test("적정가는 넣은 시나리오로 9칸을 채우고 매수가는 적정가의 3분의 1이다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const answer = await call(toolCall(1, "value_company", VALUATION));
        const view = structured<{ page: string; method: string; fairPrice: number; buyPrice: number; gapToBuyPct: number; cells: Array<unknown>; refusal: string | null }>(answer);

        // 3.6조 × 30% × 15배 ÷ 4,800만 주
        expect([view.page, view.method, view.refusal]).toEqual(["valuation", "per", null]);
        expect([view.fairPrice, view.buyPrice]).toEqual([337_500, 112_500]);
        expect(view.cells).toHaveLength(9);
        expect(view.gapToBuyPct).toBeCloseTo(33.3, 1);
    });

    test("홈은 진입점 도구로 열리고 내 보드와 바로 볼 종목을 내준다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const view = structured<{ page: string; signedIn: boolean; companies: Array<{ stockCode: string }> }>(await call(toolCall(1, "open_home")));

        expect([view.page, view.signedIn]).toEqual(["home", true]);
        expect(view.companies.map((company) => company.stockCode)).toContain("259960");
    });

    test("화면 자원은 구운 HTML 을 캐시 칸과 함께 내주고, 호스트 흉내 안에서 받은 결과로 그린다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const read = await call({ id: 1, method: "resources/read", params: { uri: "ui://hathway/company/v1", _meta: MODERN } });
        const contents = read.result?.["contents"] as Array<{ mimeType: string; text: string; _meta: Record<string, unknown> }>;
        const shown = await call(toolCall(2, "show_company", { stockCode: "259960" }));

        expect([read.result?.["ttlMs"], read.result?.["cacheScope"]]).toEqual([0, "private"]);
        expect(contents[0]?.mimeType).toBe("text/html;profile=mcp-app");
        expect(contents[0]?.text).toMatch(/^<!doctype html>/i);
        expect(contents[0]?._meta["ui"]).toEqual({ csp: { connectDomains: [], resourceDomains: [] } });

        await page.setContent(hostPage(contents[0]?.text ?? "", shown.result ?? {}, { stockCode: "259960" }));
        await expect(page.frameLocator("#app").getByText("크래프톤").first()).toBeVisible();

        const sent = await page.evaluate(() => (window as unknown as { sent: Array<{ method?: string }> }).sent.map((message) => message.method));

        expect(sent).toContain("ui/initialize");
    });

    test("INV-RESEARCH-02 보드에 담기는 내 조직의 보드에만 되고, 다른 조직의 보드는 없는 것으로 답한다", async ({ page, request }) =>
    {
        const park = await connectAs(page, request, "park@example.test");
        const parks = structured<{ boardSlug: string }>(await park(toolCall(1, "save_to_board", { stockCode: "259960", title: "고객사 B 의 메모", body: "남의 보드" })));

        await page.context().clearCookies();

        const kim = await connectAs(page, request, "kim@example.test");
        const refused = await kim(toolCall(2, "save_to_board", { stockCode: "259960", title: "끼어들기", body: "담기면 안 된다", boardSlug: parks.boardSlug }));
        const saved = await kim(toolCall(3, "save_to_board", { stockCode: "259960", title: "적정가 2028", body: "적정가 337,500원 · 매수가 112,500원" }));
        const boards = structured<{ boards: Array<{ slug: string }> }>(await kim(toolCall(4, "open_boards")));
        const mine = structured<{ boardSlug: string; boardTitle: string }>(saved);

        expect(refused.result?.["isError"]).toBe(true);
        expect(said(refused)).toContain("찾을 수 없어요");
        expect(saved.result?.["isError"]).not.toBe(true);
        expect(mine.boardTitle).toBe("크래프톤 분석");
        expect(boards.boards.map((board) => board.slug)).toContain(mine.boardSlug);
        expect(boards.boards.map((board) => board.slug)).not.toContain(parks.boardSlug);
    });
});
