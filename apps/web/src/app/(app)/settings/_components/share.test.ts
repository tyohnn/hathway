import { describe, expect, it } from "vitest";

import { shareOf } from "./share";

describe("막대의 몫", () =>
{
    it("전체 가운데 몫을 정수 퍼센트로 준다", () =>
    {
        expect(shareOf(3, 20)).toBe(15);
        expect(shareOf(1, 3)).toBe(33);
    });

    it("다 차지 않았으면 100 이 아니고, 조금이라도 있으면 0 이 아니다", () =>
    {
        expect(shareOf(1496, 1500)).toBe(99);
        expect(shareOf(1, 300)).toBe(1);
    });

    it("몫이 없으면 0, 전체와 같거나 넘으면 100 이다", () =>
    {
        expect(shareOf(0, 50)).toBe(0);
        expect(shareOf(50, 50)).toBe(100);
        expect(shareOf(4, 3)).toBe(100);
    });

    it("전체가 0 이면 몫이 있을 때 100, 없을 때 0 이다", () =>
    {
        expect(shareOf(0, 0)).toBe(0);
        expect(shareOf(2, 0)).toBe(100);
    });
});
