import type { Column } from "@tanstack/react-table";

import type { ColumnAlign, DataRow } from "./types";

/** 고정 열의 sticky 위치. 왼쪽은 시작 위치, 오른쪽은 끝에서의 거리다 */
export function pinStyle(column: Column<DataRow, unknown>): React.CSSProperties | undefined
{
    const pinned = column.getIsPinned();

    if (!pinned)
    {
        return undefined;
    }

    return {
        position: "sticky",
        zIndex: 1,
        width: column.getSize(),
        ...(pinned === "left" ? { left: column.getStart("left") } : { right: column.getAfter("right") }),
    };
}

/** 고정 열의 가장자리 표시. 마지막 왼쪽 고정 열과 첫 오른쪽 고정 열에 경계선을 긋는다 */
export function pinEdgeClass(column: Column<DataRow, unknown>): string | undefined
{
    const pinned = column.getIsPinned();

    if (pinned === "left" && column.getIsLastColumn("left"))
    {
        return "shadow-[inset_-1px_0_0_var(--border)]";
    }

    if (pinned === "right" && column.getIsFirstColumn("right"))
    {
        return "shadow-[inset_1px_0_0_var(--border)]";
    }

    return undefined;
}

export function alignClass(align: ColumnAlign | undefined): string
{
    switch (align)
    {
        case "end":
            return "text-right tabular-nums";
        case "center":
            return "text-center";
        default:
            return "text-left";
    }
}
