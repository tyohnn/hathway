import { Schema } from "effect";

/**
 * 에이전트와 나눈 대화 하나.
 *
 * ⚠ **id 는 워크플로의 실행 번호다.** 실행 하나가 대화 하나라서(`apps/agent/src/workflows/chat.ts`) 그 번호가
 *    곧 대화의 주소다. 우리가 따로 번호를 지으면 한 대화에 이름이 둘이 되고, 둘이 어긋난 날 어느 쪽이
 *    옳은지 답할 자리가 없다.
 * ⚠ **대화의 정본은 둘로 나뉜다.** 모델이 읽는 맥락은 워크플로가 들고, 사람이 다시 열어 볼 말은 이
 *    장부가 든다. 워크플로의 스트림은 모델의 출력만 담고 사람이 한 말은 담지 않는다.
 */
export const ConversationStatus = Schema.Literals(["open", "closed"]);

export type ConversationStatus = typeof ConversationStatus.Type;

export const Conversation = Schema.Struct({
    id: Schema.NonEmptyString,
    tenantId: Schema.NonEmptyString,
    startedBy: Schema.NonEmptyString,
    title: Schema.String,
    status: ConversationStatus,
    startedAt: Schema.String,
});

export type Conversation = typeof Conversation.Type;

export const MessageRole = Schema.Literals(["user", "assistant"]);

export type MessageRole = typeof MessageRole.Type;

export const Message = Schema.Struct({
    id: Schema.NonEmptyString,
    conversationId: Schema.NonEmptyString,
    role: MessageRole,
    text: Schema.String,
    createdAt: Schema.String,
});

export type Message = typeof Message.Type;
