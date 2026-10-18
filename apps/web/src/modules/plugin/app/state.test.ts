import { describe, expect, it } from "vitest";

import { INITIAL, modelContextFor, reduce, viewOf } from "./state";

const company = { stockCode: "259960", name: "크래프톤", market: "KOSPI", sector: "소프트웨어 개발 및 공급업" };

describe("화면의 상태", () =>
{
    it("호스트가 알린 능력만 단추로 연다", () =>
    {
        const state = reduce(INITIAL, { type: "host-ready", capabilities: { message: {}, openLinks: {} }, context: { theme: "dark", displayMode: "inline" } });

        expect(state.abilities).toEqual({ message: true, modelContext: false, openLink: true });
        expect(state.theme).toBe("dark");
    });

    it("결과가 오기 전에는 띄운 도구의 이름으로 화면을 짐작한다", () =>
    {
        const state = reduce(INITIAL, { type: "host-ready", capabilities: {}, context: { toolInfo: { tool: { name: "value_company" } } } });

        expect(state.expected).toBe("valuation");
        expect(state.view).toBeNull();
    });

    it("모양이 틀린 결과는 버리고 화면을 그대로 둔다", () =>
    {
        expect(viewOf({ page: "company", company, headline: "x" })).toBeNull();
        expect(viewOf({ page: "nope" })).toBeNull();
        expect(reduce(INITIAL, { type: "tool-result", result: { structuredContent: { page: "peers" } } })).toBe(INITIAL);
    });

    it("맞는 결과를 받으면 그 화면이 된다", () =>
    {
        const result = { structuredContent: { page: "filings", company, items: [], source: "DART" } };

        expect(reduce(INITIAL, { type: "tool-result", result }).view?.page).toBe("filings");
    });

    it("대화에 추가는 다시 누르면 뗀다. 붙인 것 모두를 한 번에 보낸다", () =>
    {
        const item = { key: "company:259960", title: "크래프톤", text: "## 크래프톤" };
        const other = { key: "board:game", title: "게임", text: "## 게임" };
        const once = reduce(reduce(INITIAL, { type: "toggle-context", item }), { type: "toggle-context", item: other });

        expect(modelContextFor(once.added).content.map((block) => block.text)).toEqual(["## 크래프톤", "## 게임"]);
        expect(reduce(once, { type: "toggle-context", item }).added).toEqual([other]);
    });
});
