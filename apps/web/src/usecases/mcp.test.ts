import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { customerActor } from "@hathway/access/testing/actor";
import { noteStoreMemory } from "@hathway/notes/testing/noteStoreMemory";

import { emptyMcpSurface, McpSurface } from "@/extensions/McpSurface";
import { PlanLimits, unlimitedPlanLimits, UNLIMITED } from "@/extensions/PlanLimits";
import { MODERN_VERSION, type McpSurfaceShape, type RpcMessage } from "@/lib/mcp";

import { answerMcp } from "./mcp";

/**
 * MCP 요청 하나의 조립. 봉투가 세운 계획을 유스케이스와 확장 지점에 잇는 자리를 메모리 저장소로 잰다.
 *
 * ⚠ 봉투의 규칙은 `lib/mcp.test.ts` 가, 쪽지의 판정은 `packages/notes` 가 잰다. 여기서 보는 것은 **요금제의 문과
 *    확장 지점이 제자리에서 불리는가**다.
 */
const SHAPE: McpSurfaceShape = {
    tools: [{ name: "open_board", inputSchema: { type: "object", properties: {} } }, { name: "ask_board", inputSchema: { type: "object", properties: {} } }],
    resources: [{ uri: "ui://board/main", name: "board", mimeType: "text/html;profile=mcp-app" }],
    resourcePrefixes: ["card://"],
    extensions: {},
};

/** 모듈이 채운 확장 지점의 본보기. 무엇으로 불렸는지를 답에 그대로 싣는다 */
const boardSurface: Layer.Layer<McpSurface> = Layer.succeed(McpSurface, McpSurface.of({
    shape: SHAPE,
    call: (call) => Effect.succeed(call.name === "ask_board"
        ? { kind: "input-required", inputRequests: { form: { method: "elicitation/create" } }, requestState: "signed" }
        : { kind: "result", result: { content: [{ type: "text", text: `${call.actor.accountId}:${call.name}` }], isError: false } }),
    read: (read) => Effect.succeed(read.uri === "card://404" ? null : [{ uri: read.uri, text: "내용" }]),
}));

const lockedPlanLimits: Layer.Layer<PlanLimits> =
    Layer.succeed(PlanLimits, PlanLimits.of({ forActor: () => Effect.succeed({ ...UNLIMITED, mcp: false }) }));

const NOW = new Date("2026-10-02T03:00:00.000Z");
const kim = customerActor("2");

const ask = (message: RpcMessage, layers: Layer.Layer<PlanLimits | McpSurface>, headerVersion: string | null = null) =>
    Effect.gen(function*()
    {
        const notes = yield* noteStoreMemory();

        return yield* answerMcp(kim, message, { now: NOW, headerVersion }).pipe(Effect.provide(Layer.mergeAll(notes, layers)));
    });

const open = Layer.mergeAll(unlimitedPlanLimits, boardSurface);
const locked = Layer.mergeAll(lockedPlanLimits, boardSurface);

const textOf = (answer: { reply: { result?: Record<string, unknown> } | null }): string =>
    ((answer.reply?.result?.["content"] ?? []) as ReadonlyArray<{ text: string }>)[0]?.text ?? "";

