"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { arrayMove } from "@dnd-kit/sortable";
import {
    functionalUpdate,
    getCoreRowModel,
    getExpandedRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type ColumnFiltersState,
    type ExpandedState,
    type SortingState,
} from "@tanstack/react-table";

import { Card } from "@investment/ui/components/card";
import { cn } from "@investment/ui/lib/utils";

import { collectRange, normalizeRange } from "./cell-range";
import { buildColumnDefs, cellText, isMetaColumnId, META_COLUMN, metaColumnIds, toFilterValue } from "./columns";
import { Content } from "./Content";
import {
    DataTableContext,
    resolveFeatures,
    type BulkAction,
    type DataTableContextValue,
    type EditingCell,
    type RangeSelection,
    type RowAction,
} from "./context";
import { cellsToDelimited } from "./csv";
import { DEFAULT_LABELS, type Labels } from "./labels";
import { Pagination } from "./Pagination";
import { SelectionBar } from "./SelectionBar";
import { createTableView, type TableViewInit } from "./table-view";
import { Toolbar } from "./Toolbar";
import type { ColumnFilter, ColumnSpec, DataRow, DataTableFeatures, Density, TableView } from "./types";

export interface CellEdit<Row extends DataRow = DataRow>
{
    readonly row: Row;
    readonly key: string;
    readonly value: unknown;
}

export interface DataTableProps<Row extends DataRow = DataRow>
{
    readonly rows: ReadonlyArray<Row>;
    readonly columns: ReadonlyArray<ColumnSpec<Row>>;
    readonly features?: DataTableFeatures;
    /** 제어 모드. 주면 `onViewChange` 로 돌려준 값을 다시 넣어야 한다 */
    readonly view?: TableView;
    /** 비제어 모드의 초기값 */
    readonly defaultView?: TableViewInit;
    readonly onViewChange?: (view: TableView) => void;
    /** 서버 페이지네이션일 때 전체 행 수 */
    readonly rowCount?: number;
    /** 정렬·필터·페이지를 서버가 맡는다는 표시. 표는 상태만 바꾸고 행을 자르지 않는다 */
    readonly manual?: { readonly pagination?: boolean; readonly sorting?: boolean; readonly filtering?: boolean };
    readonly loading?: boolean;
    readonly onRowPress?: (row: Row) => void;
    /** 행 순서 드래그의 결과. 새 순서의 id 목록이다 */
    readonly onRowsReorder?: (ids: ReadonlyArray<string>) => void;
    readonly onCellEdit?: (edit: CellEdit<Row>) => void;
    readonly rowActions?: (row: Row) => ReadonlyArray<RowAction<Row>>;
    readonly bulkActions?: ReadonlyArray<BulkAction<Row>>;
    readonly renderExpanded?: (row: Row) => React.ReactNode;
    readonly labels?: Partial<Labels>;
    readonly emptyTitle?: string;
    readonly emptyDescription?: string;
    readonly className?: string;
    /** 비우면 기본 구성(툴바 · 표 · 페이지네이션 · 선택 바)이다 */
    readonly children?: React.ReactNode;
}

const toColumnFilters = (state: ColumnFiltersState): ReadonlyArray<ColumnFilter> =>
    state.map((filter) => ({ id: filter.id, value: toFilterValue(filter.value) })).filter((filter) => filter.value.length > 0);

const toExpanded = (state: ExpandedState): Readonly<Record<string, boolean>> => (typeof state === "boolean" ? {} : state);

const applyPatch = (view: TableView, patch: Partial<TableView> | ((view: TableView) => TableView)): TableView =>
    typeof patch === "function" ? patch(view) : { ...view, ...patch };

/**
 * DataTable 의 뿌리. TanStack Table 을 배선하고 `{ state, actions, meta }` context 를 서브컴포넌트에 준다.
 *
 * 축 일곱은 `features` 가 정하고 사용자가 바꾸는 값은 `TableView` 가 든다. 제어·비제어 둘 다 되며,
 * TanStack 이 한 이벤트에서 상태 둘을 연달아 바꾸는 경우(정렬 뒤 페이지 초기화)에도 값을 잃지 않도록
 * 최신 view 를 ref 로 들고 갱신한다.
 */
