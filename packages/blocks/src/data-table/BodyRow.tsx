"use client";

import type { Row } from "@tanstack/react-table";

import { TableCell, TableRow } from "@investment/ui/components/table";
import { cn } from "@investment/ui/lib/utils";

import { BodyCell, isInteractiveTarget } from "./BodyCell";
import { isMetaColumnId } from "./columns";
import { useDataTable } from "./context";
import type { DataRow } from "./types";

export interface BodyRowProps
{
    readonly row: Row<DataRow>;
    readonly rowIndex: number;
    /** 가상 스크롤이 행 높이를 재는 ref */
    readonly measureRef?: (element: HTMLTableRowElement | null) => void;
    /** 행 드래그가 켜진 표에서 행에 붙일 속성·스타일 */
    readonly dragProps?: React.HTMLAttributes<HTMLTableRowElement> & { readonly style?: React.CSSProperties };
    readonly dragRef?: (element: HTMLTableRowElement | null) => void;
    readonly dragHandle?: React.ButtonHTMLAttributes<HTMLButtonElement> & { readonly ref?: (element: HTMLButtonElement | null) => void };
}

/** 몸통 행 하나. 행 클릭·키보드 Enter 는 `rowPress` 로 올리되, 셀 안의 컨트롤을 누른 것은 무시한다 */
export function BodyRow({ row, rowIndex, measureRef, dragProps, dragRef, dragHandle }: BodyRowProps)
{
    const { actions, meta } = useDataTable();
    const selected = row.getIsSelected();
    const pressable = meta.hasRowPress;
    const cells = row.getVisibleCells();
    let dataIndex = -1;

    const setRef = (element: HTMLTableRowElement | null) =>
    {
        measureRef?.(element);
        dragRef?.(element);
    };

    return (
        <>
            <TableRow
                ref={setRef}
                {...dragProps}
                data-index={rowIndex}
                data-row-id={row.id}
                data-state={selected ? "selected" : undefined}
                tabIndex={pressable ? 0 : undefined}
                className={cn("group/row", pressable && "cursor-pointer", dragProps?.className)}
                onClick={pressable
                    ? (event) =>
                    {
                        if (!isInteractiveTarget(event.target) && window.getSelection()?.toString() === "")
                        {
                            actions.rowPress(row.original);
                        }
                    }
                    : undefined}
                onKeyDown={pressable
                    ? (event) =>
                    {
                        if (event.key === "Enter" && event.target === event.currentTarget)
                        {
                            actions.rowPress(row.original);
                        }
                    }
                    : undefined}
            >
                {cells.map((cell) =>
                {
                    const meta = isMetaColumnId(cell.column.id);

                    if (!meta)
                    {
                        dataIndex += 1;
                    }

                    return (
                        <BodyCell
                            key={cell.id}
                            cell={cell}
                            rowIndex={rowIndex}
                            colIndex={meta ? -1 : dataIndex}
                            dragHandle={dragHandle}
                        />
                    );
                })}
            </TableRow>
            {row.getIsExpanded() && meta.renderExpanded !== undefined && (
                <TableRow data-expanded-of={row.id} className="hover:bg-transparent">
                    <TableCell colSpan={cells.length} className="bg-muted/30 whitespace-normal">
                        {meta.renderExpanded(row.original)}
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}
