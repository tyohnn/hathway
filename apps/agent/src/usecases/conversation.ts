import { Effect, Schema } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import type { Conversation, Message } from "@hathway/agents/domain/Conversation";
import { ConversationStore } from "@hathway/agents/ports/ConversationStore";
import { canTalk } from "@hathway/agents/rules/conversation";

/**
 * 대화를 걸고 잇는 조립. 라우트 핸들러가 부르고, 워크플로를 깨우는 일은 인자로 받은 함수가 한다.
 *
 * ⚠ **Workflow 를 여기서 import 하지 않는다.** 실행을 거는 일과 훅을 깨우는 일을 인자로 받아서, 이 조립을
 *    메모리 저장소와 가짜 함수로 도커 없이 잰다(`conversation.test.ts`).
 * ⚠ **판정은 `packages/agents` 의 순수 함수가 한다**(INV-AGENT-01). 여기서 조건을 다시 적지 않는다.
 */
export const SayInput = Schema.Struct({
    /** 화면이 붙인 메시지 id. 장부의 key 가 된다(INV-AGENT-03) */
    messageId: Schema.NonEmptyString,
    text: Schema.String,
});

export type SayInput = typeof SayInput.Type;

export const MESSAGE_MAX = 8000;

export type SayVerdict =
    | { readonly _tag: "Accepted"; readonly text: string; readonly key: string }
    | { readonly _tag: "Rejected"; readonly message: string };

/** 사람이 건 말을 대화에 실을 모양으로 다듬는다 */
export const sayVerdict = (input: SayInput): SayVerdict =>
{
    const text = input.text.trim();

    if (text === "")
    {
        return { _tag: "Rejected", message: "보낼 글을 적어 주세요." };
    }

    if ([...text].length > MESSAGE_MAX)
    {
        return { _tag: "Rejected", message: `한 번에 ${MESSAGE_MAX}자까지 보낼 수 있어요.` };
    }

    return { _tag: "Accepted", text, key: `user:${input.messageId}` };
};

export type FollowUpOutcome =
    | { readonly _tag: "Delivered" }
    | { readonly _tag: "NotFound" }
    | { readonly _tag: "Closed" }
    | { readonly _tag: "Rejected"; readonly message: string };

/**
 * 도는 대화에 말을 더 건다.
 *
 * ⚠ **실행 번호만으로 깨우지 않는다.** 번호를 아는 사람은 누구나 그 값을 적을 수 있다. 연 사람인지를 먼저
 *    재고, 볼 수 없는 대화는 없는 것으로 답한다(INV-AGENT-01).
 */
export const followUp = (
    actor: Actor,
    conversationId: string,
    input: SayInput,
    resume: (key: string, text: string) => Promise<void>,
): Effect.Effect<FollowUpOutcome, unknown, ConversationStore> =>
    Effect.gen(function*()
    {
        const verdict = sayVerdict(input);

        if (verdict._tag === "Rejected")
        {
            return verdict;
        }

        const conversation = yield* Effect.flatMap(ConversationStore, (store) => store.findFor(actor, conversationId));

        if (conversation === null)
        {
            return { _tag: "NotFound" } as const;
        }

        if (!canTalk(actor, conversation))
        {
            return { _tag: "Closed" } as const;
        }

        yield* Effect.tryPromise(() => resume(verdict.key, verdict.text));

        return { _tag: "Delivered" } as const;
    });

/** 목록. 이 사람이 연 대화만 온다 */
export const listConversations = (actor: Actor): Effect.Effect<ReadonlyArray<Conversation>, unknown, ConversationStore> =>
    Effect.flatMap(ConversationStore, (store) => store.listFor(actor));

/** 대화 하나와 그 말. 열 수 없으면 `null` 이고 화면은 404 를 그린다 */
export const openConversation = (
    actor: Actor,
    conversationId: string,
): Effect.Effect<{ readonly conversation: Conversation; readonly messages: ReadonlyArray<Message> } | null, unknown, ConversationStore> =>
    Effect.gen(function*()
    {
        const store = yield* ConversationStore;
        const conversation = yield* store.findFor(actor, conversationId);

        if (conversation === null)
        {
            return null;
        }

        return { conversation, messages: yield* store.transcript(actor, conversationId) };
    });
