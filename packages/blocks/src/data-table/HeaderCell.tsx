"use client";

import { flexRender, type Header } from "@tanstack/react-table";

import { Button } from "@investment/ui/components/button";
import { Checkbox } from "@investment/ui/components/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@investment/ui/components/dropdown-menu";
import { TableHead } from "@investment/ui/components/table";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, ChevronDown, Pin } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { isMetaColumnId, META_COLUMN } from "./columns";
import { useDataTable } from "./context";
import { EyeOff, PinOff } from "../icons/extra";
import { alignClass, pinEdgeClass, pinStyle } from "./pin-style";
import type { DataRow } from "./types";

/** 열 메뉴 — 고정·숨기기·이동. 드래그(18)와 같은 상태를 바꾸는 접근성 입력이다 */
function HeaderMenu({ header }: Readonly<{ header: Header<DataRow, unknown> }>)
{
    const { state, actions, meta } = useDataTable();
    const { features, table } = state;
    const { labels } = meta;
    const column = header.column;
    const pinned = column.getIsPinned();
    const dataColumns = table.getVisibleLeafColumns().filter((candidate) => !isMetaColumnId(candidate.id) && !candidate.getIsPinned());
    const index = dataColumns.findIndex((candidate) => candidate.id === column.id);
    const previous = index > 0 ? dataColumns[index - 1] : undefined;
    const next = index >= 0 && index < dataColumns.length - 1 ? dataColumns[index + 1] : undefined;
    const canPin = features.columns.pinning && column.getCanPin();
    const canHide = features.columns.visibility && column.getCanHide();
    const canMove = features.columns.reordering && !pinned;

    if (!canPin && !canHide && !canMove)
    {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={(
                    <Button variant="ghost" size="icon-xs" aria-label={`${String(column.columnDef.header ?? column.id)} ${labels.columns}`}>
                        <ChevronDown />
                    </Button>
                )}
            />
            <DropdownMenuContent align="start" className="w-auto min-w-40">
                {canPin && (
                    <>
                        {pinned !== "left" && (
                            <DropdownMenuItem onClick={() => column.pin("left")}>
                                <Pin />
                                {labels.pinLeft}
                            </DropdownMenuItem>
                        )}
                        {pinned !== "right" && (
                            <DropdownMenuItem onClick={() => column.pin("right")}>
                                <Pin className="rotate-90" />
                                {labels.pinRight}
                            </DropdownMenuItem>
                        )}
                        {pinned && (
                            <DropdownMenuItem onClick={() => column.pin(false)}>
                                <PinOff />
                                {labels.unpin}
                            </DropdownMenuItem>
                        )}
                    </>
                )}
                {canMove && (
                    <>
                        {canPin && <DropdownMenuSeparator />}
                        <DropdownMenuItem disabled={previous === undefined} onClick={() => previous && actions.reorderColumns(column.id, previous.id)}>
                            <ArrowLeft />
                            {labels.moveLeft}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={next === undefined} onClick={() => next && actions.reorderColumns(column.id, next.id)}>
                            <ArrowRight />
                            {labels.moveRight}
                        </DropdownMenuItem>
                    </>
                )}
                {canHide && (
                    <>
                        {(canPin || canMove) && <DropdownMenuSeparator />}
                        <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                            <EyeOff />
                            {labels.hide}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function SortIndicator({ header }: Readonly<{ header: Header<DataRow, unknown> }>)
{
    const { state } = useDataTable();
    const sorted = header.column.getIsSorted();
    const multi = state.view.sorting.length > 1;

    if (sorted === "asc")
    {
        return (
            <span className="inline-flex items-center gap-0.5">
                <ArrowUp className="size-3.5" />
                {multi && <span className="text-[10px] tabular-nums">{header.column.getSortIndex() + 1}</span>}
            </span>
        );
    }

    if (sorted === "desc")
    {
        return (
            <span className="inline-flex items-center gap-0.5">
                <ArrowDown className="size-3.5" />
                {multi && <span className="text-[10px] tabular-nums">{header.column.getSortIndex() + 1}</span>}
            </span>
        );
    }

    return <ArrowUpDown className="size-3.5 opacity-40" />;
}

export interface HeaderCellProps
{
    readonly header: Header<DataRow, unknown>;
    /** 열 드래그가 켜진 표에서 셀에 붙일 드래그 속성·스타일 */
    readonly dragProps?: React.HTMLAttributes<HTMLTableCellElement> & { readonly style?: React.CSSProperties };
    readonly dragRef?: (element: HTMLTableCellElement | null) => void;
}

/** 머리 셀 하나 — 정렬 버튼, 열 메뉴, 너비 조절 손잡이. 메타 열은 자기 컨트롤만 그린다 */
export function HeaderCell({ header, dragProps, dragRef }: HeaderCellProps)
{
    const { state, meta } = useDataTable();
    const { features, table } = state;
    const { labels } = meta;
    const column = header.column;
    const id = column.id;
    const sized = features.columns.resizing || features.columns.pinning || features.overflow === "horizontal" || features.viewport.mode === "virtual";
    const style: React.CSSProperties = { ...(sized ? { width: header.getSize() } : {}), ...pinStyle(column), ...dragProps?.style };
    const pinnedClass = column.getIsPinned() ? cn("bg-background", pinEdgeClass(column)) : undefined;

    if (id === META_COLUMN.select)
    {
        const all = table.getIsAllPageRowsSelected();
        const some = table.getIsSomePageRowsSelected();

        return (
            <TableHead style={{ ...style, width: "var(--table-meta-column-width)" }} className={pinnedClass}>
                <Checkbox
                    aria-label={labels.selectAll}
                    checked={all}
                    indeterminate={some && !all}
                    onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
                />
            </TableHead>
        );
    }

    if (isMetaColumnId(id))
    {
        return (
            <TableHead style={{ ...style, width: "var(--table-meta-column-width)" }} className={pinnedClass}>
                <span className="sr-only">{id === META_COLUMN.actions ? labels.actions : id === META_COLUMN.drag ? labels.dragRow : labels.expandRow}</span>
            </TableHead>
        );
    }

    const canSort = column.getCanSort();
    const sorted = column.getIsSorted();
    const align = column.columnDef.meta?.align;
    const label = flexRender(column.columnDef.header, header.getContext());

    return (
        <TableHead
            ref={dragRef}
            {...dragProps}
            style={style}
            aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : canSort ? "none" : undefined}
            data-column-id={id}
            data-pinned={column.getIsPinned() || undefined}
            className={cn("group/head relative", alignClass(align), pinnedClass, dragProps?.className)}
        >
            <div className={cn("flex items-center gap-1", align === "end" && "justify-end", align === "center" && "justify-center")}>
                {canSort
                    ? (
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-sm font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={column.getToggleSortingHandler()}
                            title={sorted === "asc" ? labels.descending : labels.ascending}
                        >
                            {label}
                            <SortIndicator header={header} />
                        </button>
                    )
                    : <span className="font-medium">{label}</span>}
                <HeaderMenu header={header} />
            </div>
            {features.columns.resizing && column.getCanResize() && (
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`${String(column.columnDef.header ?? id)} 너비`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    onDoubleClick={() => column.resetSize()}
                    data-resizing={column.getIsResizing() || undefined}
                    className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none opacity-0 hover:bg-border group-hover/head:opacity-100 data-resizing:bg-primary data-resizing:opacity-100"
                />
            )}
        </TableHead>
    );
}
