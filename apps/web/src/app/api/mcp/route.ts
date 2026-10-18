import { Effect, Layer } from "effect";

import { actorForBearer, bearerToken } from "@/lib/bearerActor";
import { extensionsLayer } from "@/lib/modules";
import type { RpcMessage } from "@/lib/mcp";
import { noteStoreLayer } from "@/lib/notesRuntime";
import { answerMcp } from "@/usecases/mcp";

/**
 * MCP 엔드포인트. **이 제품의 MCP 는 이 라우트 하나다.**
 *
 * 클로드 코드 같은 클라이언트가 붙으면 먼저 401 을 받고, 그 헤더가 가리키는 문서
 * (`/.well-known/oauth-protected-resource`)에서 인증 서버(Supabase Auth 의 OAuth 2.1)를 찾아 토큰을 얻는다.
 * 사람은 그 사이에 `/oauth/consent` 에서 한 번 허용한다.
 *
 * 이 파일은 토큰으로 행위자를 세우고 저장소와 확장 지점을 붙이는 데까지만 한다. 무엇을 답할지는 조립
 * (`usecases/mcp.ts`)이 정하고, 그 조립은 화면과 같은 유스케이스를 지난다.
 *
 * ⚠ **401 에 인증 서버를 가리키는 헤더를 붙인다.** 붙이지 않으면 클라이언트가 토큰을 얻을 길을 모른다.
 * ⚠ **401 은 토큰이 틀렸을 때만 낸다.** 저장소가 실패한 것까지 401 로 답하면 클라이언트가 멀쩡한 토큰을 버리고
 *    로그인을 되풀이한다. 그때는 JSON-RPC 의 내부 오류로 답한다.
 * ⚠ **GET 은 받지 않는다.** 스트리밍(SSE)을 쓰지 않으므로 405 로 분명히 알린다. 요청 사이에 기억하는 것이 없어서
 *    서버가 사람에게 되묻는 일은 새 판의 왕복으로만 한다(`lib/mcp.ts`).
 */
const unauthorized = (request: Request): Response =>
    new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: {
            "content-type": "application/json",
            "www-authenticate": `Bearer resource_metadata="${new URL(request.url).origin}/.well-known/oauth-protected-resource"`,
        },
    });

const json = (body: unknown, status: number): Response =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
    });

export function GET(): Response
{
    return new Response(null, { status: 405 });
}

export async function POST(request: Request): Promise<Response>
{
    const token = bearerToken(request.headers.get("authorization"));

    if (token === null)
    {
        return unauthorized(request);
    }

    const message = await request.json().catch(() => null) as RpcMessage | null;

    if (message === null || typeof message !== "object")
    {
        return new Response(null, { status: 400 });
    }

    const actor = await Effect.runPromise(Effect.result(actorForBearer(token))).catch(() => null);

    if (actor === null || actor._tag === "Failure")
    {
        return unauthorized(request);
    }

    const program = Effect.gen(function*()
    {
        const layers = Layer.mergeAll(yield* noteStoreLayer, yield* extensionsLayer);

        return yield* answerMcp(actor.success, message, {
            now: new Date(),
            headerVersion: request.headers.get("mcp-protocol-version"),
        }).pipe(Effect.provide(layers));
    });

    const answer = await Effect.runPromise(Effect.result(program)).catch(() => null);

    if (answer === null || answer._tag === "Failure")
    {
        logFailure(answer === null ? "unknown" : answer.failure);

        return message.id === undefined
            ? new Response(null, { status: 500 })
            : json({ jsonrpc: "2.0", id: message.id, error: { code: -32603, message: "요청을 처리하지 못했어요." } }, 200);
    }

    return answer.success.reply === null
        ? new Response(null, { status: answer.success.status })
        : json(answer.success.reply, answer.success.status);
}

/** 실패의 까닭은 답에 싣지 않고 서버에만 남긴다. 저장소의 오류 글에는 질의가 들어 있다 */
function logFailure(cause: unknown): void
{
    Effect.runFork(Effect.logWarning("MCP 요청을 처리하지 못했다", cause));
}
