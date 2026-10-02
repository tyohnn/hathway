import { describe, expect, it } from "vitest";

import {
    FACET_ALL_VALUE,
    clearConditions,
    hasCondition,
    parseFilterState,
    resolvePillValues,
    serializeFilterState,
    setFacetValues,
    toggleFacetValue,
} from "./filter-state";

describe("hasCondition", () =>
{
    it("빈 값과 정렬만 있는 값은 조건이 없다", () =>
    {
        expect(hasCondition({})).toBe(false);
        expect(hasCondition({ sort: "recent" })).toBe(false);
        expect(hasCondition({ search: "", facets: {} })).toBe(false);
    });

    it("검색어나 패싯 어느 하나라도 있으면 조건이다", () =>
    {
        expect(hasCondition({ search: "투자계약" })).toBe(true);
        expect(hasCondition({ facets: { status: ["done"] } })).toBe(true);
    });

    it("빈 배열만 남은 패싯은 조건이 아니다", () =>
    {
        expect(hasCondition({ facets: { status: [] } })).toBe(false);
    });
});

describe("clearConditions", () =>
{
    it("정렬만 남기고 나머지를 걷는다", () =>
    {
        expect(clearConditions({
            search: "투자계약",
            facets: { status: ["done"], lawyer: ["kim"] },
            sort: "recent",
        })).toEqual({ sort: "recent" });
    });

    it("알약 줄도 함께 걷힌다 — 초기화는 「전체」 로 돌아가는 것이다", () =>
    {
        expect(hasCondition(clearConditions({ facets: { status: ["pending"] } }))).toBe(false);
    });
});

describe("setFacetValues", () =>
{
    it("빈 배열이면 키를 통째로 뺀다", () =>
    {
        expect(setFacetValues({ facets: { status: ["done"] } }, "status", []).facets).toEqual({});
    });

    it("다른 키는 그대로 둔다", () =>
    {
        const value = { facets: { status: ["done"], lawyer: ["kim"] } };

        expect(setFacetValues(value, "status", ["review"]).facets).toEqual({
            status: ["review"],
            lawyer: ["kim"],
        });
    });
});

describe("toggleFacetValue", () =>
{
    it("없던 값은 더하고 있던 값은 뺀다", () =>
    {
        const added = toggleFacetValue({}, "status", "done");

        expect(added.facets).toEqual({ status: ["done"] });
        expect(toggleFacetValue(added, "status", "done").facets).toEqual({});
    });

    it("마지막 값이 빠지면 키를 통째로 뺀다", () =>
    {
        const value = { facets: { status: ["done"], lawyer: ["kim"] } };

        expect(toggleFacetValue(value, "status", "done").facets).toEqual({ lawyer: ["kim"] });
    });

    it("원본을 바꾸지 않는다", () =>
    {
        const value = { facets: { status: ["done"] } };

        toggleFacetValue(value, "status", "review");

        expect(value.facets.status).toEqual(["done"]);
    });

    it("다른 축은 그대로 둔다", () =>
    {
        expect(toggleFacetValue({ search: "계약", sort: "recent" }, "status", "done")).toEqual({
            search: "계약",
            sort: "recent",
            facets: { status: ["done"] },
        });
    });
});

describe("resolvePillValues", () =>
{
    it("고른 값이 여럿이면 여럿 그대로 담긴다 — 다중 선택이다", () =>
    {
        expect(resolvePillValues({}, "status", ["pending", "review"]).facets).toEqual({
            status: ["pending", "review"],
        });
    });

    it("「전체」 를 새로 누르면 나머지가 전부 꺼진다", () =>
    {
        const value = { facets: { status: ["pending", "review"] } };

        expect(resolvePillValues(value, "status", ["pending", "review", FACET_ALL_VALUE]).facets)
            .toEqual({});
    });

    it("「전체」 가 눌려 있는 채로 다른 값을 누르면 「전체」 가 빠진다", () =>
    {
        // 「전체」 는 값이 없는 상태이므로 facets 에 담겨 있지 않다. ToggleGroup 만 그것을 눌러서 준다.
        expect(resolvePillValues({}, "status", [FACET_ALL_VALUE, "pending"]).facets).toEqual({
            status: ["pending"],
        });
    });

    it("마지막 값을 꺼서 빈 배열이 오면 「전체」 와 같은 상태가 된다", () =>
    {
        expect(hasCondition(resolvePillValues({ facets: { status: ["pending"] } }, "status", [])))
            .toBe(false);
    });

    it("다른 축은 건드리지 않는다", () =>
    {
        expect(resolvePillValues({ search: "계약", sort: "recent" }, "status", ["done"])).toEqual({
            search: "계약",
            sort: "recent",
            facets: { status: ["done"] },
        });
    });
});

describe("serializeFilterState", () =>
{
    it("빈 값은 아무것도 적지 않는다", () =>
    {
        expect(serializeFilterState({}).toString()).toBe("");
        expect(serializeFilterState({ search: "", facets: { status: [] } }).toString()).toBe("");
    });

    it("패싯은 배치와 무관하게 f.<키> 로 반복한다", () =>
    {
        const params = serializeFilterState({
            sort: "recent",
            search: "투자 계약",
            facets: { status: ["review", "done"], lawyer: ["kim"] },
        });

        expect(params.getAll("f.status")).toEqual(["review", "done"]);
        expect(params.getAll("f.lawyer")).toEqual(["kim"]);
        expect(params.get("q")).toBe("투자 계약");
        expect(params.get("sort")).toBe("recent");
    });

    it("「전체」 자리표시자는 값이 아니므로 적히지 않는다", () =>
    {
        const params = serializeFilterState(resolvePillValues({}, "status", [FACET_ALL_VALUE]));

        expect(params.toString()).toBe("");
    });
});

describe("parseFilterState", () =>
{
    it("직렬화의 역이다", () =>
    {
        const value = {
            sort: "recent",
            search: "투자계약",
            facets: { status: ["review", "done"], lawyer: ["kim"] },
        };

        expect(parseFilterState(serializeFilterState(value))).toEqual(value);
    });

    it("모르는 키와 빈 값은 무시한다", () =>
    {
        const params = new URLSearchParams("page=3&f.=x&f.status=&q=&seg=done");

        expect(parseFilterState(params)).toEqual({});
    });

    it("적히지 않은 축은 필드 자체가 없다", () =>
    {
        expect(parseFilterState(new URLSearchParams("f.status=done"))).toEqual({
            facets: { status: ["done"] },
        });
    });
});
