"use client";

import { useRef } from "react";

import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Header, Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Button } from "@investment/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@investment/ui/components/empty";
import { Skeleton } from "@investment/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@investment/ui/components/table";
import { cn } from "@investment/ui/lib/utils";

import { BodyRow } from "./BodyRow";
import { isMetaColumnId } from "./columns";
import { DEFAULT_VIRTUAL_ROW_HEIGHT, useDataTable } from "./context";
import { HeaderCell } from "./HeaderCell";
import type { DataRow, Density } from "./types";

/**
 * 줄무늬의 반투명 바탕은 토큰이 아니라 유틸리티로 남긴다. 3층 `table.css` 가 표 바닥선·행 hover 에
 * 같은 판단을 이미 적어 두었다 — 1층에 표 줄무늬용 반투명 토큰을 만들면 「표에서만 쓰는 색」이
 * 시맨틱 층에 생기고, 불투명 `--muted` 로 바꾸면 줄무늬가 아니라 칠한 행이 되어 읽기가 나빠진다.
 */
const APPEARANCE_CLASS = {
    plain: "",
    bordered: "[&_th]:border-r [&_td]:border-r [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0 [&_th]:border-border [&_td]:border-border",
    striped: "[&_tbody_tr:nth-child(even)]:bg-muted/40",
} as const;

/**
 * 밀도는 표 전용 토큰의 간접 변수를 덮어 바꾼다(2026-09-06 이전엔 `[&_th]:h-8 [&_td]:py-1` 리터럴).
 * 3층 `table.css` 가 `var(--table-head-height, var(--table-head-height-default))` 로 읽으므로,
 * 블록은 compact 값을 그 자리에 얹기만 하면 된다.
 *
 * ⚠ 종전의 `text-sm` 은 함께 지웠다. 값이 표의 기본 글자 크기(`--ui-text-md` 14px)와 같아
 * 하는 일이 없었고, 밀도 축은 여백을 바꾸는 것이지 글자 크기를 바꾸는 축이 아니다(Figma 도 같다).
 *
 * 객체 리터럴에 사용자 정의 속성을 담을 방법이 타입에 없어 여기 한 곳만 단언한다.
 */
const DENSITY_STYLE: Record<Density, React.CSSProperties | undefined> = {
    default: undefined,
    compact: {
        "--table-head-height": "var(--table-head-height-compact)",
        "--table-cell-padding-y": "var(--table-cell-padding-y-compact)",
    } as React.CSSProperties,
};

function useDragSensors()
{
    return useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
}

/**
 * 열 드래그가 켜진 표의 머리 셀. 고정 열과 메타 열은 끌 수 없다.
 *
 * 포인터 리스너만 th 에 얹는다. dnd-kit 의 attributes(role=button·tabIndex)까지 얹으면 columnheader 의미와
 * aria-sort 가 깨진다. 키보드 사용자는 열 메뉴의 왼쪽·오른쪽 이동으로 같은 상태를 바꾼다.
 */
function SortableHeaderCell({ header }: Readonly<{ header: Header<DataRow, unknown> }>)
{
    const column = header.column;
    const disabled = isMetaColumnId(column.id) || column.getIsPinned() !== false;
    const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id, disabled });

    return (
        <HeaderCell
            header={header}
            dragRef={setNodeRef}
            dragProps={{
                ...listeners,
                style: { transform: CSS.Translate.toString(transform), transition },
                className: cn(!disabled && "cursor-grab active:cursor-grabbing", isDragging && "relative z-[3] opacity-70"),
            }}
        />
    );
}

/** 행 드래그가 켜진 표의 몸통 행. 정렬이 걸려 있으면 순서를 바꿀 뜻이 없으므로 꺼진다 */
function SortableBodyRow({ row, rowIndex, measureRef }: Readonly<{ row: Row<DataRow>; rowIndex: number; measureRef?: (element: HTMLTableRowElement | null) => void }>)
{
    const { state } = useDataTable();
    const disabled = state.view.sorting.length > 0;
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled });

    return (
        <BodyRow
            row={row}
            rowIndex={rowIndex}
            {...(measureRef !== undefined ? { measureRef } : {})}
            dragRef={setNodeRef}
            dragProps={{
                style: { transform: CSS.Transform.toString(transform), transition },
                className: cn(isDragging && "relative z-[3] opacity-70"),
            }}
            dragHandle={{ ...attributes, ...listeners, ref: setActivatorNodeRef, disabled, "aria-disabled": disabled }}
        />
    );
}

function LoadingRows({ columns, count }: Readonly<{ columns: number; count: number }>)
{
    return Array.from({ length: count }, (_, index) => (
        <TableRow key={index} aria-hidden>
            {Array.from({ length: columns }, (__, column) => (
                <TableCell key={column}>
                    <Skeleton className="h-4 w-full" />
                </TableCell>
            ))}
        </TableRow>
    ));
}

function EmptyRow({ columns }: Readonly<{ columns: number }>)
{
    const { state, meta } = useDataTable();
    const { table, view } = state;
    const { labels } = meta;
    const filtered = view.globalFilter !== "" || view.columnFilters.length > 0;

    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columns} className="whitespace-normal">
                <Empty className="min-h-48">
                    <EmptyHeader>
                        <EmptyTitle>{filtered ? labels.noResults : meta.emptyTitle}</EmptyTitle>
                        {!filtered && meta.emptyDescription !== undefined && <EmptyDescription>{meta.emptyDescription}</EmptyDescription>}
                    </EmptyHeader>
                    {filtered && (
                        <EmptyContent>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                {
                                    table.resetColumnFilters();
                                    table.setGlobalFilter("");
                                }}
                            >
                                {labels.resetFilters}
                            </Button>
                        </EmptyContent>
                    )}
                </Empty>
            </TableCell>
        </TableRow>
    );
}

