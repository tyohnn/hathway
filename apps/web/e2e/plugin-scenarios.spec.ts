import { expect, test, type FrameLocator, type Page } from "@playwright/test";

import { connect } from "./mcpConnect";
import { hostPage, isError, MODERN, said, sentFrom, structured, toolCall, type HostOptions, type Rpc } from "./pluginHost";

/**
 * 사용자 시나리오 다섯(`docs/plugin/시나리오와-화면-짜임.md`)을 로컬 스택에서 끝까지 밟는다. ChatGPT 가 하는 일을 손으로 한다.
 *
 *   도구를 부르고 → 그 도구의 화면 자원을 읽고 → 호스트를 흉내 낸 창에 결과를 넘기고 → 화면의 단추가 호스트에 무엇을 청하는지 본다
 *
 * 빈 화면 · 오류 · 느린 망은 시나리오의 갈림길로 함께 잰다. 찍은 사진은 `E2E_SCENARIO_SHOTS` 가 있을 때만 그 폴더에 남긴다.
 *
 * ⚠ 시드에는 상장사가 둘(크래프톤 · 에코프로비엠)뿐이라 업종이 같은 피어가 없다. 피어 표와 스크리너의 빈 화면이 여기서 선다.
 * ⚠ 보드를 담는 단계는 제 보드를 새로 연다. 시드의 보드를 고치지 않는다.
 */
const SHOTS = process.env["E2E_SCENARIO_SHOTS"];

const CRAFTON = "259960";

const VALUATION = {
    stockCode: CRAFTON,
    targetYear: 2028,
    revenue: { bear: 3_000_000_000_000, base: 3_600_000_000_000, bull: 4_200_000_000_000 },
    netMarginPct: { bear: 25, base: 30, bull: 33 },
    multiple: { low: 12, mid: 15, high: 18 },
    sharesOutstanding: 48_000_000,
    sharesSource: "e2e 의 본보기 값",
    currentPrice: 150_000,
    currentPriceSource: "e2e 의 본보기 값",
};

const RESOURCE: Readonly<Record<string, string>> = {
    show_company: "ui://hathway/company/v1",
    show_financials: "ui://hathway/financials/v1",
    compare_peers: "ui://hathway/peers/v1",
    value_company: "ui://hathway/valuation/v1",
    list_filings: "ui://hathway/filings/v1",
    screen_stocks: "ui://hathway/screen/v1",
    open_home: "ui://hathway/home/v1",
    open_boards: "ui://hathway/boards/v1",
};

/** 한 사람으로 연결하고, 화면 HTML 은 한 번만 읽어 둔다. 화면 자원은 모두 같은 HTML 한 장이다 */
const session = async (page: Page, request: Parameters<typeof connect>[1], email: string) =>
{
    const call = await connect(page, request, email) as unknown as Rpc;
    const read = await call({ id: 1000, method: "resources/read", params: { uri: RESOURCE["show_company"], _meta: MODERN } });
    const html = (read.result?.["contents"] as Array<{ text: string }> | undefined)?.[0]?.text ?? "";

    expect(html).toMatch(/^<!doctype html>/i);
    let id = 1;

    const ask = async (name: string, args: Record<string, unknown> = {}) => await call(toolCall(id++, name, args));

    /** 도구의 결과를 호스트 흉내 창에 띄우고 그 창의 화면을 돌려준다 */
    const show = async (answer: Awaited<ReturnType<typeof ask>>, input: Record<string, unknown>, options: HostOptions = {}): Promise<FrameLocator> =>
    {
        // 창을 비우고 다시 세운다. 같은 문서에 덮어쓰면 앞 화면의 iframe 이 새 창의 악수를 가로챈다
        await page.goto("about:blank");
        await page.setContent(hostPage(html, answer.result ?? {}, input, options));

        return page.frameLocator("#app");
    };

    return { ask, show };
};

const shoot = async (page: Page, name: string): Promise<void> =>
{
    if (SHOTS !== undefined)
    {
        await page.locator("#app").screenshot({ path: `${SHOTS}/${name}.png` });
    }
};

const lastSent = async (page: Page, method: string) =>
    (await sentFrom(page)).filter((message) => message.method === method).at(-1)?.params;

