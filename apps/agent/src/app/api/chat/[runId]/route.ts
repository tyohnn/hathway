import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import { createUIMessageStreamResponse } from "ai";
import { Effect, Schema } from "effect";
import { getRun } from "workflow/api";

import { conversationStoreLayer } from "@/lib/agentRuntime";
import { currentActor } from "@/lib/currentActor";
import { untilTurnEnd } from "@/lib/turnStream";
import { followUp, SayInput } from "@/usecases/conversation";
import { chatMessageHook } from "@/workflows/hooks/chatMessage";

/**
 * 도는 대화에 말을 더 건다. 훅을 깨우고, 그 말에 대한 턴의 스트림을 돌려준다.
 *
 * ⚠ **깨우기 전에 스트림의 끝 번호를 잰다.** 이 턴의 조각은 그 번호 뒤부터 쌓인다. 깨운 뒤에 재면 이미
 *    쌓이기 시작한 조각을 건너뛴다.
 * ⚠ **연 사람인지는 유스케이스가 잰다**(INV-AGENT-01). 볼 수 없는 대화는 404 다.
 */
const decode = Schema.decodeUnknownOption(SayInput);

const STATUS = { NotFound: 404, Closed: 409, Rejected: 422 } as const;

export async function POST(
    request: Request,
    context: { readonly params: Promise<{ readonly runId: string }> },
): Promise<Response>
{
    const parsed = decode(await request.json().catch(() => null));

    if (parsed._tag === "None")
    {
        return new Response("입력을 확인해 주세요", { status: 400 });
    }

    const actor = await currentActor();

    if (actor === null)
    {
        return new Response("로그인이 필요해요", { status: 401 });
    }

    const { runId } = await context.params;
    const run = getRun(runId);
    let turnStart = 0;

    const outcome = await Effect.runPromise(
        Effect.flatMap(conversationStoreLayer, (layer) =>
            followUp(actor, runId, parsed.value, async (key, text) =>
            {
                const probe = run.getReadable();

                turnStart = (await probe.getTailIndex()) + 1;
                await probe.cancel();
                await chatMessageHook.resume(runId, { key, text });
            }).pipe(Effect.provide(layer))),
    );

    if (outcome._tag !== "Delivered")
    {
        return new Response(outcome._tag, { status: STATUS[outcome._tag] });
    }

    return createUIMessageStreamResponse({
        stream: run.getReadable({ startIndex: turnStart }).pipeThrough(untilTurnEnd()).pipeThrough(createModelCallToUIChunkTransform()),
        headers: { "x-workflow-run-id": runId, "x-turn-start": String(turnStart) },
    });
}