describe("MCP 요청의 조립", () =>
{
    it.effect("알림에는 답이 없고 202 로 받는다", () =>
        Effect.gen(function*()
        {
            assert.deepStrictEqual(yield* ask({ method: "notifications/initialized" }, open), { reply: null, status: 202 });
        }));

    it.effect("모듈의 도구는 라우트가 세운 행위자로 불린다. 모듈이 행위자를 스스로 만들지 않는다", () =>
        Effect.gen(function*()
        {
            const answer = yield* ask({ id: 1, method: "tools/call", params: { name: "open_board" } }, open);

            assert.strictEqual(textOf(answer), "2:open_board");
            assert.strictEqual(answer.status, 200);
        }));

    it.effect("MCP 를 열지 않은 조직은 확장 도구도 까닭을 답으로 듣는다. 401 로 막으면 로그인을 되풀이한다", () =>
        Effect.gen(function*()
        {
            const core = yield* ask({ id: 1, method: "tools/call", params: { name: "list_notes" } }, locked);
            const surface = yield* ask({ id: 2, method: "tools/call", params: { name: "open_board" } }, locked);

            assert.deepStrictEqual([core.status, surface.status], [200, 200]);
            assert.deepStrictEqual([core.reply?.result?.["isError"], surface.reply?.result?.["isError"]], [true, true]);
            assert.strictEqual(textOf(surface), textOf(core));
            assert.notInclude(textOf(surface), "open_board");
        }));

    it.effect("문 앞에서도 연결과 목록과 화면의 틀은 내준다. 데이터를 싣는 자원은 내주지 않는다", () =>
        Effect.gen(function*()
        {
            const listed = yield* ask({ id: 1, method: "tools/list" }, locked);
            const frame = yield* ask({ id: 2, method: "resources/read", params: { uri: "ui://board/main" } }, locked);
            const data = yield* ask({ id: 3, method: "resources/read", params: { uri: "card://12" } }, locked);

            assert.strictEqual((listed.reply?.result?.["tools"] as ReadonlyArray<unknown>).length, 4);
            assert.deepStrictEqual(frame.reply?.result?.["contents"], [{ uri: "ui://board/main", text: "내용" }]);
            assert.isUndefined(data.reply?.result);
            assert.isDefined(data.reply?.error);
        }));

    it.effect("새 판의 자원 읽기는 캐시 칸을 싣는다. 빠지면 ChatGPT 가 답을 버리고 화면을 띄우지 못한다", () =>
        Effect.gen(function*()
        {
            const answer = yield* ask({
                id: 1,
                method: "resources/read",
                params: {
                    uri: "ui://board/main",
                    _meta: { "io.modelcontextprotocol/protocolVersion": MODERN_VERSION, "io.modelcontextprotocol/clientCapabilities": {} },
                },
            }, open, MODERN_VERSION);

            assert.strictEqual(answer.reply?.result?.["resultType"], "complete");
            assert.strictEqual(answer.reply?.result?.["ttlMs"], 0);
            assert.strictEqual(answer.reply?.result?.["cacheScope"], "private");
            assert.deepStrictEqual(answer.reply?.result?.["contents"], [{ uri: "ui://board/main", text: "내용" }]);
        }));

    it.effect("없는 자원은 Resource not found 로 답한다. 볼 수 없는 것과 없는 것을 가르지 않는다", () =>
        Effect.gen(function*()
        {
            const answer = yield* ask({ id: 1, method: "resources/read", params: { uri: "card://404" } }, open);

            assert.deepStrictEqual(answer.reply?.error, { code: -32602, message: "Resource not found", data: { uri: "card://404" } });
        }));

    it.effect("모듈의 도구가 되물으면 input_required 로 답한다", () =>
        Effect.gen(function*()
        {
            const answer = yield* ask({
                id: 1,
                method: "tools/call",
                params: { name: "ask_board", _meta: { "io.modelcontextprotocol/protocolVersion": MODERN_VERSION, "io.modelcontextprotocol/clientCapabilities": {} } },
            }, open, MODERN_VERSION);

            assert.strictEqual(answer.reply?.result?.["resultType"], "input_required");
            assert.strictEqual(answer.reply?.result?.["requestState"], "signed");
        }));

    it.effect("판을 적은 헤더와 본문이 다르면 받지 않는다", () =>
        Effect.gen(function*()
        {
            const message: RpcMessage = {
                id: 1,
                method: "tools/list",
                params: { _meta: { "io.modelcontextprotocol/protocolVersion": MODERN_VERSION, "io.modelcontextprotocol/clientCapabilities": {} } },
            };
            const mismatched = yield* ask(message, open, "2025-11-25");
            const matched = yield* ask(message, open, MODERN_VERSION);

            assert.deepStrictEqual([mismatched.status, mismatched.reply?.error?.code], [400, -32020]);
            assert.strictEqual(matched.status, 200);
        }));

    it.effect("새 판의 거절은 HTTP 상태로도 알린다. 클라이언트가 그 상태를 보고 판을 다시 고른다", () =>
        Effect.gen(function*()
        {
            const unsupported = yield* ask({ id: 1, method: "tools/list", params: { _meta: { "io.modelcontextprotocol/protocolVersion": "2031-01-01" } } }, open);

            assert.deepStrictEqual([unsupported.status, unsupported.reply?.error?.code], [400, -32022]);
        }));

    it.effect("모듈이 없어도 코어의 도구는 돈다", () =>
        Effect.gen(function*()
        {
            const layers = Layer.mergeAll(yield* noteStoreMemory(), unlimitedPlanLimits, emptyMcpSurface);
            const context = { now: NOW, headerVersion: null };
            const answer = yield* Effect.gen(function*()
            {
                yield* answerMcp(kim, { id: 1, method: "tools/call", params: { name: "create_note", arguments: { title: "회의" } } }, context);

                return yield* answerMcp(kim, { id: 2, method: "tools/call", params: { name: "list_notes" } }, context);
            }).pipe(Effect.provide(layers));

            assert.strictEqual(answer.status, 200);
            assert.strictEqual(textOf(answer), "- 회의");
        }));
});