export interface ContentProps
{
    readonly className?: string;
}

/**
 * 표 본체. 축의 값에 따라 모양·밀도 클래스를 얹고, 뷰포트가 virtual 이면 세로 스크롤 컨테이너와 가상화를 켠다.
 *
 * ⚠ 프리미티브 `Table` 은 `overflow-x-auto` 컨테이너를 스스로 두른다. 가상 스크롤에서는 그 컨테이너를 `overflow-visible` 로
 *    되돌려야 바깥 컨테이너 하나만 스크롤하고 sticky 헤더가 붙는다.
 */
export function Content({ className }: ContentProps)
{
    const { state, actions } = useDataTable();
    const { table, features, loading, view } = state;
    const rows = table.getRowModel().rows;
    const leafColumns = table.getVisibleLeafColumns();
    const columnCount = leafColumns.length;
    const virtual = features.viewport.mode === "virtual";
    const rowHeight = features.viewport.mode === "virtual" ? features.viewport.rowHeight : DEFAULT_VIRTUAL_ROW_HEIGHT;
    const height = features.viewport.mode === "virtual" ? features.viewport.height : undefined;
    const sized = features.columns.resizing || features.columns.pinning || features.overflow === "horizontal" || virtual;
    const scrollRef = useRef<HTMLDivElement>(null);
    const sensors = useDragSensors();

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => rowHeight,
        overscan: 8,
        enabled: virtual,
    });

    const virtualItems = virtual ? virtualizer.getVirtualItems() : [];
    const paddingTop = virtual && virtualItems.length > 0 ? virtualItems[0]?.start ?? 0 : 0;
    const paddingBottom = virtual && virtualItems.length > 0
        ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
        : 0;

    const onColumnDragEnd = ({ active, over }: DragEndEvent) =>
    {
        if (over !== null && active.id !== over.id)
        {
            actions.reorderColumns(String(active.id), String(over.id));
        }
    };

    const onRowDragEnd = ({ active, over }: DragEndEvent) =>
    {
        if (over !== null && active.id !== over.id)
        {
            actions.reorderRows(String(active.id), String(over.id));
        }
    };

    const dataColumnIds = leafColumns.filter((column) => !isMetaColumnId(column.id)).map((column) => column.id);

    const renderRow = (row: Row<DataRow>, rowIndex: number) =>
        features.rows.reorder
            ? <SortableBodyRow key={row.id} row={row} rowIndex={rowIndex} {...(virtual ? { measureRef: virtualizer.measureElement } : {})} />
            : <BodyRow key={row.id} row={row} rowIndex={rowIndex} {...(virtual ? { measureRef: virtualizer.measureElement } : {})} />;

    const header = (
        <TableHeader className={cn(virtual && "sticky top-0 z-[2] bg-background")}>
            {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((item) =>
                        features.columns.reordering
                            ? <SortableHeaderCell key={item.id} header={item} />
                            : <HeaderCell key={item.id} header={item} />)}
                </TableRow>
            ))}
        </TableHeader>
    );

    const body = (
        <TableBody>
            {loading
                ? <LoadingRows columns={columnCount} count={Math.min(view.pagination.pageSize, 8)} />
                : rows.length === 0
                    ? <EmptyRow columns={columnCount} />
                    : virtual
                        ? (
                            <>
                                {paddingTop > 0 && <tr aria-hidden style={{ height: paddingTop }} />}
                                {virtualItems.map((item) =>
                                {
                                    const row = rows[item.index];

                                    return row === undefined ? null : renderRow(row, item.index);
                                })}
                                {paddingBottom > 0 && <tr aria-hidden style={{ height: paddingBottom }} />}
                            </>
                        )
                        : rows.map((row, index) => renderRow(row, index))}
        </TableBody>
    );

    return (
        <div
            ref={scrollRef}
            data-slot="data-table-content"
            data-appearance={features.appearance}
            data-density={view.density}
            style={height !== undefined ? { height } : undefined}
            className={cn(
                "relative rounded-md border border-border",
                // 둥근 틀 안쪽을 잘라야 고정 열(선택·동작)의 네모난 바탕이 모서리의 곡선 테두리를
                // 덮지 않는다. 가상화는 스스로 스크롤하므로 overflow-auto 가 같은 일을 한다.
                virtual ? "overflow-auto [&_[data-slot=table-container]]:overflow-visible" : "overflow-hidden",
                className,
            )}
            aria-busy={loading || undefined}
        >
            <Table
                className={cn(APPEARANCE_CLASS[features.appearance], sized && "table-fixed")}
                style={{
                    ...DENSITY_STYLE[view.density],
                    ...(sized ? { width: table.getTotalSize(), minWidth: "100%" } : undefined),
                }}
            >
                {features.columns.reordering
                    ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onColumnDragEnd}>
                            <SortableContext items={dataColumnIds} strategy={horizontalListSortingStrategy}>
                                {header}
                            </SortableContext>
                        </DndContext>
                    )
                    : header}
                {features.rows.reorder
                    ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRowDragEnd}>
                            <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                                {body}
                            </SortableContext>
                        </DndContext>
                    )
                    : body}
            </Table>
        </div>
    );
}
