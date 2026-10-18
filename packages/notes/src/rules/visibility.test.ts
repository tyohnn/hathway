import { assert, describe, it } from "@effect/vitest";

import { customerActor, operatorActor, otherCustomerActor } from "@hathway/access/testing/actor";

import type { Note } from "../domain/Note.ts";
import { canSeeNote, visibleNotes } from "./visibility.ts";

const note = (over: Partial<Note> = {}): Note => ({
    id: "1",
    tenantId: "2",
    authorId: "10",
    title: "분기 계획",
    body: "",
    visibility: "tenant",
    status: "active",
    version: 1,
    createdAt: "2026-09-29T00:00:00.000Z",
    ...over,
});

describe("쪽지를 볼 수 있는가", () =>
{
    it("INV-NOTE-01 같은 테넌트의 공개 쪽지는 쓴 사람이 아니어도 보인다", () =>
    {
        assert.isTrue(canSeeNote(customerActor("11"), note()));
    });

    it("INV-NOTE-01 비공개 쪽지는 쓴 사람에게만 보인다", () =>
    {
        const secret = note({ visibility: "private" });

        assert.isTrue(canSeeNote(customerActor("10"), secret));
        assert.isFalse(canSeeNote(customerActor("11"), secret));
    });

    it("INV-NOTE-01 다른 테넌트의 쪽지는 공개여도 보이지 않는다. 공개는 그 테넌트 안의 공개다", () =>
    {
        assert.isFalse(canSeeNote(otherCustomerActor("11"), note()));
    });

    it("INV-NOTE-01 계정 번호가 같아도 테넌트가 다르면 비공개 쪽지는 보이지 않는다", () =>
    {
        assert.isFalse(canSeeNote(otherCustomerActor("10"), note({ visibility: "private" })));
    });

    it("INV-NOTE-01 운영팀이라고 고객사의 쪽지를 보지 않는다. 우회는 이 함수 밖에 두지 않는다", () =>
    {
        assert.isFalse(canSeeNote(operatorActor("1", { role: "owner" }), note()));
    });

    it("INV-NOTE-02 볼 수 없는 쪽지는 목록에서 빠진다. 거부가 아니라 부재다", () =>
    {
        const mine = note({ id: "1", visibility: "private" });
        const shared = note({ id: "2" });
        const others = note({ id: "3", tenantId: "3" });

        const seen = visibleNotes(customerActor("10"), [mine, shared, others]).map((each) => each.id);

        assert.deepStrictEqual(seen, ["1", "2"]);
    });
});
