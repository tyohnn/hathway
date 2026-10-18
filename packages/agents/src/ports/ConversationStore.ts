import { Context, type Effect, Schema } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";

import type { Conversation, Message, MessageRole } from "../domain/Conversation.ts";

/**
 * 대화의 장부. 구현은 메모리(`testing/conversationStoreMemory.ts`)와 Postgres
 * (`@hathway/adapters-postgres/agent/ConversationStorePostgres`) 둘이고 계약 테스트 한 벌이 둘을 잰다.
 *
 * ⚠ **읽는 메서드는 행위자를 받고 볼 수 있는 것만 돌려준다**(INV-AGENT-01). 판정의 정본은
 *    `rules/conversation.ts` 이고 질의가 그것과 같은 집합을 내는지는 계약 테스트가 잰다.
 * ⚠ **쓰는 메서드는 행위자를 받지 않는다.** 쓰는 쪽은 워크플로의 스텝이고, 스텝은 행위자를 나르지
 *    않는다(INV-AGENT-04). 누가 이 대화를 열었는지는 여는 쓰기가 받은 계정이 정하고, 그 계정은 서버
 *    액션의 관문을 지난 행위자에게서 왔다.
 * ⚠ **말을 적는 쓰기는 멱등이다**(INV-AGENT-03). 스텝이 다시 돌아도 같은 `key` 는 한 줄이다.
 */
export class ConversationStoreError extends Schema.TaggedError<ConversationStoreError>()(
    "ConversationStoreError",
    { message: Schema.String },
)
{}

export interface OpenRequest
{
    readonly id: string;
    readonly tenantId: string;
    readonly startedBy: string;
    readonly title: string;
}

export interface AppendRequest
{
    readonly conversationId: string;
    /** 같은 대화 안에서 이 말을 가리키는 이름. 다시 돈 스텝이 같은 이름을 들고 온다 */
    readonly key: string;
    readonly role: MessageRole;
    readonly text: string;
}

export class ConversationStore extends Context.Service<ConversationStore, {
    /** 이미 있으면 아무것도 바꾸지 않는다. 실행을 건 요청이 다시 와도 한 줄이다 */
    readonly open: (request: OpenRequest) => Effect.Effect<void, ConversationStoreError>;
    readonly append: (request: AppendRequest) => Effect.Effect<void, ConversationStoreError>;
    readonly close: (conversationId: string) => Effect.Effect<void, ConversationStoreError>;
    /** 이 사람이 연 대화. 최근에 연 것이 먼저다 */
    readonly listFor: (actor: Actor) => Effect.Effect<ReadonlyArray<Conversation>, ConversationStoreError>;
    /** 열 수 있으면 그 대화, 없거나 열 수 없으면 `null` 이다 */
    readonly findFor: (actor: Actor, conversationId: string) => Effect.Effect<Conversation | null, ConversationStoreError>;
    /** 적힌 차례대로의 말. 열 수 없는 대화면 빈 목록이다 */
    readonly transcript: (actor: Actor, conversationId: string) => Effect.Effect<ReadonlyArray<Message>, ConversationStoreError>;
}>()("@hathway/agents/ports/ConversationStore")
{}
