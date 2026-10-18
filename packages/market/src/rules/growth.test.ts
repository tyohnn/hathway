import { describe, expect, it } from "vitest";

import { cagrPct, growthPct } from "./growth.ts";

describe("성장률", () =>
{
    it("성장률은 앞 값 대비 바뀐 만큼의 퍼센트이고 소수 첫째 자리까지다", () =>
    {
        expect(growthPct(100, 123.456)).toBe(23.5);
        expect(growthPct(200, 150)).toBe(-25);
    });

    it("앞 값이 없거나 0 이하면 성장률을 내지 않는다", () =>
    {
        expect(growthPct(null, 10)).toBeNull();
        expect(growthPct(10, null)).toBeNull();
        expect(growthPct(0, 10)).toBeNull();
        expect(growthPct(-5, 10)).toBeNull();
    });

    it("CAGR 은 첫 값에서 끝 값까지 해마다 같은 비율로 자랐다고 볼 때의 비율이다", () =>
    {
        // 100 → 133.1 을 3년이면 해마다 10%
        expect(cagrPct(100, 133.1, 3)).toBe(10);
    });

    it("첫 값이나 끝 값이 0 이하이거나 햇수가 0 이하면 CAGR 을 내지 않는다", () =>
    {
        expect(cagrPct(0, 100, 3)).toBeNull();
        expect(cagrPct(100, -1, 3)).toBeNull();
        expect(cagrPct(100, 200, 0)).toBeNull();
        expect(cagrPct(null, 200, 3)).toBeNull();
    });
});
