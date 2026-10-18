import { assert, describe, it } from "@effect/vitest";

import { customerActor, otherCustomerActor } from "@hathway/access/testing/actor";

import type { Note } from "../domain/Note.ts";
import { archiveVerdict } from "./archive.ts";

const note = (over: Partial<Note> = {}): Note => ({
    id: "1",
    tenantId: "2",
    authorId: "10",
    title: "분기 계획",
    body: "",
    visibility: "tenant",
    status: "active",
    version: 3,
    createdAt: "2026-09-29T00:00:00.000Z",
    ...over,
});

describe("쪽지를 보관할 수 있는가", () =>
{
    it("INV-NOTE-03 쓴 사람이 열었을 때의 판으로 보관한다", () =>
    {
        assert.strictEqual(archiveVerdict(customerActor("10"), note(), 3)._tag, "Allowed");
    });

    it("INV-NOTE-03 같은 테넌트의 다른 사람은 보여도 보관하지 못한다", () =>
    {
        assert.strictEqual(archiveVerdict(customerActor("11"), note(), 3)._tag, "NotAuthor");
    });

    it("INV-NOTE-02 볼 수 없는 쪽지는 쓴 사람이 아니라는 답 대신 없는 것으로 답한다", () =>
    {
        assert.strictEqual(archiveVerdict(otherCustomerActor("11"), note(), 3)._tag, "NotFound");
        assert.strictEqual(archiveVerdict(customerActor("11"), note({ visibility: "private" }), 3)._tag, "NotFound");
    });

    it("INV-NOTE-02 없는 쪽지도 같은 답이다", () =>
    {
        assert.strictEqual(archiveVerdict(customerActor("10"), null, 1)._tag, "NotFound");
    });

    it("INV-NOTE-03 연 뒤에 판이 바뀌었으면 덮어쓰지 않고 지금의 판을 알려 준다", () =>
    {
        const verdict = archiveVerdict(customerActor("10"), note({ version: 4 }), 3);

        assert.deepStrictEqual(verdict, { _tag: "Stale", current: 4 });
    });

    it("INV-NOTE-04 이미 보관한 쪽지는 다시 보관하지 않는다. 보관은 한 방향이다", () =>
    {
        assert.strictEqual(archiveVerdict(customerActor("10"), note({ status: "archived" }), 3)._tag, "AlreadyArchived");
    });
});
