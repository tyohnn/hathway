import { assert, describe, it } from "@effect/vitest";

import { customerActor } from "@hathway/access/testing/actor";

import { BODY_MAX, draftNote, TITLE_MAX } from "./draft.ts";

describe("새 쪽지를 세운다", () =>
{
    it("테넌트와 쓴 사람은 행위자에게서 온다. 입력이 고를 수 있는 칸이 아니다", () =>
    {
        const verdict = draftNote(customerActor("10"), { title: "회의", body: "", visibility: "tenant" });

        assert.strictEqual(verdict._tag, "Accepted");
        assert.strictEqual(verdict._tag === "Accepted" && verdict.note.tenantId, "2");
        assert.strictEqual(verdict._tag === "Accepted" && verdict.note.authorId, "10");
    });

    it("제목과 본문의 앞뒤 공백을 걷어 적는다", () =>
    {
        const verdict = draftNote(customerActor("10"), { title: "  회의  ", body: " 안건 \n", visibility: "private" });

        assert.strictEqual(verdict._tag === "Accepted" && verdict.note.title, "회의");
        assert.strictEqual(verdict._tag === "Accepted" && verdict.note.body, "안건");
    });

    it("공백만 적은 제목은 거절한다. 목록에서 가리킬 이름이 없다", () =>
    {
        const verdict = draftNote(customerActor("10"), { title: "   ", body: "", visibility: "tenant" });

        assert.strictEqual(verdict._tag === "Rejected" && verdict.field, "title");
    });

    it("제목의 한도는 글자 수로 센다. 한글과 이모지가 바이트로 세어져 먼저 잘리지 않는다", () =>
    {
        const exact = draftNote(customerActor("10"), { title: "가".repeat(TITLE_MAX), body: "", visibility: "tenant" });
        const over = draftNote(customerActor("10"), { title: "🙂".repeat(TITLE_MAX + 1), body: "", visibility: "tenant" });

        assert.strictEqual(exact._tag, "Accepted");
        assert.strictEqual(over._tag === "Rejected" && over.field, "title");
    });

    it("본문이 한도를 넘으면 거절한다", () =>
    {
        const verdict = draftNote(customerActor("10"), { title: "회의", body: "가".repeat(BODY_MAX + 1), visibility: "tenant" });

        assert.strictEqual(verdict._tag === "Rejected" && verdict.field, "body");
    });
});
