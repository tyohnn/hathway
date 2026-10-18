import { Effect } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";

import { McpSurface } from "@/extensions/McpSurface";
import { PlanLimits } from "@/extensions/PlanLimits";
import { cacheableResult, headerMismatch, inputRequired, mcpClient, mcpPlan, rpcResult, toolText, type RpcMessage, type RpcReply } from "@/lib/mcp";

import { createNote, listNotes } from "./notes";

/**
 * MCP 요청 하나의 조립. 봉투(`lib/mcp.ts`)가 세운 계획을 유스케이스와 확장 지점에 잇는다.
 *
 * 라우트(`app/api/mcp/route.ts`)는 토큰으로 행위자를 세우고 저장소를 붙여 이 함수를 부른다. 조립을 라우트 밖에 두는 것은
 * 서버 액션의 조립을 `usecases/` 에 두는 것과 같은 까닭이다. 메모리 저장소로 도커 없이 잰다(`mcp.test.ts`).
 *
 * ⚠ **도구는 화면과 같은 유스케이스를 지난다**(`usecases/notes.ts`). 따로 조립하면 같은 판정이 두 곳에 살고
 *    밖에서 붙은 세션만 더 보이는 날이 온다(REQ-02).
 * ⚠ **도구를 부르는 것은 확장 지점(`PlanLimits`)이 연다.** 연결과 도구 목록과 화면의 틀(`ui://`)은 문 앞에서도 내주어
 *    클라이언트가 연결을 마치고, 부를 때 까닭을 도구의 답으로 듣게 한다. 401 로 막으면 클라이언트가 로그인을 되풀이한다.
 *    모듈이 더한 도구와 데이터를 싣는 자원도 같은 문을 지난다. 모듈마다 문을 따로 두면 하나가 빠진다.
 * ⚠ **시각은 받아서 넘긴다.** 모듈의 판정(폼의 기한)이 시계를 스스로 읽지 않게 한다.
 */
export interface McpAnswer
{
    /** 알림에는 답이 없다 */
    readonly reply: RpcReply | null;
    readonly status: number;
}

export interface McpRequestContext
{
    readonly now: Date;
    /** 요청의 `MCP-Protocol-Version` 헤더. 없으면 `null` 이다 */
    readonly headerVersion: string | null;
}

const LOCKED = "Claude 연결은 프로 요금제부터 쓸 수 있어요.";

/** 화면 자원은 데이터가 없는 틀이다. 요금제의 문 앞에서도 내준다 */
const isFrame = (uri: string): boolean => uri.startsWith("ui://");

const answered = (reply: RpcReply, status = 200): McpAnswer => ({ reply, status });

export const answerMcp = (
    actor: Actor,
    message: RpcMessage,
    context: McpRequestContext,
): Effect.Effect<McpAnswer, unknown, NoteStore | PlanLimits | McpSurface> =>
    Effect.gen(function*()
    {
        const surface = yield* McpSurface;
        const client = mcpClient(message);
        const plan = headerMismatch(message, context.headerVersion) ?? mcpPlan(message, surface.shape);

        if (plan.kind === "none")
        {
            return { reply: null, status: 202 };
        }

        if (plan.kind === "reply")
        {
            return answered(plan.reply, plan.status);
        }

        const limits = yield* Effect.flatMap(PlanLimits, (planLimits) => planLimits.forActor(actor));

        if (plan.kind === "surface-read")
        {
            const contents = limits.mcp || isFrame(plan.uri) ? yield* surface.read({ actor, uri: plan.uri }) : null;

            return answered(contents === null
                ? { jsonrpc: "2.0", id: plan.id, error: { code: -32602, message: "Resource not found", data: { uri: plan.uri } } }
                : cacheableResult(plan.id, { contents }, client));
        }

        if (!limits.mcp)
        {
            return answered(toolText(plan.id, LOCKED, true, client));
        }

        if (plan.kind === "surface-call")
        {
            const outcome = yield* surface.call({
                actor,
                name: plan.name,
                args: plan.args,
                meta: plan.meta,
                client,
                inputResponses: plan.inputResponses,
                requestState: plan.requestState,
                now: context.now,
            });

            return answered(outcome.kind === "result"
                ? rpcResult(plan.id, outcome.result, client)
                : inputRequired(plan.id, outcome.inputRequests, outcome.requestState));
        }

        if (plan.kind === "list-notes")
        {
            const notes = yield* listNotes(actor);
            const lines = notes
                .filter((note) => note.status === "active")
                .map((note) => `- ${note.title}${note.visibility === "private" ? " (비공개)" : ""}`);

            return answered(toolText(plan.id, lines.length === 0 ? "볼 수 있는 쪽지가 없어요." : lines.join("\n"), false, client));
        }

        const created = yield* createNote(actor, plan);

        return answered(created.ok
            ? toolText(plan.id, `쪽지를 썼어요: ${plan.title.trim()}`, false, client)
            : toolText(plan.id, created.message, true, client));
    });
