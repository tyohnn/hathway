import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import { createUIMessageStreamResponse } from "ai";
import { Effect } from "effect";
import { getRun } from "workflow/api";

import { conversationStoreLayer } from "@/lib/agentRuntime";
import { currentActor } from "@/lib/currentActor";
import { untilTurnEnd } from "@/lib/turnStream";
import { openConversation } from "@/usecases/conversation";

/**
 * 끊긴 턴의 스트림에 다시 붙는다. 화면의 전송이 연결이 끊기면 여기로 온다.
 *
 * ⚠ **두 번호가 다른 것을 센다.** `start` 는 이 턴이 시작하는 **스트림 조각**의 번호이고 `startIndex` 는
 *    이 턴에서 화면이 이미 받은 **UI 조각**의 수다. 둘은 하나씩 맞지 않아서, 스트림은 턴의 처음부터 다시
 *    읽고 이미 보낸 UI 조각은 변환이 건너뛴다(Workflow 문서 「Resumable Streams」).
 * ⚠ **인증을 지난다.** 스트림도 공개 엔드포인트다. 볼 수 없는 대화는 404 다(INV-AGENT-01).
 */
const index = (value: string | null): number | null =>
{
    const parsed = Number(value ?? "0");

    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export async function GET(
    request: Request,
    context: { readonly params: Promise<{ readonly runId: string; readonly start: string }> },
): Promise<Response>
{
    const { runId, start } = await context.params;
    const turnStart = index(start);
    const uiStart = index(new URL(request.url).searchParams.get("startIndex"));

    if (turnStart === null || uiStart === null)
    {
        return new Response("주소를 확인해 주세요", { status: 400 });
    }

    const actor = await currentActor();

    if (actor === null)
    {
        return new Response("로그인이 필요해요", { status: 401 });
    }

    const opened = await Effect.runPromise(
        Effect.flatMap(conversationStoreLayer, (layer) => openConversation(actor, runId).pipe(Effect.provide(layer))),
    );

    if (opened === null)
    {
        return new Response("대화를 찾을 수 없어요", { status: 404 });
    }

    return createUIMessageStreamResponse({
        stream: getRun(runId)
            .getReadable({ startIndex: turnStart })
            .pipeThrough(untilTurnEnd())
            .pipeThrough(createModelCallToUIChunkTransform({ uiStartIndex: uiStart })),
        headers: { "x-workflow-run-id": runId, "x-turn-start": String(turnStart) },
    });
}
