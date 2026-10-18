import { Context, Effect, Layer } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";

import { NO_SURFACE, type McpClient, type McpSurfaceShape } from "@/lib/mcp";

/**
 * 확장 지점: MCP 에 무엇을 더하는가. 코어(`/api/mcp`)가 묻고 모듈이 도구 · 자원 · capability 로 답한다.
 *
 * ⚠ **코어는 이 포트만 안다.** 어느 호스트의 어떤 표시(사이드바 · 설정 · 멘션)인지 모른다. 모듈이 없으면 기본 구현
 *    (`emptyMcpSurface`)이 서서 코어의 도구 둘만 돈다. 어느 구현을 잇는지는 `lib/modules.ts` 하나가 정한다.
 * ⚠ **행위자는 코어가 세워서 넘긴다.** 모듈의 도구도 토큰 길의 세 계층(세션 · 소속 · 행)을 그대로 지난다. 모듈이
 *    행위자를 스스로 만들 길은 없다.
 * ⚠ **요금제의 문은 코어가 연다.** `call` 과 데이터를 싣는 `read` 는 `PlanLimits.mcp` 를 지난 뒤에만 불린다.
 *    화면 자원(`ui://`)은 데이터가 없는 틀이라 문 앞에서도 내준다.
 */
export interface SurfaceCall
{
    readonly actor: Actor;
    readonly name: string;
    readonly args: Readonly<Record<string, unknown>>;
    readonly meta: Readonly<Record<string, unknown>>;
    readonly client: McpClient;
    readonly inputResponses: Readonly<Record<string, unknown>> | null;
    readonly requestState: string | null;
    /** 시각은 라우트가 한 번 읽어 넘긴다. 모듈의 판정이 시계를 스스로 읽지 않게 한다 */
    readonly now: Date;
}

export type SurfaceOutcome =
    /** 도구의 답. `content` · `structuredContent` · `isError` · `_meta` 를 싣는다 */
    | { readonly kind: "result"; readonly result: Record<string, unknown> }
    /** 사람에게 되묻는다. 새 판의 클라이언트에만 쓴다 */
    | { readonly kind: "input-required"; readonly inputRequests: Readonly<Record<string, unknown>>; readonly requestState: string };

export interface SurfaceRead
{
    readonly actor: Actor;
    readonly uri: string;
}

export class McpSurface extends Context.Service<McpSurface, {
    readonly shape: McpSurfaceShape;
    readonly call: (call: SurfaceCall) => Effect.Effect<SurfaceOutcome, unknown>;
    /** 자원의 내용. 없거나 볼 수 없으면 `null` 이고 라우트가 없는 자원으로 답한다 */
    readonly read: (read: SurfaceRead) => Effect.Effect<ReadonlyArray<Record<string, unknown>> | null, unknown>;
}>()("@hathway/web/extensions/McpSurface")
{}

/** 모듈이 없을 때. 아무것도 더하지 않는다 */
export const emptyMcpSurface: Layer.Layer<McpSurface> = Layer.succeed(McpSurface, McpSurface.of({
    shape: NO_SURFACE,
    call: (call) => Effect.succeed({ kind: "result", result: { content: [{ type: "text", text: `모르는 도구다: ${call.name}` }], isError: true } }),
    read: () => Effect.succeed(null),
}));
