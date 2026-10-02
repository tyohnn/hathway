import { describe, expect, it } from "vitest";

import { mergeTags, splitTags } from "./tags";

describe("splitTags", () =>
{
    it("쉼표·세미콜론·줄바꿈·탭으로 나누고 앞뒤 공백을 버린다", () =>
    {
        expect(splitTags(" a@x.kr, b@x.kr;c@x.kr\nd@x.kr\te@x.kr ")).toEqual([
            "a@x.kr",
            "b@x.kr",
            "c@x.kr",
            "d@x.kr",
            "e@x.kr",
        ]);
    });

    it("빈 조각은 버린다", () =>
    {
        expect(splitTags(",, ,\n")).toEqual([]);
    });
});

describe("mergeTags", () =>
{
    it("이미 있는 것은 중복으로 가른다", () =>
    {
        const result = mergeTags(["a"], ["a", "b"]);

        expect(result.value).toEqual(["a", "b"]);
        expect(result.duplicates).toEqual(["a"]);
        expect(result.overflow).toEqual([]);
    });

    it("상한을 넘는 것은 넣지 않고 따로 돌려준다", () =>
    {
        const result = mergeTags(["a"], ["b", "c"], 2);

        expect(result.value).toEqual(["a", "b"]);
        expect(result.overflow).toEqual(["c"]);
    });

    it("들어온 것 안의 중복도 한 번만 넣는다", () =>
    {
        const result = mergeTags([], ["a", "a"]);

        expect(result.value).toEqual(["a"]);
        expect(result.duplicates).toEqual(["a"]);
    });
});
