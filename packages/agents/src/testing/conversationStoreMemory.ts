import { Effect, Layer, Ref } from "effect";

import type { Conversation, Message } from "../domain/Conversation.ts";
import { ConversationStore } from "../ports/ConversationStore.ts";
import { canOpenConversation } from "../rules/conversation.ts";

/**
 * 대화 장부의 메모리 구현. 계약이 도커 없이 도는 자리이고 앱의 유스케이스 검사가 이것을 쓴다.
 *
 * ⚠ **읽기가 술어를 그대로 부른다.** Postgres 구현은 같은 조건을 SQL 로 적고 계약 테스트가 둘을 대조한다.
 */
interface StoredMessage extends Message
{
    readonly key: string;
}

export const conversationStoreMemory = (
    clock: () => string = () => "2026-09-29T00:00:00.000Z",
): Effect.Effect<Layer.Layer<ConversationStore>> =>
    Effect.gen(function*()
    {
        const conversations = yield* Ref.make<ReadonlyArray<Conversation>>([]);
        const messages = yield* Ref.make<ReadonlyArray<StoredMessage>>([]);
        const nextId = yield* Ref.make(1);

        return Layer.succeed(ConversationStore, ConversationStore.of({
            open: (request) =>
                Ref.update(conversations, (rows) =>
                    rows.some((row) => row.id === request.id)
                        ? rows
                        : [...rows, { ...request, status: "open" as const, startedAt: clock() }]),

            append: (request) =>
                Effect.gen(function*()
                {
                    const rows = yield* Ref.get(messages);

                    if (rows.some((row) => row.conversationId === request.conversationId && row.key === request.key))
                    {
                        return;
                    }

                    const id = yield* Ref.getAndUpdate(nextId, (value) => value + 1);

                    yield* Ref.update(messages, (current) => [
                        ...current,
                        { ...request, id: String(id), createdAt: clock() },
                    ]);
                }),

            close: (conversationId) =>
                Ref.update(conversations, (rows) =>
                    rows.map((row) => (row.id === conversationId ? { ...row, status: "closed" as const } : row))),

            listFor: (actor) =>
                Ref.get(conversations).pipe(Effect.map((rows) =>
                    rows.filter((row) => canOpenConversation(actor, row)).slice().reverse())),

            findFor: (actor, conversationId) =>
                Ref.get(conversations).pipe(Effect.map((rows) =>
                {
                    const found = rows.find((row) => row.id === conversationId);

                    return found !== undefined && canOpenConversation(actor, found) ? found : null;
                })),

            transcript: (actor, conversationId) =>
                Effect.gen(function*()
                {
                    const found = (yield* Ref.get(conversations)).find((row) => row.id === conversationId);

                    if (found === undefined || !canOpenConversation(actor, found))
                    {
                        return [];
                    }

                    return (yield* Ref.get(messages))
                        .filter((row) => row.conversationId === conversationId)
                        .map(({ key: _key, ...message }) => message);
                }),
        }));
    });
