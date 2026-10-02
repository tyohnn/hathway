import { describe, expect, it } from "vitest";

import { matchesAll, matchesCondition } from "./rules";

describe("matchesCondition", () =>
{
    it("equals 는 값 하나도 목록도 받는다", () =>
    {
        expect(matchesCondition({ type: "hour" }, { field: "type", equals: "hour" })).toBe(true);
        expect(matchesCondition({ type: "hour" }, { field: "type", equals: ["hour", "prepaid"] })).toBe(true);
        expect(matchesCondition({ type: "subscription" }, { field: "type", equals: ["hour", "prepaid"] })).toBe(false);
    });

    it("notEquals 는 그 값이 아닐 때 참이다", () =>
    {
        expect(matchesCondition({ type: "hour" }, { field: "type", notEquals: "subscription" })).toBe(true);
        expect(matchesCondition({ type: "subscription" }, { field: "type", notEquals: "subscription" })).toBe(false);
    });

    it("없는 필드는 빈 값으로 본다", () =>
    {
        expect(matchesCondition({}, { field: "type", filled: false })).toBe(true);
        expect(matchesCondition({}, { field: "type", filled: true })).toBe(false);
    });

    it("적지 않은 축은 보지 않는다", () =>
    {
        expect(matchesCondition({ type: "hour" }, { field: "type" })).toBe(true);
    });
});

describe("matchesAll", () =>
{
    it("조건이 없으면 참이다", () =>
    {
        expect(matchesAll({})).toBe(true);
    });

    it("조건이 여럿이면 전부 참이어야 한다", () =>
    {
        const values = { type: "hour", company: "달램" };

        expect(matchesAll(values, [{ field: "type", equals: "hour" }, { field: "company", filled: true }])).toBe(true);
        expect(matchesAll(values, [{ field: "type", equals: "hour" }, { field: "company", filled: false }])).toBe(false);
    });
});