export function DataTableRoot<Row extends DataRow>(props: DataTableProps<Row>)
{
    const {
        rows, columns, view: controlledView, defaultView, onViewChange, rowCount, manual = {}, loading = false,
        onRowPress, onRowsReorder, onCellEdit, rowActions, bulkActions = [], renderExpanded, emptyTitle, emptyDescription,
        className, children,
    } = props;

    const features = useMemo(() => resolveFeatures(props.features), [props.features]);
    const labels = useMemo<Labels>(() => ({ ...DEFAULT_LABELS, ...props.labels }), [props.labels]);

    // 밀도의 기본값은 축(features)이 정하고, 사용자가 바꾼 값은 view 가 든다
    const [internalView, setInternalView] = useState<TableView>(() => createTableView({ density: features.density, ...defaultView }));
    const view = controlledView ?? internalView;
    const viewRef = useRef(view);
    viewRef.current = view;

    const onViewChangeRef = useRef(onViewChange);
    useEffect(() =>
    {
        onViewChangeRef.current = onViewChange;
    });

    const setView = useCallback((patch: Partial<TableView> | ((view: TableView) => TableView)) =>
    {
        const next = applyPatch(viewRef.current, patch);

        // 같은 객체를 돌려준 갱신(값이 같은 페이지 초기화 등)은 렌더도 콜백도 만들지 않는다
        if (next === viewRef.current)
        {
            return;
        }

        viewRef.current = next;

        if (controlledView === undefined)
        {
            setInternalView(next);
        }

        onViewChangeRef.current?.(next);
    }, [controlledView]);

    const [editing, setEditing] = useState<EditingCell | null>(null);
    const [range, setRange] = useState<RangeSelection | null>(null);

    const data = useMemo(() => [...rows], [rows]);
    const specByKey = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns]);
    const metaIds = useMemo(() => metaColumnIds(features), [features]);
    const leadingMeta = useMemo(() => metaIds.filter((id) => id !== META_COLUMN.actions), [metaIds]);
    const trailingMeta = useMemo(() => metaIds.filter((id) => id === META_COLUMN.actions), [metaIds]);

    const columnDefs = useMemo<ColumnDef<Row, unknown>[]>(() =>
    {
        const metaDef = (id: string, size: number): ColumnDef<Row, unknown> => ({
            id,
            size,
            minSize: size,
            maxSize: size,
            enableSorting: false,
            enableHiding: false,
            enableResizing: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            meta: { kind: "text", align: "center" },
        });

        return [
            ...leadingMeta.map((id) => metaDef(id, id === META_COLUMN.expand ? 40 : 40)),
            ...buildColumnDefs(columns, features),
            ...trailingMeta.map((id) => metaDef(id, 48)),
        ];
    }, [columns, features, leadingMeta, trailingMeta]);

    /** 데이터 열의 표시 순서. view 에 없는 새 열은 뒤에 붙는다 */
    const orderedData = useMemo(() =>
    {
        const ids = columns.map((column) => column.key);

        if (view.columnOrder.length === 0)
        {
            return ids;
        }

        const known = view.columnOrder.filter((id) => ids.includes(id));

        return [...known, ...ids.filter((id) => !known.includes(id))];
    }, [columns, view.columnOrder]);

    const columnOrder = useMemo(() => [...leadingMeta, ...orderedData, ...trailingMeta], [leadingMeta, orderedData, trailingMeta]);

    const columnPinning = useMemo(() =>
    {
        const left = [...view.columnPinning.left];

        // 가로 스크롤 표는 식별 열을 자동으로 붙인다. 사용자가 고른 고정 열이 있으면 그것을 존중한다.
        if (features.overflow === "horizontal" && left.length === 0 && orderedData[0] !== undefined)
        {
            left.push(orderedData[0]);
        }

        return { left: [...leadingMeta, ...left], right: [...view.columnPinning.right, ...trailingMeta] };
    }, [features.overflow, leadingMeta, orderedData, trailingMeta, view.columnPinning]);

    const paginated = features.viewport.mode === "paginated";
    const canExpand = features.rows.expansion && renderExpanded !== undefined;

    // ⚠ TanStack 은 상태를 참조로 비교한다. 렌더마다 새 배열을 넘기면 정렬·필터 행 모델이 매번 다시 계산되고,
    //    그 onChange 가 페이지 초기화를 큐에 넣어 view 를 또 바꾸므로 렌더가 끝나지 않는다(마이크로태스크 무한 루프).
    //    view 의 필드 참조는 그 필드를 바꿀 때만 갈리므로 필드 단위로 복사본을 고정한다.
    const sorting = useMemo<SortingState>(() => view.sorting.map((rule) => ({ ...rule })), [view.sorting]);
    const columnFilters = useMemo<ColumnFiltersState>(
        () => view.columnFilters.map((filter) => ({ id: filter.id, value: [...filter.value] })),
        [view.columnFilters],
    );

    const table = useReactTable<Row>({
        data,
        columns: columnDefs,
        getRowId: (row) => row.id,
        state: {
            sorting,
            columnFilters,
            globalFilter: view.globalFilter,
            pagination: view.pagination,
            columnVisibility: view.columnVisibility,
            columnOrder,
            columnPinning,
            columnSizing: view.columnSizing,
            rowSelection: view.rowSelection,
            expanded: view.expanded,
        },
        onSortingChange: (updater) => setView((current) => ({ ...current, sorting: functionalUpdate(updater, [...current.sorting]) })),
        onColumnFiltersChange: (updater) => setView((current) => ({
            ...current,
            columnFilters: toColumnFilters(functionalUpdate(updater, current.columnFilters.map((filter) => ({ id: filter.id, value: [...filter.value] })))),
        })),
        onGlobalFilterChange: (updater) => setView((current) =>
        {
            const next: unknown = functionalUpdate(updater, current.globalFilter);

            return { ...current, globalFilter: typeof next === "string" ? next : "" };
        }),
        onPaginationChange: (updater) => setView((current) =>
        {
            const next = functionalUpdate(updater, current.pagination);

            // 페이지 초기화가 이미 0 페이지인 표에 와도 view 를 새로 만들지 않는다
            return next.pageIndex === current.pagination.pageIndex && next.pageSize === current.pagination.pageSize
                ? current
                : { ...current, pagination: next };
        }),
        onColumnVisibilityChange: (updater) => setView((current) => ({ ...current, columnVisibility: functionalUpdate(updater, { ...current.columnVisibility }) })),
        onColumnOrderChange: (updater) => setView((current) => ({
            ...current,
            columnOrder: functionalUpdate(updater, [...columnOrder]).filter((id) => !isMetaColumnId(id)),
        })),
        onColumnPinningChange: (updater) => setView((current) =>
        {
            const next = functionalUpdate(updater, { left: [...columnPinning.left], right: [...columnPinning.right] });

            return {
                ...current,
                columnPinning: {
                    left: (next.left ?? []).filter((id) => !isMetaColumnId(id)),
                    right: (next.right ?? []).filter((id) => !isMetaColumnId(id)),
                },
            };
        }),
        onColumnSizingChange: (updater) => setView((current) => ({ ...current, columnSizing: functionalUpdate(updater, { ...current.columnSizing }) })),
        onRowSelectionChange: (updater) => setView((current) => ({ ...current, rowSelection: functionalUpdate(updater, { ...current.rowSelection }) })),
        onExpandedChange: (updater) => setView((current) => ({ ...current, expanded: toExpanded(functionalUpdate(updater, { ...current.expanded })) })),
        enableSorting: features.sorting !== "none",
        enableMultiSort: features.sorting === "multi",
        enableSortingRemoval: true,
        enableRowSelection: features.rows.selection,
        enableColumnResizing: features.columns.resizing,
        columnResizeMode: "onChange",
        enableColumnPinning: true,
        enableHiding: features.columns.visibility,
        manualPagination: manual.pagination ?? false,
        manualSorting: manual.sorting ?? false,
        manualFiltering: manual.filtering ?? false,
        autoResetPageIndex: !(manual.pagination ?? false),
        ...(rowCount !== undefined ? { rowCount } : {}),
        getRowCanExpand: () => canExpand,
        // 전역 검색은 사용자가 보는 문자열을 뒤진다. 원시값("completed")이 아니라 표시값("완료")으로 찾아야 한다.
        globalFilterFn: (row, columnId, filterValue) =>
        {
            const needle = typeof filterValue === "string" ? filterValue.trim().toLowerCase() : "";

            if (needle === "")
            {
                return true;
            }

            const spec = specByKey.get(columnId);
            const text = spec === undefined ? String(row.getValue(columnId) ?? "") : cellText(spec, row.original);

            return text.toLowerCase().includes(needle);
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getExpandedRowModel: getExpandedRowModel(),
        ...(paginated && !(manual.pagination ?? false) ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    });

    const totalRows = rowCount ?? table.getFilteredRowModel().rows.length;

    const setDensity = useCallback((density: Density) => setView({ density }), [setView]);

    const rowPress = useCallback((row: Row) => onRowPress?.(row), [onRowPress]);

    const commitEdit = useCallback((value: unknown) =>
    {
        if (editing === null)
        {
            return;
        }

        const row = rows.find((candidate) => candidate.id === editing.rowId);

        if (row !== undefined)
        {
            onCellEdit?.({ row, key: editing.columnId, value });
        }

        setEditing(null);
    }, [editing, onCellEdit, rows]);

    const cancelEdit = useCallback(() => setEditing(null), []);

    const applyEdit = useCallback((cell: EditingCell, value: unknown) =>
    {
        const row = rows.find((candidate) => candidate.id === cell.rowId);

        if (row !== undefined)
        {
            onCellEdit?.({ row, key: cell.columnId, value });
        }
    }, [onCellEdit, rows]);

    const copyRange = useCallback(async () =>
    {
        if (range === null)
        {
            return;
        }

        const visibleRows = table.getRowModel().rows;
        const dataColumns = table.getVisibleLeafColumns().filter((column) => !isMetaColumnId(column.id));

        const matrix = collectRange(normalizeRange(range.anchor, range.focus), (rowIndex, colIndex) =>
        {
            const row = visibleRows[rowIndex];
            const column = dataColumns[colIndex];
            const spec = column === undefined ? undefined : specByKey.get(column.id);

            return row === undefined || spec === undefined ? "" : cellText(spec, row.original);
        });

        await navigator.clipboard.writeText(cellsToDelimited(matrix, "\t"));
    }, [range, specByKey, table]);

    const reorderRows = useCallback((activeId: string, overId: string) =>
    {
        const ids = rows.map((row) => row.id);
        const from = ids.indexOf(activeId);
        const to = ids.indexOf(overId);

        if (from < 0 || to < 0 || from === to)
        {
            return;
        }

        onRowsReorder?.(arrayMove([...ids], from, to));
    }, [onRowsReorder, rows]);

    const reorderColumns = useCallback((activeId: string, overId: string) =>
    {
        const from = orderedData.indexOf(activeId);
        const to = orderedData.indexOf(overId);

        if (from < 0 || to < 0 || from === to)
        {
            return;
        }

        setView({ columnOrder: arrayMove([...orderedData], from, to) });
    }, [orderedData, setView]);

    const contextValue = useMemo<DataTableContextValue<Row>>(() => ({
        state: { table, view, features, specs: columns, specByKey, loading, editing, range, totalRows },
        actions: { setView, setDensity, rowPress, startEdit: setEditing, commitEdit, cancelEdit, applyEdit, setRange, copyRange, reorderRows, reorderColumns },
        meta: {
            labels,
            ...(rowActions !== undefined ? { rowActions } : {}),
            bulkActions,
            ...(renderExpanded !== undefined ? { renderExpanded } : {}),
            emptyTitle: emptyTitle ?? labels.empty,
            ...(emptyDescription !== undefined ? { emptyDescription } : {}),
            hasRowPress: onRowPress !== undefined,
        },
    }), [
        table, view, features, columns, specByKey, loading, editing, range, totalRows, setView, setDensity, rowPress, commitEdit, cancelEdit, applyEdit,
        copyRange, reorderRows, reorderColumns, labels, rowActions, bulkActions, renderExpanded, emptyTitle, emptyDescription, onRowPress,
    ]);

    // React context 는 타입 매개변수를 지우지 못한다. 서브컴포넌트는 행을 DataRow 로만 다루므로 이 경계 한 곳에서만 넓힌다.
    const erased = contextValue as unknown as DataTableContextValue;

    const body = children ?? (
        <>
            <Toolbar />
            <Content />
            <Pagination />
            <SelectionBar />
        </>
    );

    /* 면을 카드로 받으면 툴바와 페이지네이션이 표와 같은 면 안에 선다. 셋이 한 덩어리로 읽혀야
       걸러 둔 조건이 지금 이 표의 것이라는 사실이 드러난다. */
    return (
        <DataTableContext.Provider value={erased}>
            {features.surface === "card"
                ? (
                    <Card className={cn("gap-3 p-4", className)} data-slot="data-table">
                        {body}
                    </Card>
                )
                : (
                    <div className={cn("flex flex-col gap-3", className)} data-slot="data-table">
                        {body}
                    </div>
                )}
        </DataTableContext.Provider>
    );
}
