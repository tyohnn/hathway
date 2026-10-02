import { describe, expect, it } from "vitest";

import { collectRange, isInRange, moveCell, normalizeRange } from "./cell-range";

/** 「셀 범위 선택의 산술」. 앵커와 포커스 어느 쪽이 앞이든 같은 범위다. */
describe("셀 범위", () =>
{
    it("앵커와 포커스의 순서와 무관하게 같은 범위가 된다", () =>
    {
        const a = normalizeRange({ row: 3, col: 1 }, { row: 1, col: 4 });
        const b = normalizeRange({ row: 1, col: 4 }, { row: 3, col: 1 });

        expect(a).toEqual({ minRow: 1, maxRow: 3, minCol: 1, maxCol: 4 });
        expect(b).toEqual(a);
        expect(isInRange(a, { row: 2, col: 4 })).toBe(true);
        expect(isInRange(a, { row: 4, col: 4 })).toBe(false);
    });

    it("방향키 이동은 표 경계에서 멈춘다", () =>
    {
        const bounds = { rows: 3, cols: 4 };

        expect(moveCell({ row: 0, col: 0 }, "ArrowUp", bounds)).toEqual({ row: 0, col: 0 });
        expect(moveCell({ row: 2, col: 3 }, "ArrowRight", bounds)).toEqual({ row: 2, col: 3 });
        expect(moveCell({ row: 1, col: 1 }, "ArrowDown", bounds)).toEqual({ row: 2, col: 1 });
        expect(moveCell({ row: 1, col: 2 }, "Home", bounds)).toEqual({ row: 1, col: 0 });
        expect(moveCell({ row: 1, col: 2 }, "End", bounds)).toEqual({ row: 1, col: 3 });
    });

    it("범위를 읽어 행렬로 만든다", () =>
    {
        const range = normalizeRange({ row: 0, col: 1 }, { row: 1, col: 2 });

        expect(collectRange(range, (row, col) => `${row}:${col}`)).toEqual([["0:1", "0:2"], ["1:1", "1:2"]]);
    });
});
