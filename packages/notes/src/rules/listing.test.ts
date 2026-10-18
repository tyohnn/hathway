import { assert, describe, it } from "@effect/vitest";

import type { Note } from "../domain/Note.ts";
import type { NotePage, NoteQuery } from "../domain/NoteQuery.ts";

import { noteQueryFrom, PAGE_SIZE, planListing, QUERY_MAX } from "./listing.ts";

/**
 * 쪽지 목록의 주소와 화면. 주소(`?q=` · `?page=`)는 사람이 손으로 고칠 수 있는 입력이라 질의로 바꾸기 전에 여기서 다듬는다.
 */
describe("목록의 주소를 질의로 바꾼다", () =>
{
    it("주소에 찾는 말도 쪽 번호도 없으면 첫 쪽의 전체 목록이다", () =>
    {
        assert.deepStrictEqual(noteQueryFrom({}), { q: "", page: 1, pageSize: PAGE_SIZE });
    });

    it("찾는 말의 앞뒤 공백은 지우고, 공백만이면 찾지 않는 것과 같다", () =>
    {
        assert.strictEqual(noteQueryFrom({ q: "  회의  " }).q, "회의");
        assert.strictEqual(noteQueryFrom({ q: "   " }).q, "");
    });

    it("쪽 번호가 숫자가 아니거나 1보다 작으면 첫 쪽이다", () =>
    {
        for (const page of ["abc", "0", "-3", "1.5", "2e3", ""])
        {
            assert.strictEqual(noteQueryFrom({ page }).page, 1, page);
        }

        assert.strictEqual(noteQueryFrom({ page: "3" }).page, 3);
    });

    it("같은 이름이 주소에 여러 번 오면 첫 값만 쓴다", () =>
    {
        assert.deepStrictEqual(noteQueryFrom({ q: ["회의", "안건"], page: ["2", "9"] }), { q: "회의", page: 2, pageSize: PAGE_SIZE });
    });

    it("찾는 말이 너무 길면 앞의 100자만 쓴다", () =>
    {
        const query = noteQueryFrom({ q: "가".repeat(QUERY_MAX) + "🙂".repeat(5) });

        assert.strictEqual(Array.from(query.q).length, QUERY_MAX);
        assert.strictEqual(QUERY_MAX, 100);
    });
});

const note = (id: number): Note => ({
    id: String(id),
    tenantId: "2",
    authorId: "2",
    title: `쪽지 ${id}`,
    body: "",
    visibility: "tenant",
    status: "active",
    version: 1,
    createdAt: "2026-10-06T00:00:00.000Z",
});

const query = (over: Partial<NoteQuery> = {}): NoteQuery => ({ q: "", page: 1, pageSize: PAGE_SIZE, ...over });

const pageOf = (count: number, total: number): NotePage => ({ notes: Array.from({ length: count }, (_, index) => note(index + 1)), total });

describe("목록 한 쪽을 그린다", () =>
{
    it("거름 없이 하나도 없으면 「아직 없음」이고 쓰기 단추가 선다", () =>
    {
        assert.deepStrictEqual(planListing(query(), pageOf(0, 0)), { kind: "none-yet" });
    });

    it("찾는 말이 있는데 맞는 것이 없으면 「조건에 맞는 것이 없음」이고 조건 지우기가 선다", () =>
    {
        assert.deepStrictEqual(planListing(query({ q: "없는 말" }), pageOf(0, 0)), {
            kind: "no-match",
            reason: "filter",
            back: query(),
        });
    });

    it("끝을 넘은 쪽 번호는 「조건에 맞는 것이 없음」으로 그리고 첫 쪽으로 가는 길을 준다", () =>
    {
        // 찾는 말은 그대로 두고 쪽만 처음으로 돌린다
        assert.deepStrictEqual(planListing(query({ q: "회의", page: 9 }), pageOf(0, 24)), {
            kind: "no-match",
            reason: "past-end",
            back: query({ q: "회의" }),
        });
    });

    it("발치는 「24개 중 21–24」처럼 세고, 첫 쪽에는 이전이 없고 끝 쪽에는 다음이 없다", () =>
    {
        const firstPage = planListing(query({ q: "회의" }), pageOf(20, 24));
        const lastPage = planListing(query({ q: "회의", page: 2 }), pageOf(4, 24));

        assert.strictEqual(firstPage.kind, "rows");
        assert.strictEqual(lastPage.kind, "rows");

        if (firstPage.kind === "rows" && lastPage.kind === "rows")
        {
            assert.deepStrictEqual({ from: firstPage.from, to: firstPage.to, total: firstPage.total }, { from: 1, to: 20, total: 24 });
            assert.isNull(firstPage.previous);
            assert.deepStrictEqual(firstPage.next, query({ q: "회의", page: 2 }));

            assert.deepStrictEqual({ from: lastPage.from, to: lastPage.to, total: lastPage.total }, { from: 21, to: 24, total: 24 });
            assert.deepStrictEqual(lastPage.previous, query({ q: "회의", page: 1 }));
            assert.isNull(lastPage.next);
        }
    });
});
