import { assert, describe, it } from "vitest";

import { mcpClient, mcpPlan, MODERN_VERSION, PROTOCOL_VERSION, toolText, TOOLS, type McpSurfaceShape, type RpcMessage } from "./mcp";

describe("MCP 봉투", () =>
{
    it("알림(id 가 없는 메시지)에는 답하지 않는다", () =>
    {
        assert.deepStrictEqual(mcpPlan({ method: "notifications/initialized" }), { kind: "none" });
    });

    it("initialize 는 클라이언트가 말한 판으로 답하고 도구가 있다고 알린다", () =>
    {
        const plan = mcpPlan({ id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } });

        assert.strictEqual(plan.kind === "reply" && plan.reply.result?.["protocolVersion"], "2025-03-26");
        assert.strictEqual(
            mcpPlan({ id: 2, method: "initialize" }).kind === "reply" && PROTOCOL_VERSION,
            PROTOCOL_VERSION,
        );
    });

    it("도구 목록의 인자에 테넌트나 계정이 없다. 누구의 눈으로 도는지는 토큰이 정한다", () =>
    {
        const properties = TOOLS.flatMap((tool) => Object.keys(tool.inputSchema.properties));

        assert.notInclude(properties, "tenantId");
        assert.notInclude(properties, "accountId");
        assert.notInclude(properties, "authorId");
    });

    it("도구 호출은 유스케이스가 채울 계획으로 바뀐다", () =>
    {
        assert.deepStrictEqual(mcpPlan({ id: 3, method: "tools/call", params: { name: "list_notes" } }), { kind: "list-notes", id: 3 });
        assert.deepStrictEqual(
            mcpPlan({ id: 4, method: "tools/call", params: { name: "create_note", arguments: { title: "회의", visibility: "private" } } }),
            { kind: "create-note", id: 4, title: "회의", body: "", visibility: "private" },
        );
    });

    it("모르는 도구와 메서드는 오류로 답한다", () =>
    {
        const unknownTool = mcpPlan({ id: 5, method: "tools/call", params: { name: "drop_table" } });
        const unknownMethod = mcpPlan({ id: 6, method: "resources/list" });

        assert.strictEqual(unknownTool.kind === "reply" && unknownTool.reply.error?.code, -32602);
        assert.strictEqual(unknownMethod.kind === "reply" && unknownMethod.reply.error?.code, -32601);
    });

    it("모듈이 없으면 도구 목록과 initialize 가 지금과 같다. 확장을 켜지 않은 조립도 늘 도는 조립이다", () =>
    {
        const initialized = mcpPlan({ id: 1, method: "initialize" });
        const listed = mcpPlan({ id: 2, method: "tools/list" });

        assert.deepStrictEqual(initialized.kind === "reply" && initialized.reply.result, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: {} },
            serverInfo: { name: "hathway", version: "0.0.1" },
        });
        assert.deepStrictEqual(listed.kind === "reply" && listed.reply.result, { tools: TOOLS });
    });
});

/** 모듈이 MCP 에 더한 것의 본보기. 도구 하나, 화면 자원 하나, 주소 틀 하나, capability 하나다 */
const SURFACE: McpSurfaceShape = {
    tools: [{ name: "open_board", inputSchema: { type: "object", properties: {}, additionalProperties: false } }],
    resources: [{ uri: "ui://board/main", name: "board", mimeType: "text/html;profile=mcp-app" }],
    resourcePrefixes: ["card://"],
    extensions: { "example/settings": { readTool: "read_settings" } },
};

const modern = (message: RpcMessage, version: string = MODERN_VERSION): RpcMessage => ({
    ...message,
    params: {
        ...message.params,
        _meta: {
            "io.modelcontextprotocol/protocolVersion": version,
            "io.modelcontextprotocol/clientCapabilities": { elicitation: { form: {} } },
        },
    },
});

