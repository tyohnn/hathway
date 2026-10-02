import { describe, expect, it } from "vitest";

import { clampCompleted, hasTrack, toPercent } from "./ratio";

describe("hasTrack", () =>
{
    it("total 이 0 이하이면 그릴 눈금이 없다", () =>
    {
        expect(hasTrack(9)).toBe(true);
        expect(hasTrack(0)).toBe(false);
        expect(hasTrack(-3)).toBe(false);
    });

    it("수가 아닌 total 도 눈금이 없다", () =>
    {
        expect(hasTrack(Number.NaN)).toBe(false);
        expect(hasTrack(Number.POSITIVE_INFINITY)).toBe(false);
    });
});

describe("clampCompleted", () =>
{
    it("범위 안의 값은 그대로 둔다", () =>
    {
        expect(clampCompleted(8, 9)).toBe(8);
    });

    it("total 을 넘친 값은 total 로 접는다", () =>
    {
        expect(clampCompleted(12, 9)).toBe(9);
    });

    it("음수와 수가 아닌 값은 0 이다", () =>
    {
        expect(clampCompleted(-4, 9)).toBe(0);
        expect(clampCompleted(Number.NaN, 9)).toBe(0);
    });

    it("눈금이 없으면 끝난 수도 0 이다", () =>
    {
        expect(clampCompleted(3, 0)).toBe(0);
    });
});

describe("toPercent", () =>
{
    it("끝난 수를 전체로 나눈 백분율이다", () =>
    {
        expect(toPercent(0, 9)).toBe(0);
        expect(toPercent(9, 9)).toBe(100);
        expect(toPercent(1, 4)).toBe(25);
    });

    it("0 으로 나누지 않는다", () =>
    {
        expect(toPercent(3, 0)).toBe(0);
        expect(toPercent(3, -1)).toBe(0);
    });

    it("넘친 값은 100 을 넘지 않는다", () =>
    {
        expect(toPercent(12, 9)).toBe(100);
    });

    it("음수는 0 아래로 내려가지 않는다", () =>
    {
        expect(toPercent(-5, 9)).toBe(0);
    });
});
