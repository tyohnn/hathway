import "server-only";

import { Effect } from "effect";

import type { MessageRole } from "@hathway/agents/domain/Conversation";
import { ConversationStore } from "@hathway/agents/ports/ConversationStore";
import { titleOf } from "@hathway/agents/rules/conversation";

import { conversationStoreLayer } from "@/lib/agentRuntime";

/**
 * 대화 장부에 적는 스텝 셋.
 *
 * ⚠ **워크플로가 부른다.** 응답을 낸 요청의 떠 있는 프로미스가 적으면 서버리스에서는 응답이 나가는 순간
 *    얼어붙는다. 스텝은 워크플로가 끝까지 들고 가고, 실패하면 다시 돈다.
 * ⚠ **다시 돌아도 한 줄이다**(INV-AGENT-03). 같은 key 는 저장소가 한 줄로 접는다.
 * ⚠ **적지 못해도 대화를 깨뜨리지 않는다.** 장부는 기록이고 에이전트가 사람에게 답하는 일이 그보다 앞선다.
 *    까닭은 서버 기록에 남는다.
 */
/**
 * 대화의 줄을 열고 첫 말을 적는다. 워크플로의 첫 걸음이다.
 *
 * ⚠ **이 스텝은 실패를 삼키지 않는다.** 줄이 없으면 뒤의 말이 모두 외래 키에 걸리므로, 실패하면 워크플로가
 *    이 스텝을 다시 돌리게 둔다. 여는 쓰기는 멱등이라 다시 돌아도 한 줄이다.
 */
export async function openConversationStep(input: {
    readonly conversationId: string;
    readonly tenantId: string;
    readonly startedBy: string;
    readonly prompt: string;
    readonly messageKey: string;
}): Promise<void>
{
    "use step";

    await Effect.runPromise(
        Effect.flatMap(conversationStoreLayer, (layer) =>
            Effect.gen(function*()
            {
                const store = yield* ConversationStore;

                yield* store.open({
                    id: input.conversationId,
                    tenantId: input.tenantId,
                    startedBy: input.startedBy,
                    title: titleOf(input.prompt),
                });
                yield* store.append({
                    conversationId: input.conversationId,
                    key: input.messageKey,
                    role: "user",
                    text: input.prompt,
                });
            }).pipe(Effect.provide(layer))),
    );
}

export async function appendMessageStep(input: {
    readonly conversationId: string;
    readonly key: string;
    readonly role: MessageRole;
    readonly text: string;
}): Promise<void>
{
    "use step";

    await Effect.runPromise(
        Effect.flatMap(conversationStoreLayer, (layer) =>
            Effect.flatMap(ConversationStore, (store) => store.append(input)).pipe(Effect.provide(layer))).pipe(
            Effect.tapError((error) => Effect.logWarning(`대화 ${input.conversationId} 에 말을 적지 못했다: ${String(error)}`)),
            Effect.ignore,
        ),
    );
}

export async function closeConversationStep(input: { readonly conversationId: string }): Promise<void>
{
    "use step";

    await Effect.runPromise(
        Effect.flatMap(conversationStoreLayer, (layer) =>
            Effect.flatMap(ConversationStore, (store) => store.close(input.conversationId)).pipe(Effect.provide(layer))).pipe(
            Effect.tapError((error) => Effect.logWarning(`대화 ${input.conversationId} 를 닫지 못했다: ${String(error)}`)),
            Effect.ignore,
        ),
    );
}
