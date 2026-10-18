import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { customerActor } from "@hathway/access/testing/actor";
import { marketMemory } from "@hathway/market/testing/marketMemory";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";
import { noteStoreMemory } from "@hathway/notes/testing/noteStoreMemory";
import { boardStoreMemory } from "@hathway/research/testing/boardStoreMemory";

import type { McpSurface } from "@/extensions/McpSurface";
import { unlimitedPlanLimits, type PlanLimits } from "@/extensions/PlanLimits";
import { TOOLS, type RpcMessage } from "@/lib/mcp";
import { answerMcp, type McpAnswer } from "@/usecases/mcp";

import { pluginSurfaceLayer } from "./extensions";
import { UI_COMPANY, UI_MIME } from "./surface";
import { KRAFTON, KRAFTON_ROWS } from "./testFixtures";

/**
 * 플러그인 모듈을 켠 조립. 코어의 MCP 조립(`usecases/mcp.ts`)에 이 모듈의 확장 지점을 끼워 한 요청이 끝까지 도는지 잰다.
 */
const context = { now: new Date("2026-10-18T03:00:00.000Z"), headerVersion: null };
const kim = customerActor("2");

type Needs = NoteStore | PlanLimits | McpSurface;

const run = <A>(program: (ask: (message: RpcMessage) => Effect.Effect<McpAnswer, unknown, Needs>) => Effect.Effect<A, unknown, Needs>) =>
    Effect.gen(function*()
    {
        const stores = Layer.mergeAll(marketMemory({ companies: [KRAFTON], periods: KRAFTON_ROWS, filings: [] }), yield* boardStoreMemory([]));
        const surface = pluginSurfaceLayer(stores, { appHtml: "<!doctype html><title>틀</title>", newId: (prefix) => `${prefix}-test` });

        return yield* program((message) => answerMcp(kim, message, context)).pipe(Effect.provide(Layer.mergeAll(yield* noteStoreMemory(), unlimitedPlanLimits, surface)));
    });

describe("플러그인 모듈을 켠 MCP", () =>
{
    it.effect("코어의 도구 뒤에 플러그인의 도구가 서고, 화면 자원이 목록에 선다", () =>
        run((ask) => Effect.gen(function*()
        {
            const tools = (yield* ask({ id: 1, method: "tools/list" })).reply?.result?.["tools"] as ReadonlyArray<{ name: string }>;
            const resources = (yield* ask({ id: 2, method: "resources/list" })).reply?.result?.["resources"] as ReadonlyArray<{ uri: string }>;

            assert.deepStrictEqual(tools.slice(0, TOOLS.length).map((tool) => tool.name), TOOLS.map((tool) => tool.name));
            assert.include(tools.map((tool) => tool.name), "show_company");
            assert.include(resources.map((resource) => resource.uri), UI_COMPANY);
        })));

    it.effect("종목 도구가 시장 데이터를 화면 모양으로 내주고, 화면 자원은 구운 틀을 내준다", () =>
        run((ask) => Effect.gen(function*()
        {
            const shown = (yield* ask({ id: 1, method: "tools/call", params: { name: "show_company", arguments: { stockCode: "259960" } } })).reply?.result;
            const frame = (yield* ask({ id: 2, method: "resources/read", params: { uri: UI_COMPANY } })).reply?.result?.["contents"] as ReadonlyArray<Record<string, unknown>>;
            const view = shown?.["structuredContent"] as { page: string; company: { name: string } };

            assert.deepStrictEqual([view.page, view.company.name], ["company", "크래프톤"]);
            assert.deepStrictEqual([frame[0]?.["mimeType"], frame[0]?.["text"]], [UI_MIME, "<!doctype html><title>틀</title>"]);
        })));
});
