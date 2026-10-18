import { describe, expect, it } from "vitest";

import { filterMembers, type MemberLine } from "./roster";

const line = (over: Partial<MemberLine>): MemberLine =>
    ({ membershipId: "1", name: null, email: "", role: "member", pending: false, me: false, editable: false, ...over });

const LINES: ReadonlyArray<MemberLine> = [
    line({ membershipId: "1", name: "이고객", email: "lee@example.test", role: "owner" }),
    line({ membershipId: "2", name: "김고객", email: "Kim@example.test" }),
    line({ membershipId: "3", email: "invited@example.test", pending: true }),
];

const ids = (lines: ReadonlyArray<MemberLine>): ReadonlyArray<string> => lines.map((entry) => entry.membershipId);

describe("멤버 표의 조건", () =>
{
    it("조건이 없으면 받은 줄을 그대로 돌려준다", () =>
    {
        expect(ids(filterMembers(LINES, { query: "  ", role: "all" }))).toEqual(["1", "2", "3"]);
    });

    it("검색어는 이름과 이메일에서 찾고 대소문자를 가리지 않는다", () =>
    {
        expect(ids(filterMembers(LINES, { query: "고객", role: "all" }))).toEqual(["1", "2"]);
        expect(ids(filterMembers(LINES, { query: "kim@", role: "all" }))).toEqual(["2"]);
    });

    it("이름이 없는 사람(초대만 받은 사람)은 이메일로 찾는다", () =>
    {
        expect(ids(filterMembers(LINES, { query: "INVITED", role: "all" }))).toEqual(["3"]);
    });

    it("역할 조건과 검색어를 함께 건다", () =>
    {
        expect(ids(filterMembers(LINES, { query: "", role: "member" }))).toEqual(["2", "3"]);
        expect(ids(filterMembers(LINES, { query: "고객", role: "owner" }))).toEqual(["1"]);
        expect(ids(filterMembers(LINES, { query: "없는 사람", role: "member" }))).toEqual([]);
    });
});
