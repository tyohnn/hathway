import { assert, describe, it } from "vitest";

import { mcpPlan } from "@/lib/mcp";

import {
    PLUGIN_SHAPE,
    UI_BOARDS,
    UI_COMPANY,
    UI_FILINGS,
    UI_FINANCIALS,
    UI_HOME,
    UI_MIME,
    UI_PEERS,
    UI_SCREEN,
    UI_VALUATION,
    uiContents,
} from "./surface";

const tool = (name: string) =>
{
    const found = PLUGIN_SHAPE.tools.find((each) => each.name === name);

    assert.isDefined(found, name);

    return found as NonNullable<typeof found>;
};

const metaOf = (name: string, key: string): Record<string, unknown> => (tool(name)._meta?.[key] ?? {}) as Record<string, unknown>;

const SCREENS: ReadonlyArray<readonly [string, string]> = [
    ["show_company", UI_COMPANY],
    ["show_financials", UI_FINANCIALS],
    ["compare_peers", UI_PEERS],
    ["value_company", UI_VALUATION],
    ["list_filings", UI_FILINGS],
    ["screen_stocks", UI_SCREEN],
    ["open_home", UI_HOME],
    ["open_boards", UI_BOARDS],
];

describe("플러그인이 MCP 에 더하는 것", () =>
{
    it("도구 지도의 열둘이 선다", () =>
    {
        assert.deepStrictEqual(PLUGIN_SHAPE.tools.map((each) => each.name), [
            "find_company", "show_company", "show_financials", "compare_peers", "value_company", "list_filings", "screen_stocks",
            "open_home", "open_boards", "save_to_board", "browse_company", "search_mentions",
        ]);
    });

    it("화면을 그리는 도구마다 제 ui:// 주소가 있고, 주소는 모두 화면 자원 목록에 있다", () =>
    {
        const listed = PLUGIN_SHAPE.resources.map((resource) => resource.uri);

        for (const [name, uri] of SCREENS)
        {
            assert.strictEqual(metaOf(name, "ui")["resourceUri"], uri, name);
            assert.include(listed, uri);
        }

        assert.deepStrictEqual(PLUGIN_SHAPE.resources.map((resource) => resource.mimeType), SCREENS.map(() => UI_MIME));
    });

    it("글로 답하는 도구는 화면을 선언하지 않는다", () =>
    {
        for (const name of ["find_company", "save_to_board"])
        {
            assert.isUndefined(metaOf(name, "ui")["resourceUri"], name);
        }
    });

    it("홈은 global 진입점과 「종목 분석 시작」 바로 가기를, 보드는 thread 진입점을 선언한다", () =>
    {
        const home = metaOf("open_home", "openai/ui")["entrypoints"] as ReadonlyArray<Record<string, unknown>>;
        const quickAction = home[0]?.["quickAction"] as { title: string; target: { type: string; name: string } };

        assert.strictEqual(home[0]?.["type"], "global");
        assert.strictEqual(quickAction.title, "종목 분석 시작");
        assert.isDefined(PLUGIN_SHAPE.tools.find((each) => each.name === quickAction.target.name), "바로 가기가 부르는 도구가 목록에 있어야 한다");
        assert.deepStrictEqual(metaOf("open_boards", "openai/ui")["entrypoints"], [{ type: "thread" }]);
    });

    it("진입점 도구는 빈 인자로 불려도 답하고, 아이콘과 사람이 읽는 제목이 있다", () =>
    {
        for (const name of ["open_home", "open_boards"])
        {
            assert.notProperty(tool(name).inputSchema, "required", name);
            assert.strictEqual(mcpPlan({ id: 1, method: "tools/call", params: { name, arguments: {} } }, PLUGIN_SHAPE).kind, "surface-call");
            assert.isAbove(tool(name).icons?.length ?? 0, 0, name);
            assert.notStrictEqual(tool(name).title ?? "", "", name);
        }
    });

    it("읽기만 하는 도구는 readOnlyHint 이고, 보드에 담는 도구만 쓴다", () =>
    {
        const writers = PLUGIN_SHAPE.tools.filter((each) => each.annotations?.["readOnlyHint"] !== true).map((each) => each.name);

        assert.deepStrictEqual(writers, ["save_to_board"]);
    });

    it("모델이 읽는 설명은 영어이고 비어 있지 않다. 사람이 보는 제목은 한국어다", () =>
    {
        for (const each of PLUGIN_SHAPE.tools.filter((candidate) => candidate.description !== undefined))
        {
            assert.notMatch(each.description ?? "", /[가-힣]/, each.name);
            assert.isAbove((each.description ?? "").length, 40, each.name);
        }

        assert.match(tool("show_company").title ?? "", /[가-힣]/);
    });

    it("스크리너와 홈은 전체 화면을, 카드는 대화 안을 먼저 청한다", () =>
    {
        const preferred = (uri: string) => ((uiContents(uri, "<!doctype html>")[0]?.["_meta"] as Record<string, Record<string, unknown>>)["openai/ui"])?.["preferredDisplayMode"];

        assert.deepStrictEqual([UI_SCREEN, UI_HOME].map(preferred), ["fullscreen", "fullscreen"]);
        assert.deepStrictEqual([UI_COMPANY, UI_VALUATION, UI_BOARDS].map(preferred), ["inline", "inline", "inline"]);
        assert.strictEqual(uiContents(UI_COMPANY, "<!doctype html>")[0]?.["text"], "<!doctype html>");
    });

    it("화면 자원은 밖의 주소를 하나도 부르지 않는다. 틀에 든 것만으로 선다", () =>
    {
        const ui = (uiContents(UI_COMPANY, "")[0]?.["_meta"] as Record<string, unknown>)["ui"] as { csp: Record<string, ReadonlyArray<string>> };

        assert.deepStrictEqual(ui.csp, { connectDomains: [], resourceDomains: [] });
    });

    it("앱만 부르는 도구는 visibility 가 app 뿐이다. 모델의 목록에 서지 않는다", () =>
    {
        for (const name of ["search_mentions", "browse_company"])
        {
            assert.deepStrictEqual(metaOf(name, "ui")["visibility"], ["app"], name);
        }
    });

    it("멘션 도구는 mentions/search 를 선언하고, 멘션이 돌려주는 주소의 앞머리를 자원으로 받는다", () =>
    {
        assert.deepStrictEqual(tool("search_mentions")._meta?.["openai/extensions"], { "mentions/search": {} });
        assert.deepStrictEqual(PLUGIN_SHAPE.resourcePrefixes, ["company://", "board://"]);
    });

    it("도구의 인자에 테넌트나 계정이 없다. 누구의 눈으로 도는지는 토큰이 정한다", () =>
    {
        const properties = PLUGIN_SHAPE.tools.flatMap((each) => Object.keys((each.inputSchema["properties"] ?? {}) as Record<string, unknown>));

        assert.notInclude(properties, "tenantId");
        assert.notInclude(properties, "accountId");
    });

    it("적정가 도구는 주가와 발행주식수를 인자로 받는다. DB 에 없는 값이다", () =>
    {
        const properties = Object.keys(tool("value_company").inputSchema["properties"] as Record<string, unknown>);

        assert.includeMembers(properties, ["sharesOutstanding", "sharesSource", "currentPrice", "currentPriceSource"]);
        assert.include(tool("value_company").inputSchema["required"] as ReadonlyArray<string>, "sharesOutstanding");
    });
});
