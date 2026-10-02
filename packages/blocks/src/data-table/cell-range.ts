import type { CellAddress, CellRange } from "./types";

/** 앵커와 포커스 어느 쪽이 앞이든 같은 범위다 */
export function normalizeRange(anchor: CellAddress, focus: CellAddress): CellRange
{
    return {
        minRow: Math.min(anchor.row, focus.row),
        maxRow: Math.max(anchor.row, focus.row),
        minCol: Math.min(anchor.col, focus.col),
        maxCol: Math.max(anchor.col, focus.col),
    };
}

export function isInRange(range: CellRange, cell: CellAddress): boolean
{
    return cell.row >= range.minRow && cell.row <= range.maxRow && cell.col >= range.minCol && cell.col <= range.maxCol;
}

export type NavigationKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Home" | "End";

export function isNavigationKey(key: string): key is NavigationKey
{
    return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End";
}

/** 방향키 이동. 표 경계에서 멈춘다 */
export function moveCell(cell: CellAddress, key: NavigationKey, bounds: { readonly rows: number; readonly cols: number }): CellAddress
{
    if (bounds.rows === 0 || bounds.cols === 0)
    {
        return cell;
    }

    const lastRow = bounds.rows - 1;
    const lastCol = bounds.cols - 1;

    switch (key)
    {
        case "ArrowUp":
            return { row: Math.max(0, cell.row - 1), col: cell.col };
        case "ArrowDown":
            return { row: Math.min(lastRow, cell.row + 1), col: cell.col };
        case "ArrowLeft":
            return { row: cell.row, col: Math.max(0, cell.col - 1) };
        case "ArrowRight":
            return { row: cell.row, col: Math.min(lastCol, cell.col + 1) };
        case "Home":
            return { row: cell.row, col: 0 };
        case "End":
            return { row: cell.row, col: lastCol };
    }
}

/** 범위를 행렬로 읽는다. 복사(TSV)의 입력이다 */
export function collectRange(range: CellRange, read: (row: number, col: number) => string): string[][]
{
    const matrix: string[][] = [];

    for (let row = range.minRow; row <= range.maxRow; row += 1)
    {
        const line: string[] = [];

        for (let col = range.minCol; col <= range.maxCol; col += 1)
        {
            line.push(read(row, col));
        }

        matrix.push(line);
    }

    return matrix;
}
