import { assert, describe, it } from "@effect/vitest";

import { customerActor, operatorActor } from "@hathway/access/testing/actor";

import type { Conversation } from "../domain/Conversation.ts";
import { canOpenConversation, canTalk, TITLE_LENGTH, titleOf } from "./conversation.ts";

const conversation = (over: Partial<Conversation> = {}): Conversation => ({
    id: "wrun_01",
    tenantId: "1",
    startedBy: "1",
    title: "쪽지 정리",
    status: "open",
    startedAt: "2026-09-29T00:00:00.000Z",
    ...over,
});

describe("대화를 열 수 있는가", () =>
{
    it("INV-AGENT-01 대화를 연 사람은 다시 열고 이어 말한다", () =>
    {
        assert.isTrue(canOpenConversation(operatorActor("1"), conversation()));
        assert.isTrue(canTalk(operatorActor("1"), conversation()));
    });

    it("INV-AGENT-01 같은 운영팀의 다른 사람은 실행 번호를 알아도 열지 못한다", () =>
    {
        assert.isFalse(canOpenConversation(operatorActor("7"), conversation()));
    });

    it("INV-AGENT-01 같은 사람이라도 다른 테넌트로 들어왔으면 열지 못한다", () =>
    {
        assert.isFalse(canOpenConversation(customerActor("1"), conversation()));
    });

    it("닫힌 대화는 열어 보되 말을 더 걸지 못한다. 워크플로가 이미 돌아갔다", () =>
    {
        const closed = conversation({ status: "closed" });

        assert.isTrue(canOpenConversation(operatorActor("1"), closed));
        assert.isFalse(canTalk(operatorActor("1"), closed));
    });
});

describe("대화의 제목", () =>
{
    it("첫 말의 첫 줄이 제목이 된다", () =>
    {
        assert.strictEqual(titleOf("  내 쪽지를 정리해 줘\n자세히는 이렇다"), "내 쪽지를 정리해 줘");
    });

    it("긴 첫 줄은 글자 수로 자르고 말줄임표를 단다", () =>
    {
        const title = titleOf("가".repeat(TITLE_LENGTH + 5));

        assert.strictEqual([...title].length, TITLE_LENGTH + 1);
        assert.isTrue(title.endsWith("…"));
    });

    it("빈 말이면 자리표시 제목을 단다. 목록에 빈 줄이 서지 않는다", () =>
    {
        assert.strictEqual(titleOf("   "), "새 대화");
    });
});
