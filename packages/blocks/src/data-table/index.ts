import { Content } from "./Content";
import { DataTableRoot } from "./DataTable";
import { Pagination } from "./Pagination";
import { SelectionBar } from "./SelectionBar";
import { DataTableSkeleton } from "./Skeleton";
import { Toolbar } from "./Toolbar";

export * from "./types";
export * from "./table-view";
export * from "./columns";
export * from "./csv";
export * from "./cell-range";
export * from "./labels";

export { DEFAULT_PAGE_SIZES, resolveFeatures, useDataTable } from "./context";
export type {
    BulkAction,
    DataTableActions,
    DataTableContextValue,
    DataTableMeta,
    DataTableState,
    EditingCell,
    RangeSelection,
    ResolvedFeatures,
    RowAction,
} from "./context";

export { DataTableRoot } from "./DataTable";
export type { CellEdit, DataTableProps } from "./DataTable";
export { Toolbar as DataTableToolbar } from "./Toolbar";
export type { ToolbarProps as DataTableToolbarProps } from "./Toolbar";
export { Content as DataTableContent } from "./Content";
export type { ContentProps as DataTableContentProps } from "./Content";
export { Pagination as DataTablePagination, pageWindow } from "./Pagination";
export type { PaginationProps as DataTablePaginationProps } from "./Pagination";
export { SelectionBar as DataTableSelectionBar } from "./SelectionBar";
export type { SelectionBarProps as DataTableSelectionBarProps } from "./SelectionBar";
export { DataTableSkeleton } from "./Skeleton";
export type { DataTableSkeletonProps } from "./Skeleton";

/**
 * 복합 컴포넌트 묶음. `<DataTable.Root>` 안에 나머지를 원하는 순서로 놓는다.
 *
 * 이 객체는 지시문 없는 모듈에 둔다. "use client" 모듈의 객체 export 는 서버 컴포넌트에서 점(.)으로 들어갈 수 없다.
 */
export const DataTable = {
    Root: DataTableRoot,
    Toolbar,
    Content,
    Pagination,
    SelectionBar,
    Skeleton: DataTableSkeleton,
} as const;
