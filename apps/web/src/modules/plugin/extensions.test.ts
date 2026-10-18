import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { customerActor } from "@hathway/access/testing/actor";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";
import { noteStoreMemory } from "@hathway/notes/testing/noteStoreMemory";
import { preferenceStoreMemory } from "@hathway/preferences/testing/preferenceStoreMemory";

import type { McpSurface } from "@/extensions/McpSurface";
import { unlimitedPlanLimits, type PlanLimits } from "@/extensions/PlanLimits";
import { TOOLS, type RpcMessage } from "@/lib/mcp";
import { answerMcp, type McpAnswer } from "@/usecases/mcp";

import { pluginSurfaceLayer } from "./extensions";
import { UI_LIBRARY, UI_MIME } from "./surface";

/**
 * 플러그인 모듈을 켠 조립. 코어의 MCP 조립(`usecases/mcp.ts`)에 이 모듈의 확장 지점을 끼워 한 요청이 끝까지 도는지 잰다.
 */
const context = { now: new Date("2026-10-02T03:00:00.000Z"), headerVersion: null };
const kim = customerActor("2");

type Needs = NoteStore | PlanLimits | McpSurface;

const run = <A>(program: (ask: (message: RpcMessage) => Effect.Effect<McpAnswer, unknown, Needs>) => Effect.Effect<A, unknown, Needs>) =>
    Effect.gen(function*()
    {
        const stores = Layer.mergeAll(yield* noteStoreMemory(), yield* preferenceStoreMemory());
        const surface = pluginSurfaceLayer(stores, { stateSecret: "검사용 비밀", pluginId: null, appHtml: "<!doctype html><title>틀</title>" });

        return yield* program((message) => answerMcp(kim, message, context)).pipe(Effect.provide(Layer.mergeAll(stores, unlimitedPlanLimits, surface)));
    });

describe("플러그인 모듈을 켠 MCP", () =>
{
    it.effect("코어의 도구 뒤에 플러그인의 도구가 서고, 화면 자원이 목록에 선다", () =>
        run((ask) => Effect.gen(function*()
        {
            const tools = (yield* ask({ id: 1, method: "tools/list" })).reply?.result?.["tools"] as ReadonlyArray<{ name: string }>;
            const resources = (yield* ask({ id: 2, method: "resources/list" })).reply?.result?.["resources"] as ReadonlyArray<{ uri: string }>;

            assert.deepStrictEqual(tools.slice(0, TOOLS.length).map((tool) => tool.name), TOOLS.map((tool) => tool.name));
            assert.include(tools.map((tool) => tool.name), "open_library");
            assert.include(resources.map((resource) => resource.uri), UI_LIBRARY);
        })));

    it.effect("코어의 도구로 쓴 쪽지가 보관함에 실리고, 화면 자원은 구운 틀을 내준다", () =>
        run((ask) => Effect.gen(function*()
        {
            yield* ask({ id: 1, method: "tools/call", params: { name: "create_note", arguments: { title: "회의" } } });

            const opened = (yield* ask({ id: 2, method: "tools/call", params: { name: "open_library", arguments: {} } })).reply?.result;
            const frame = (yield* ask({ id: 3, method: "resources/read", params: { uri: UI_LIBRARY } })).reply?.result?.["contents"] as ReadonlyArray<Record<string, unknown>>;

            assert.deepStrictEqual(((opened?.["structuredContent"] as { notes: ReadonlyArray<{ title: string }> }).notes).map((card) => card.title), ["회의"]);
            assert.deepStrictEqual([frame[0]?.["mimeType"], frame[0]?.["text"]], [UI_MIME, "<!doctype html><title>틀</title>"]);
        })));
});
