import { assert, describe, it } from "vitest";

import type { Note } from "@hathway/notes/domain/Note";

import { MENTION_LIMIT, mentionItems, noteCards, noteIdOf, settingsChanges, settingsReadResult, settingsValues } from "./views";

const note = (id: number, over: Partial<Note> = {}): Note => ({
    id: String(id),
    tenantId: "2",
    authorId: "2",
    title: `쪽지 ${id}`,
    body: "",
    visibility: "tenant",
    status: "active",
    version: 1,
    createdAt: "2026-10-02T00:00:00.000Z",
    ...over,
});

describe("화면과 도구에 싣는 모양", () =>
{
    it("실리는 것은 id · 제목 · 본문 · 공개 범위 · 보관 여부뿐이다. 테넌트와 쓴 사람의 id 는 싣지 않는다", () =>
    {
        assert.deepStrictEqual(noteCards([note(1, { body: "본문", visibility: "private" })], { defaultVisibility: "tenant", showArchived: false }), [
            { id: "1", title: "쪽지 1", body: "본문", visibility: "private", archived: false },
        ]);
    });

    it("보관한 쪽지는 설정을 켠 사람에게만 실린다", () =>
    {
        const notes = [note(1), note(2, { status: "archived" })];

        assert.deepStrictEqual(noteCards(notes, { defaultVisibility: "tenant", showArchived: false }).map((card) => card.id), ["1"]);
        assert.deepStrictEqual(
            noteCards(notes, { defaultVisibility: "tenant", showArchived: true }).map((card) => [card.id, card.archived]),
            [["1", false], ["2", true]],
        );
    });

    it("멘션은 빈 검색어에도 답하고 제목에서 대소문자를 가리지 않고 찾는다", () =>
    {
        const notes = [note(1, { title: "Roadmap 초안" }), note(2, { title: "회의 메모" })];

        assert.deepStrictEqual(mentionItems(notes, "").map((item) => item.uri), ["note://1", "note://2"]);
        assert.deepStrictEqual(mentionItems(notes, " roadmap "), [
            { type: "resource_link", uri: "note://1", name: "Roadmap 초안", title: "Roadmap 초안", mimeType: "text/markdown" },
        ]);
    });

    it("멘션에는 보관한 쪽지가 서지 않는다. 설정을 켜도 그렇다", () =>
    {
        assert.deepStrictEqual(mentionItems([note(1, { status: "archived" })], ""), []);
    });

    it("서른 개까지 돌려주고 서른한 번째는 싣지 않는다", () =>
    {
        const notes = Array.from({ length: MENTION_LIMIT + 1 }, (_, index) => note(index + 1));
        const items = mentionItems(notes, "");

        assert.strictEqual(MENTION_LIMIT, 30);
        assert.strictEqual(items.length, 30);
        assert.strictEqual(items[29]?.uri, "note://30");
    });

    it("note:// 주소에서 번호만 꺼낸다. 숫자가 아니면 쪽지가 아니다", () =>
    {
        assert.strictEqual(noteIdOf("note://12"), "12");
        assert.isNull(noteIdOf("note://12/../3"));
        assert.isNull(noteIdOf("note://"));
        assert.isNull(noteIdOf("file:///12"));
    });

    it("설정을 읽으면 모든 칸에 값이 있다", () =>
    {
        const result = settingsReadResult({ defaultVisibility: "tenant", showArchived: false });

        assert.deepStrictEqual(Object.keys(result.values).slice().sort(), Object.keys(result.schema.properties).slice().sort());
        assert.deepStrictEqual(result.values, settingsValues({ defaultVisibility: "tenant", showArchived: false }));
    });

    it("공개 범위는 사람이 읽는 말로 보이고 그 말로 돌아온다. 호스트가 선택지의 값을 그대로 그린다", () =>
    {
        const result = settingsReadResult({ defaultVisibility: "private", showArchived: true });
        const choices = result.schema.properties["defaultVisibility"]?.enum ?? [];

        assert.include(choices, result.values["defaultVisibility"]);
        assert.deepStrictEqual(settingsChanges({ defaultVisibility: result.values["defaultVisibility"], showArchived: false }), { defaultVisibility: "private", showArchived: false });
    });

    it("모르는 말과 모르는 칸은 바꾸지 않고 그대로 넘긴다. 받을지는 도메인의 판정이 정한다", () =>
    {
        assert.deepStrictEqual(settingsChanges({ defaultVisibility: "모두에게", tenantId: "3" }), { defaultVisibility: "모두에게", tenantId: "3" });
        assert.deepStrictEqual(settingsChanges("set"), {});
    });

    it("설정의 배치가 가리키는 칸과 도구는 있는 것이다", () =>
    {
        const result = settingsReadResult({ defaultVisibility: "tenant", showArchived: false });
        const items = (result.layout ?? []).flatMap((group) => group.items);

        for (const item of items)
        {
            if (item.kind === "property")
            {
                assert.property(result.schema.properties, item.property);
            }
        }

        assert.isAbove(items.filter((item) => item.kind === "tool").length, 0);
    });
});
