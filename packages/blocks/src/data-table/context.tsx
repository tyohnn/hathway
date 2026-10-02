"use client";

import { createContext, use } from "react";

import type { Table } from "@tanstack/react-table";

import type { Labels } from "./labels";
import type {
    Appearance,
    CellAddress,
    CellMode,
    ColumnSpec,
    DataRow,
    DataTableFeatures,
    Density,
    FilterMode,
    PaginationStyle,
    SortingMode,
    Surface,
    TableView,
} from "./types";

/** 축 일곱의 값이 전부 채워진 형태. 컴포넌트는 이것만 읽는다 */
export interface ResolvedFeatures
{
    readonly appearance: Appearance;
    readonly surface: Surface;
    readonly density: Density;
    readonly viewport:
        | { readonly mode: "paginated"; readonly pagination: PaginationStyle; readonly pageSizes: ReadonlyArray<number> }
        | { readonly mode: "virtual"; readonly rowHeight: number; readonly height: number };
    readonly overflow: "none" | "horizontal";
    readonly sorting: SortingMode;
    readonly filter: FilterMode;
    readonly columns: { readonly visibility: boolean; readonly pinning: boolean; readonly resizing: boolean; readonly reordering: boolean };
    readonly rows: { readonly selection: boolean; readonly reorder: boolean; readonly actions: boolean; readonly expansion: boolean };
    readonly cells: CellMode;
}

export const DEFAULT_PAGE_SIZES: ReadonlyArray<number> = [10, 25, 50, 100];

/**
 * 가상 스크롤의 기본 행 높이.
 *
 * ⚠ 이것은 토큰으로 만들지 않는다. 가상화기가 픽셀 **수**를 요구하는데 CSS 변수는 문자열이고,
 * `getComputedStyle` 로 읽어 오면 폰트가 늦게 오는 순간의 값을 잡아 행이 어긋난다.
 * 기본 밀도의 셀(여백 8 + 8 · 줄높이 20)에 테두리 1을 더한 실측값이며, 호출부가
 * `viewport.rowHeight` 로 덮을 수 있다.
 */
export const DEFAULT_VIRTUAL_ROW_HEIGHT = 44;

export function resolveFeatures(features: DataTableFeatures = {}): ResolvedFeatures
{
    const viewport = features.viewport ?? { mode: "paginated" };

    return {
        appearance: features.appearance ?? "plain",
        surface: features.surface ?? "none",
        density: features.density ?? "default",
        viewport: viewport.mode === "virtual"
            ? { mode: "virtual", rowHeight: viewport.rowHeight ?? DEFAULT_VIRTUAL_ROW_HEIGHT, height: viewport.height ?? 480 }
            : { mode: "paginated", pagination: viewport.pagination ?? "minimal", pageSizes: viewport.pageSizes ?? DEFAULT_PAGE_SIZES },
        overflow: features.overflow ?? "none",
        sorting: features.sorting ?? "single",
        filter: features.filter ?? "none",
        columns: {
            visibility: features.columns?.visibility ?? false,
            pinning: features.columns?.pinning ?? false,
            resizing: features.columns?.resizing ?? false,
            reordering: features.columns?.reordering ?? false,
        },
        rows: {
            selection: features.rows?.selection ?? false,
            reorder: features.rows?.reorder ?? false,
            actions: features.rows?.actions ?? false,
            expansion: features.rows?.expansion ?? false,
        },
        cells: features.cells ?? "read",
    };
}

export interface RowAction<Row extends DataRow = DataRow>
{
    readonly key: string;
    readonly label: string;
    readonly tone?: "default" | "danger";
    readonly onSelect: (row: Row) => void;
}

export interface BulkAction<Row extends DataRow = DataRow>
{
    readonly key: string;
    readonly label: string;
    readonly tone?: "default" | "danger";
    readonly onSelect: (rows: ReadonlyArray<Row>) => void;
}

export interface EditingCell
{
    readonly rowId: string;
    readonly columnId: string;
}

export interface RangeSelection
{
    readonly anchor: CellAddress;
    readonly focus: CellAddress;
}

export interface DataTableState<Row extends DataRow = DataRow>
{
    readonly table: Table<Row>;
    readonly view: TableView;
    readonly features: ResolvedFeatures;
    readonly specs: ReadonlyArray<ColumnSpec<Row>>;
    readonly specByKey: ReadonlyMap<string, ColumnSpec<Row>>;
    readonly loading: boolean;
    readonly editing: EditingCell | null;
    readonly range: RangeSelection | null;
    /** 서버 페이지네이션이면 서버가 준 전체 행 수, 아니면 필터를 지난 행 수 */
    readonly totalRows: number;
}

export interface DataTableActions<Row extends DataRow = DataRow>
{
    readonly setView: (patch: Partial<TableView> | ((view: TableView) => TableView)) => void;
    readonly setDensity: (density: Density) => void;
    readonly rowPress: (row: Row) => void;
    readonly startEdit: (cell: EditingCell) => void;
    readonly commitEdit: (value: unknown) => void;
    readonly cancelEdit: () => void;
    /** 편집 모드를 거치지 않고 값을 바로 바꾼다(붙여넣기) */
    readonly applyEdit: (cell: EditingCell, value: unknown) => void;
    readonly setRange: (range: RangeSelection | null) => void;
    readonly copyRange: () => Promise<void>;
    readonly reorderRows: (activeId: string, overId: string) => void;
    readonly reorderColumns: (activeId: string, overId: string) => void;
}

export interface DataTableMeta<Row extends DataRow = DataRow>
{
    readonly labels: Labels;
    readonly rowActions?: (row: Row) => ReadonlyArray<RowAction<Row>>;
    readonly bulkActions: ReadonlyArray<BulkAction<Row>>;
    readonly renderExpanded?: (row: Row) => React.ReactNode;
    readonly emptyTitle: string;
    readonly emptyDescription?: string;
    readonly hasRowPress: boolean;
}

/** context 는 `{ state, actions, meta }` 셋으로 가른다. provider 를 갈아끼워도 같은 UI 가 돈다 */
export interface DataTableContextValue<Row extends DataRow = DataRow>
{
    readonly state: DataTableState<Row>;
    readonly actions: DataTableActions<Row>;
    readonly meta: DataTableMeta<Row>;
}

export const DataTableContext = createContext<DataTableContextValue | null>(null);

export function useDataTable(): DataTableContextValue
{
    const value = use(DataTableContext);

    if (value === null)
    {
        throw new Error("DataTable 의 서브컴포넌트는 <DataTable.Root> 안에서만 쓸 수 있다.");
    }

    return value;
}
