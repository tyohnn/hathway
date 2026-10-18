import { assert, describe, it } from "vitest";

import { mcpPlan } from "@/lib/mcp";

import { FILE_EXTENSIONS, PLUGIN_SHAPE, UI_FILE, UI_LIBRARY, UI_MIME, UI_TRAY, uiContents } from "./surface";

const tool = (name: string) =>
{
    const found = PLUGIN_SHAPE.tools.find((each) => each.name === name);

    assert.isDefined(found, name);

    return found as NonNullable<typeof found>;
};

const metaOf = (name: string, key: string): Record<string, unknown> => (tool(name)._meta?.[key] ?? {}) as Record<string, unknown>;

describe("플러그인이 MCP 에 더하는 것", () =>
{
    it("보관함은 global 진입점과 바로 가기를, 서랍은 thread 진입점을 선언한다", () =>
    {
        const library = metaOf("open_library", "openai/ui")["entrypoints"] as ReadonlyArray<Record<string, unknown>>;
        const quickAction = library[0]?.["quickAction"] as { target: { type: string; name: string } };

        assert.strictEqual(library[0]?.["type"], "global");
        assert.strictEqual(quickAction.target.type, "tool");
        assert.isDefined(PLUGIN_SHAPE.tools.find((each) => each.name === quickAction.target.name), "바로 가기가 부르는 도구가 목록에 있어야 한다");
        assert.deepStrictEqual(metaOf("open_tray", "openai/ui")["entrypoints"], [{ type: "thread" }]);
        assert.strictEqual(metaOf("open_library", "ui")["resourceUri"], UI_LIBRARY);
        assert.strictEqual(metaOf("open_tray", "ui")["resourceUri"], UI_TRAY);
    });

    it("진입점 도구는 빈 인자로 불려도 답한다. 사이드바에서 열 때 {} 가 온다", () =>
    {
        for (const name of ["open_library", "open_tray"])
        {
            assert.notProperty(tool(name).inputSchema, "required", name);
            assert.strictEqual(mcpPlan({ id: 1, method: "tools/call", params: { name, arguments: {} } }, PLUGIN_SHAPE).kind, "surface-call");
        }
    });

    it("진입점 도구에는 아이콘과 사람이 읽는 제목이 있다. 사이드바와 탭이 그것으로 선다", () =>
    {
        for (const name of ["open_library", "open_tray", "open_file"])
        {
            assert.isAbove(tool(name).icons?.length ?? 0, 0, name);
            assert.notStrictEqual(tool(name).title ?? "", "", name);
        }
    });

    it("파일 도구는 점으로 시작하는 확장자만 선언한다", () =>
    {
        const entrypoints = metaOf("open_file", "openai/ui")["entrypoints"] as ReadonlyArray<{ type: string; extensions: ReadonlyArray<string> }>;

        assert.deepStrictEqual(entrypoints, [{ type: "file", extensions: FILE_EXTENSIONS }]);
        assert.isTrue(FILE_EXTENSIONS.every((extension) => /^\.[a-z0-9]+$/.test(extension)));
        assert.deepStrictEqual(tool("open_file").inputSchema["required"], ["file"]);
        assert.strictEqual(metaOf("open_file", "ui")["resourceUri"], UI_FILE);
    });

    it("화면 자원은 text/html;profile=mcp-app 이고 보관함은 전체 화면을, 서랍은 대화 안을 먼저 청한다", () =>
    {
        const library = uiContents(UI_LIBRARY, "<!doctype html>")[0];
        const tray = uiContents(UI_TRAY, "<!doctype html>")[0];

        assert.strictEqual(library?.["mimeType"], UI_MIME);
        assert.strictEqual(library?.["text"], "<!doctype html>");
        assert.deepStrictEqual((library?.["_meta"] as Record<string, unknown>)["openai/ui"], { preferredDisplayMode: "fullscreen", availableDisplayModes: ["inline", "fullscreen"] });
        assert.deepStrictEqual((tray?.["_meta"] as Record<string, unknown>)["openai/ui"], { preferredDisplayMode: "inline", availableDisplayModes: ["inline", "fullscreen"] });
        assert.deepStrictEqual(PLUGIN_SHAPE.resources.map((resource) => resource.mimeType), [UI_MIME, UI_MIME, UI_MIME]);
    });

    it("화면 자원은 밖의 주소를 하나도 부르지 않는다. 틀에 든 것만으로 선다", () =>
    {
        const ui = (uiContents(UI_LIBRARY, "")[0]?.["_meta"] as Record<string, unknown>)["ui"] as { csp: Record<string, ReadonlyArray<string>> };

        assert.deepStrictEqual(ui.csp, { connectDomains: [], resourceDomains: [] });
    });

    it("앱만 부르는 도구는 visibility 가 app 뿐이다. 모델의 목록에 서지 않는다", () =>
    {
        for (const name of ["search_mentions", "import_file", "reveal_file_path"])
        {
            assert.deepStrictEqual(metaOf(name, "ui")["visibility"], ["app"], name);
        }
    });

    it("멘션 도구는 mentions/search 를 선언한다", () =>
    {
        assert.deepStrictEqual(tool("search_mentions")._meta?.["openai/extensions"], { "mentions/search": {} });
    });

    it("도구의 인자에 테넌트나 계정이 없다. 누구의 눈으로 도는지는 토큰이 정한다", () =>
    {
        const properties = PLUGIN_SHAPE.tools.flatMap((each) => Object.keys((each.inputSchema["properties"] ?? {}) as Record<string, unknown>));

        assert.notInclude(properties, "tenantId");
        assert.notInclude(properties, "accountId");
        assert.notInclude(properties, "authorId");
    });

    it("initialize 와 server/discover 가 설정 도구의 이름을 알린다", () =>
    {
        const initialized = mcpPlan({ id: 1, method: "initialize" }, PLUGIN_SHAPE);
        const discovered = mcpPlan({ id: 2, method: "server/discover" }, PLUGIN_SHAPE);
        const settings = { readTool: "read_settings", updateTool: "update_settings" };
        const capabilities = (plan: typeof initialized) => (plan.kind === "reply" ? plan.reply.result?.["capabilities"] : {}) as Record<string, Record<string, unknown>>;

        assert.deepStrictEqual(capabilities(initialized)["extensions"]?.["openai/settings"], settings);
        assert.deepStrictEqual(capabilities(initialized)["experimental"]?.["openai/settings"], settings);
        assert.deepStrictEqual(capabilities(discovered)["extensions"]?.["openai/settings"], settings);
        assert.isDefined(PLUGIN_SHAPE.tools.find((each) => each.name === settings.readTool));
        assert.isDefined(PLUGIN_SHAPE.tools.find((each) => each.name === settings.updateTool));
    });

    it("설정을 읽는 도구는 읽기 전용이고 결과의 모양을 선언한다", () =>
    {
        assert.strictEqual(tool("read_settings").annotations?.["readOnlyHint"], true);
        assert.deepStrictEqual((tool("read_settings").outputSchema?.["required"]), ["schema", "values"]);
    });
});
