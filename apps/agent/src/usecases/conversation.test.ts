import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { customerActor, operatorActor } from "@hathway/access/testing/actor";
import type { ConversationStore } from "@hathway/agents/ports/ConversationStore";
import { ConversationStore as Store } from "@hathway/agents/ports/ConversationStore";
import { conversationStoreMemory } from "@hathway/agents/testing/conversationStoreMemory";

import { followUp, MESSAGE_MAX, openConversation, sayVerdict } from "./conversation";

/**
 * 대화 유스케이스. 훅을 깨우는 일은 가짜 함수로 바꿔 끼우고 장부는 메모리 구현으로 돈다.
 */
const run = <A>(program: Effect.Effect<A, unknown, ConversationStore>) =>
    Effect.gen(function*()
    {
        const layer = yield* conversationStoreMemory();

        return yield* program.pipe(Effect.provide(layer));
    });

const opened = (id: string, startedBy = "1", tenantId = "1") =>
    Effect.flatMap(Store, (store) => store.open({ id, tenantId, startedBy, title: "대화" }));

describe("말을 다듬는다", () =>
{
    it("앞뒤 공백을 걷고 메시지 id 로 장부의 key 를 짓는다", () =>
    {
        assert.deepStrictEqual(sayVerdict({ messageId: "m1", text: "  안녕 " }), { _tag: "Accepted", text: "안녕", key: "user:m1" });
    });

    it("빈 말과 한도를 넘는 말은 거절한다", () =>
    {
        assert.strictEqual(sayVerdict({ messageId: "m1", text: " " })._tag, "Rejected");
        assert.strictEqual(sayVerdict({ messageId: "m1", text: "가".repeat(MESSAGE_MAX + 1) })._tag, "Rejected");
    });
});

describe("도는 대화에 말을 더 건다", () =>
{
    it("INV-AGENT-01 연 사람의 말은 훅으로 건넨다", () =>
        run(Effect.gen(function*()
        {
            const delivered: Array<[string, string]> = [];

            yield* opened("wrun_a");

            const outcome = yield* followUp(operatorActor("1"), "wrun_a", { messageId: "m2", text: "이어서" }, async (key, text) =>
            {
                delivered.push([key, text]);
            });

            assert.strictEqual(outcome._tag, "Delivered");
            assert.deepStrictEqual(delivered, [["user:m2", "이어서"]]);
        })));

    it("INV-AGENT-01 남의 대화는 번호를 알아도 없는 것이고 훅을 깨우지 않는다", () =>
        run(Effect.gen(function*()
        {
            let woke = false;

            yield* opened("wrun_b");

            const other = yield* followUp(operatorActor("7"), "wrun_b", { messageId: "m", text: "끼어들기" }, async () =>
            {
                woke = true;
            });
            const crossTenant = yield* followUp(customerActor("1"), "wrun_b", { messageId: "m", text: "끼어들기" }, async () =>
            {
                woke = true;
            });

            assert.strictEqual(other._tag, "NotFound");
            assert.strictEqual(crossTenant._tag, "NotFound");
            assert.isFalse(woke);
        })));

    it("닫힌 대화에는 말을 걸지 않는다. 워크플로가 이미 돌아가서 훅이 없다", () =>
        run(Effect.gen(function*()
        {
            yield* opened("wrun_c");
            yield* Effect.flatMap(Store, (store) => store.close("wrun_c"));

            const outcome = yield* followUp(operatorActor("1"), "wrun_c", { messageId: "m", text: "더" }, async () => undefined);

            assert.strictEqual(outcome._tag, "Closed");
        })));

    it("INV-AGENT-01 남의 대화는 열어도 없는 것이다", () =>
        run(Effect.gen(function*()
        {
            yield* opened("wrun_d");

            assert.isNotNull(yield* openConversation(operatorActor("1"), "wrun_d"));
            assert.isNull(yield* openConversation(operatorActor("7"), "wrun_d"));
        })));
});