const textOf = (params: Record<string, unknown> | undefined): string =>
    ((params?.["content"] ?? []) as Array<{ text?: string }>).map((part) => part.text ?? "").join("");

test.describe.configure({ mode: "serial" });

test.describe("플러그인 시나리오", () =>
{
    test("S1 처음 쓰는 사람이 한 종목을 끝까지 판다", async ({ page, request }) =>
    {
        const { ask, show } = await session(page, request, "kim@example.test");

        // 1. 종목 요약 카드
        const company = await ask("show_company", { stockCode: CRAFTON });
        let app = await show(company, { stockCode: CRAFTON });

        await expect(app.getByText("크래프톤").first()).toBeVisible();
        await expect(app.locator("main[data-loading]")).toHaveCount(0);
        await shoot(page, "s1-1-company");

        // 2. 「분석 시작」은 사람이 쓴 것처럼 대화에 말을 보낸다
        await app.getByRole("button", { name: "분석 시작" }).click();
        await expect.poll(async () => textOf(await lastSent(page, "ui/message"))).toContain("크래프톤");

        // 피어 표. 시드에 같은 업종의 상장사가 없어 빈 화면이 선다
        const peers = await ask("compare_peers", { stockCode: CRAFTON });

        expect(isError(peers)).toBe(false);
        expect(said(peers)).toContain("withStockCodes");
        app = await show(peers, { stockCode: CRAFTON });
        await expect(app.getByText("크래프톤").first()).toBeVisible();
        await shoot(page, "s1-2-peers-empty");

        // 3 · 4. 적정가 카드와 9칸 크게 보기
        const valued = await ask("value_company", VALUATION);
        const view = structured<{ fairPrice: number; buyPrice: number }>(valued);

        expect(view.buyPrice).toBe(Math.floor(view.fairPrice / 3));
        app = await show(valued, VALUATION);
        await expect(app.getByText("매수가").first()).toBeVisible();
        await shoot(page, "s1-3-valuation");
        await app.getByRole("button", { name: "시나리오 9칸 보기" }).click();
        await expect.poll(async () => (await lastSent(page, "ui/request-display-mode"))?.["mode"]).toBe("fullscreen");
        await expect(app.getByText("시나리오 9칸").first()).toBeVisible();
        await shoot(page, "s1-4-valuation-full");

        // 5. 「보드에 담기」는 말을 보내고, 모델이 save_to_board 를 부른다
        await show(valued, VALUATION);
        await page.frameLocator("#app").getByRole("button", { name: "보드에 담기" }).click();
        await expect.poll(async () => textOf(await lastSent(page, "ui/message"))).toContain("보드");

        const saved = await ask("save_to_board", { stockCode: CRAFTON, title: "적정가 2028", body: `적정가 ${view.fairPrice}원` });

        expect(isError(saved)).toBe(false);
        expect(said(saved)).toContain("크래프톤 분석");
    });

    test("S2 업종에서 후보를 추린다. 맞는 곳이 없으면 빈 화면이 조건을 넓히라고 한다", async ({ page, request }) =>
    {
        const { ask, show } = await session(page, request, "kim@example.test");

        const found = await ask("screen_stocks", { minOpmPct: 0 });
        const rows = structured<{ total: number; rows: Array<{ company: { name: string } }> }>(found);

        expect(rows.total).toBeGreaterThan(0);

        let app = await show(found, { minOpmPct: 0 }, { displayMode: "fullscreen" });

        await expect(app.getByText(rows.rows[0]?.company.name ?? "–").first()).toBeVisible();

        // 줄을 골라 한꺼번에 대화에 더한다
        await app.getByRole("checkbox").first().check();
        await app.getByRole("button", { name: "대화에 추가" }).last().click();
        await expect.poll(async () => JSON.stringify(await lastSent(page, "ui/update-model-context") ?? {})).toContain(rows.rows[0]?.company.name ?? "–");
        await shoot(page, "s2-1-screen");

        const none = await ask("screen_stocks", { minOpmPct: 99, year: 2025 });

        expect(said(none)).toContain("조건을 넓혀");
        app = await show(none, { minOpmPct: 99 }, { displayMode: "fullscreen" });
        await expect(app.getByText("조건에 맞는 종목이 없어요.")).toBeVisible();
        await shoot(page, "s2-2-screen-empty");

        // 고른 둘을 견준다
        const compared = await ask("compare_peers", { stockCode: CRAFTON, withStockCodes: ["247540"] });

        expect(structured<{ rows: Array<unknown> }>(compared).rows.length).toBe(2);
    });

    test("S3 공시가 났다. 줄을 누르면 DART 원문을 브라우저로 연다", async ({ page, request }) =>
    {
        const { ask, show } = await session(page, request, "kim@example.test");
        const filings = await ask("list_filings", { stockCode: CRAFTON });
        const items = structured<{ items: Array<{ url: string }> }>(filings).items;

        expect(items.length).toBeGreaterThan(0);

        const app = await show(filings, { stockCode: CRAFTON });

        await app.getByRole("button", { name: /기업설명회/ }).first().click();
        await expect.poll(async () => String((await lastSent(page, "ui/open-link"))?.["url"] ?? "")).toContain("dart.fss.or.kr");
        await shoot(page, "s3-filings");
    });

    test("S4 사이드바 홈에서 둘러보고, S5 보드 서랍에서 이어 한다", async ({ page, request }) =>
    {
        const { ask, show } = await session(page, request, "kim@example.test");
        const home = await ask("open_home");
        let app = await show(home, {});

        await expect(app.getByText("크래프톤").first()).toBeVisible();
        await shoot(page, "s4-home");

        const tray = await ask("open_boards");

        app = await show(tray, {});
        await app.getByRole("button", { name: "대화에 추가" }).first().click();
        await expect.poll(async () => (await sentFrom(page)).some((message) => message.method === "ui/update-model-context")).toBe(true);
        await shoot(page, "s5-1-boards");

        // 비관적으로 다시 계산하면 턴마다 새 카드가 선다
        const again = await ask("value_company", { ...VALUATION, multiple: { low: 8, mid: 10, high: 12 } });

        expect(structured<{ fairPrice: number }>(again).fairPrice).toBeLessThan(structured<{ fairPrice: number }>(await ask("value_company", VALUATION)).fairPrice);
    });

    test("갈림길: 없는 종목 · 틀린 입력 · 적자 · 느린 망 · 호스트의 거절", async ({ page, request }) =>
    {
        const { ask, show } = await session(page, request, "kim@example.test");

        // 없는 종목과 틀린 입력은 모델이 읽고 고칠 글로 답한다
        const missing = await ask("show_company", { stockCode: "000000" });

        expect(isError(missing)).toBe(true);
        expect(said(missing)).toContain("find_company");
        expect(isError(await ask("value_company", { ...VALUATION, multiple: { low: 0, mid: 15, high: 18 } }))).toBe(false);
        expect(said(await ask("value_company", { ...VALUATION, multiple: { low: 0, mid: 15, high: 18 } }))).toContain("배수");

        // 적자면 카드가 까닭과 PSR 로 다시 하는 단추를 세운다
        const loss = await ask("value_company", { ...VALUATION, netMarginPct: { bear: -5, base: -1, bull: 3 } });
        let app = await show(loss, VALUATION);

        await app.getByRole("button", { name: "PSR로 계산해 줘" }).click();
        await expect.poll(async () => textOf(await lastSent(page, "ui/message"))).toContain("PSR");
        await shoot(page, "edge-1-refused");

        // 느린 망: 결과가 늦게 오면 같은 틀의 기다리는 얼굴이 먼저 서고, 오면 값으로 바뀐다
        const company = await ask("show_company", { stockCode: CRAFTON });

        app = await show(company, { stockCode: CRAFTON }, { resultDelayMs: 1500, toolName: "show_company" });
        await expect(app.locator("main[data-loading]")).toHaveCount(1);
        await expect(app.getByRole("button", { name: "분석 시작" })).toBeDisabled();
        await shoot(page, "edge-2-slow");
        await expect(app.locator("main[data-loading]")).toHaveCount(0, { timeout: 5000 });

        // 호스트가 말을 받지 않으면 화면이 직접 적으라고 알린다
        app = await show(company, { stockCode: CRAFTON }, { failMethods: ["ui/message"] });
        await app.getByRole("button", { name: "분석 시작" }).click();
        await expect(app.getByText("대화에 보내지 못했어요.", { exact: false })).toBeVisible();
        await shoot(page, "edge-3-host-refused");
    });
});