describe("MCP 봉투: 모듈이 더한 것", () =>
{
    it("모듈의 도구는 코어의 도구 뒤에 서고, 부르면 모듈이 채울 계획으로 바뀐다", () =>
    {
        const listed = mcpPlan({ id: 1, method: "tools/list" }, SURFACE);
        const tools = listed.kind === "reply" ? listed.reply.result?.["tools"] as ReadonlyArray<{ name: string }> : [];

        assert.deepStrictEqual(tools.map((tool) => tool.name), ["list_notes", "create_note", "open_board"]);
        assert.deepStrictEqual(
            mcpPlan({ id: 2, method: "tools/call", params: { name: "open_board", arguments: { column: "todo" }, _meta: { "openai/resource": { path: "/tmp/a.md" } } } }, SURFACE),
            {
                kind: "surface-call",
                id: 2,
                name: "open_board",
                args: { column: "todo" },
                meta: { "openai/resource": { path: "/tmp/a.md" } },
                inputResponses: null,
                requestState: null,
            },
        );
    });

    it("resources/read 는 등록한 자원만 내준다. 모르는 주소는 오류로 답한다", () =>
    {
        const unknown = mcpPlan({ id: 3, method: "resources/read", params: { uri: "file:///etc/passwd" } }, SURFACE);

        assert.deepStrictEqual(mcpPlan({ id: 1, method: "resources/read", params: { uri: "ui://board/main" } }, SURFACE), { kind: "surface-read", id: 1, uri: "ui://board/main" });
        assert.deepStrictEqual(mcpPlan({ id: 2, method: "resources/read", params: { uri: "card://12" } }, SURFACE), { kind: "surface-read", id: 2, uri: "card://12" });
        assert.strictEqual(unknown.kind === "reply" && unknown.reply.error?.code, -32602);
    });

    it("자원 목록에는 화면 자원만 선다. 주소 틀로 읽는 것은 싣지 않는다", () =>
    {
        const listed = mcpPlan({ id: 1, method: "resources/list" }, SURFACE);

        assert.deepStrictEqual(listed.kind === "reply" && listed.reply.result, { resources: SURFACE.resources });
    });

    it("initialize 는 모듈의 capability 를 extensions 와 옛 자리(experimental)에 함께 알린다", () =>
    {
        const initialized = mcpPlan({ id: 1, method: "initialize", params: { protocolVersion: "2025-11-25" } }, SURFACE);

        assert.deepStrictEqual(initialized.kind === "reply" && initialized.reply.result?.["capabilities"], {
            tools: {},
            resources: {},
            extensions: SURFACE.extensions,
            experimental: SURFACE.extensions,
        });
    });
});

