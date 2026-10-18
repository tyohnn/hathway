import { assert, describe, it } from "@effect/vitest";
import { Effect, type Layer } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import { customerActor, operatorActor } from "@hathway/access/testing/actor";

import { ConversationStore } from "../../ports/ConversationStore.ts";
import { canOpenConversation } from "../../rules/conversation.ts";

/**
 * 대화 장부의 계약. 메모리 구현과 Postgres 구현이 **같은 코드로** 돈다.
 *
 * ⚠ **대화 번호를 검사마다 새로 짓는다.** Postgres 는 여러 검사가 한 표를 함께 쓴다.
 * ⚠ **테넌트와 계정은 `supabase/seed.sql` 의 고정 id 다.** 운영팀 1 의 계정 1 과 7, 고객사 2 의 계정 2 다.
 */
export type MakeConversationStore = () => Effect.Effect<Layer.Layer<ConversationStore>>;

const freshId = (): string => `wrun_contract_${crypto.randomUUID().replaceAll("-", "")}`;

export const conversationStoreContract = (name: string, make: MakeConversationStore): void =>
{
    const within = <A, E>(program: Effect.Effect<A, E, ConversationStore>) =>
        Effect.gen(function*()
        {
            const layer = yield* make();

            return yield* program.pipe(Effect.provide(layer));
        });

    describe(`대화 장부 (${name})`, () =>
    {
        it.effect("INV-AGENT-01 목록과 찾기는 도메인 술어가 고르는 것과 같은 집합이다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* ConversationStore;
                const opened = [
                    { id: freshId(), tenantId: "1", startedBy: "1", title: "하나" },
                    { id: freshId(), tenantId: "1", startedBy: "7", title: "둘" },
                    { id: freshId(), tenantId: "2", startedBy: "2", title: "셋" },
                ];

                for (const request of opened)
                {
                    yield* store.open(request);
                }

                const ids = new Set(opened.map((request) => request.id));
                const actors: ReadonlyArray<Actor> = [operatorActor("1"), operatorActor("7"), customerActor("2"), customerActor("1")];

                for (const actor of actors)
                {
                    const listed = (yield* store.listFor(actor)).filter((row) => ids.has(row.id));
                    const expected = opened.filter((request) =>
                        canOpenConversation(actor, { ...request, status: "open", startedAt: "" }));

                    assert.deepStrictEqual(
                        listed.map((row) => row.id).slice().sort(),
                        expected.map((request) => request.id).slice().sort(),
                        `계정 ${actor.accountId} · 테넌트 ${actor.tenantId}`,
                    );

                    for (const request of opened)
                    {
                        const found = yield* store.findFor(actor, request.id);

                        assert.strictEqual(found !== null, expected.includes(request));
                    }
                }
            })));

        it.effect("여는 쓰기를 다시 해도 한 줄이고 먼저 적힌 제목이 남는다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* ConversationStore;
                const id = freshId();

                yield* store.open({ id, tenantId: "1", startedBy: "1", title: "처음" });
                yield* store.open({ id, tenantId: "1", startedBy: "1", title: "다시" });

                const found = yield* store.findFor(operatorActor("1"), id);

                assert.strictEqual(found?.title, "처음");
                assert.strictEqual(found?.status, "open");
                assert.strictEqual((yield* store.listFor(operatorActor("1"))).filter((row) => row.id === id).length, 1);
            })));

        it.effect("INV-AGENT-03 같은 key 로 두 번 적어도 말은 한 줄이고 적힌 차례대로 돌아온다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* ConversationStore;
                const id = freshId();

                yield* store.open({ id, tenantId: "1", startedBy: "1", title: "차례" });
                yield* store.append({ conversationId: id, key: "turn-0-user", role: "user", text: "안녕" });
                yield* store.append({ conversationId: id, key: "turn-0-assistant", role: "assistant", text: "반가워요" });
                yield* store.append({ conversationId: id, key: "turn-0-user", role: "user", text: "안녕" });

                const said = yield* store.transcript(operatorActor("1"), id);

                assert.deepStrictEqual(said.map((message) => [message.role, message.text]), [
                    ["user", "안녕"],
                    ["assistant", "반가워요"],
                ]);
            })));

        it.effect("INV-AGENT-01 열 수 없는 대화의 말은 빈 목록이다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* ConversationStore;
                const id = freshId();

                yield* store.open({ id, tenantId: "1", startedBy: "1", title: "남의 것" });
                yield* store.append({ conversationId: id, key: "turn-0-user", role: "user", text: "비밀" });

                assert.deepStrictEqual(yield* store.transcript(operatorActor("7"), id), []);
            })));

        it.effect("닫은 대화는 닫힌 채로 읽힌다", () =>
            within(Effect.gen(function*()
            {
                const store = yield* ConversationStore;
                const id = freshId();

                yield* store.open({ id, tenantId: "1", startedBy: "1", title: "닫기" });
                yield* store.close(id);

                assert.strictEqual((yield* store.findFor(operatorActor("1"), id))?.status, "closed");
            })));
    });
};