describe("MCP 봉투: 두 시대", () =>
{
    it("새 판의 목록은 캐시 칸(ttlMs · cacheScope)을 싣는다. 사람마다 다른 답이라 개인 범위이고 바로 낡는다. 옛 판에는 싣지 않는다", () =>
    {
        const tools = mcpPlan(modern({ id: 1, method: "tools/list" }), SURFACE);
        const resources = mcpPlan(modern({ id: 2, method: "resources/list" }), SURFACE);
        const legacy = mcpPlan({ id: 3, method: "tools/list" }, SURFACE);

        for (const plan of [tools, resources])
        {
            assert.strictEqual(plan.kind === "reply" && plan.reply.result?.["ttlMs"], 0);
            assert.strictEqual(plan.kind === "reply" && plan.reply.result?.["cacheScope"], "private");
        }

        assert.isFalse(legacy.kind === "reply" && "ttlMs" in (legacy.reply.result ?? {}));
    });

    it("요청마다 판을 싣고 오면 악수 없이 답하고 결과에 resultType 을 적는다", () =>
    {
        const listed = mcpPlan(modern({ id: 1, method: "tools/list" }));

        assert.strictEqual(listed.kind === "reply" && listed.reply.result?.["resultType"], "complete");
        assert.deepStrictEqual(listed.kind === "reply" && listed.reply.result?.["tools"], TOOLS);
        assert.deepStrictEqual(mcpClient(modern({ id: 1, method: "tools/list" })), { modern: true, capabilities: { elicitation: { form: {} } } });
        assert.deepStrictEqual(toolText(7, "됐어요", false, { modern: true, capabilities: {} }).result?.["resultType"], "complete");
    });

    it("server/discover 는 받는 판과 capability 를 알린다", () =>
    {
        const discovered = mcpPlan(modern({ id: "d", method: "server/discover" }), SURFACE);
        const result = discovered.kind === "reply" ? discovered.reply.result : undefined;

        assert.deepStrictEqual(result?.["supportedVersions"], [MODERN_VERSION]);
        assert.deepStrictEqual(result?.["capabilities"], { tools: {}, resources: {}, extensions: SURFACE.extensions });
        assert.deepStrictEqual(result?.["_meta"], { "io.modelcontextprotocol/serverInfo": { name: "hathway", version: "0.0.1" } });
    });

    it("받지 않는 판은 받는 판의 목록과 함께 거절한다", () =>
    {
        const refused = mcpPlan(modern({ id: 1, method: "tools/list" }, "2031-01-01"));

        assert.strictEqual(refused.kind === "reply" && refused.status, 400);
        assert.strictEqual(refused.kind === "reply" && refused.reply.error?.code, -32022);
        assert.deepStrictEqual(refused.kind === "reply" && refused.reply.error?.data, { supported: [MODERN_VERSION], requested: "2031-01-01" });
    });

    it("새 판인데 클라이언트의 capability 를 싣지 않은 요청은 받지 않는다. 폼을 띄울 수 있는지를 거기서 읽는다", () =>
    {
        const refused = mcpPlan({ id: 1, method: "tools/list", params: { _meta: { "io.modelcontextprotocol/protocolVersion": MODERN_VERSION } } });

        assert.strictEqual(refused.kind === "reply" && refused.status, 400);
        assert.strictEqual(refused.kind === "reply" && refused.reply.error?.code, -32602);
    });

    it("새 판의 모르는 메서드는 404 로 답한다. 옛 판은 지금처럼 200 에 오류를 싣는다", () =>
    {
        const modernUnknown = mcpPlan(modern({ id: 1, method: "prompts/list" }));
        const legacyUnknown = mcpPlan({ id: 1, method: "prompts/list" });

        assert.strictEqual(modernUnknown.kind === "reply" && modernUnknown.status, 404);
        assert.strictEqual(legacyUnknown.kind === "reply" && legacyUnknown.status, undefined);
        assert.strictEqual(legacyUnknown.kind === "reply" && legacyUnknown.reply.error?.code, -32601);
    });

    it("initialize 로 여는 클라이언트는 지금처럼 돈다. 두 시대를 한 주소에서 받는다", () =>
    {
        const listed = mcpPlan({ id: 2, method: "tools/list" });

        assert.deepStrictEqual(mcpClient({ id: 2, method: "tools/list" }), { modern: false, capabilities: {} });
        assert.deepStrictEqual(listed.kind === "reply" && listed.reply.result, { tools: TOOLS });
        assert.deepStrictEqual(toolText(7, "됐어요"), { jsonrpc: "2.0", id: 7, result: { content: [{ type: "text", text: "됐어요" }], isError: false } });
    });

    it("폼의 답과 requestState 는 다시 부른 요청에서 꺼내 모듈에 넘긴다", () =>
    {
        const retried = mcpPlan(modern({
            id: 9,
            method: "tools/call",
            params: { name: "open_board", inputResponses: { form: { action: "accept", content: { column: "done" } } }, requestState: "signed" },
        }), SURFACE);

        assert.deepStrictEqual(retried.kind === "surface-call" && { responses: retried.inputResponses, state: retried.requestState }, {
            responses: { form: { action: "accept", content: { column: "done" } } },
            state: "signed",
        });
    });
});
