import type { RowData } from "@tanstack/react-table";

import type { Tone } from "../tone";

/**
 * DataTable 블록의 계약. 도메인 타입을 모르고 "모양"만 안다 — 행은 `id` 가 있는 레코드, 열은 키·라벨·종류다.
 * 축 일곱(모양·뷰포트·정렬·필터·열·행·셀)은 `DataTableFeatures` 가 정하고, 사용자가 바꾸는 값은 `TableView` 가 든다.
 */

/** 상태·분류의 뜻. 정의는 블록 공용 모듈에 있고 DataTable 은 그것을 그대로 쓴다 */
export type { Tone } from "../tone";

/** 셀 종류. 형식은 `formatCellValue` 가 packages/shared 의 포매터로 정한다 */
export type CellKind = "text" | "number" | "money" | "hours" | "date" | "datetime" | "badge" | "boolean";

export type ColumnAlign = "start" | "center" | "end";

export type ColumnFilterKind = "text" | "facet";

/** 열 필터 값. 텍스트 필터는 한 칸짜리 배열이고 패싯 필터는 선택값 목록이다 — URL 직렬화가 하나로 통한다 */
export type FilterValue = ReadonlyArray<string>;

export interface FacetOption
{
    readonly value: string;
    readonly label: string;
    readonly tone?: Tone;
}

export interface ColumnEditing
{
    readonly input: "text" | "number" | "select" | "textarea";
    readonly options?: ReadonlyArray<FacetOption>;
}

/** 행 하나. 선택·확장·편집이 `id` 를 키로 쓴다 */
export type DataRow = { readonly id: string; readonly [key: string]: unknown };

export interface ColumnSpec<Row extends DataRow = DataRow>
{
    /** 행의 속성 키이자 열 id */
    readonly key: string;
    readonly label: string;
    readonly kind?: CellKind;
    /** 비우면 종류가 정한다(숫자는 오른쪽) */
    readonly align?: ColumnAlign;
    readonly width?: number;
    readonly minWidth?: number;
    readonly maxWidth?: number;
    /** 기본 true. 표의 정렬 축이 none 이면 무시된다 */
    readonly sortable?: boolean;
    readonly filter?: ColumnFilterKind;
    /** 패싯 선택지. 비우면 데이터에서 모은다 */
    readonly facetOptions?: ReadonlyArray<FacetOption>;
    readonly hideable?: boolean;
    readonly pinnable?: boolean;
    readonly resizable?: boolean;
    readonly reorderable?: boolean;
    readonly editable?: ColumnEditing;
    /** badge 종류의 tone. 비우면 neutral */
    readonly tone?: (value: unknown, row: Row) => Tone | undefined;
    /** 종류별 기본 형식 대신 쓸 표시 문자열 */
    readonly format?: (value: unknown, row: Row) => string;
}

export type Appearance = "plain" | "bordered" | "striped";

/**
 * 표가 서는 면.
 *
 * ⚠ **3층은 표에 바닥을 주지 않는다.** `table.css` 가 정하는 것은 셀과 줄이어서, 카드가 흰 면을 갖는
 *    시스템에서는 표만 페이지 바닥 위에 뜬다. 그 면을 블록이 갖는 까닭은 표가 서는 화면마다 같은
 *    감싸개를 다시 적지 않기 위해서이다(2026-09-22 사용자 확정).
 *
 * ⚠ **기본값은 `none` 이다.** 바꾸면 이미 선 표들이 말없이 달라진다.
 */
export type Surface = "none" | "card";
export type Density = "compact" | "default";
export type SortingMode = "none" | "single" | "multi";
export type FilterMode = "none" | "global" | "facet" | "both";
export type CellMode = "read" | "range" | "edit";
export type PaginationStyle = "minimal" | "full";

export type Viewport =
    | { readonly mode: "paginated"; readonly pagination?: PaginationStyle; readonly pageSizes?: ReadonlyArray<number> }
    | { readonly mode: "virtual"; readonly rowHeight?: number; readonly height?: number };

/** 축 일곱. 비우면 가장 단순한 표(plain · paginated minimal · 단일 정렬 · 필터 없음 · 읽기 셀)다 */
export interface DataTableFeatures
{
    readonly appearance?: Appearance;
    readonly surface?: Surface;
    readonly density?: Density;
    readonly viewport?: Viewport;
    readonly overflow?: "none" | "horizontal";
    readonly sorting?: SortingMode;
    readonly filter?: FilterMode;
    readonly columns?: {
        readonly visibility?: boolean;
        readonly pinning?: boolean;
        readonly resizing?: boolean;
        readonly reordering?: boolean;
    };
    readonly rows?: {
        readonly selection?: boolean;
        readonly reorder?: boolean;
        readonly actions?: boolean;
        readonly expansion?: boolean;
    };
    readonly cells?: CellMode;
}

export interface SortRule
{
    readonly id: string;
    readonly desc: boolean;
}

export interface ColumnFilter
{
    readonly id: string;
    readonly value: FilterValue;
}

export interface ColumnPinning
{
    readonly left: ReadonlyArray<string>;
    readonly right: ReadonlyArray<string>;
}

export interface PaginationState
{
    readonly pageIndex: number;
    readonly pageSize: number;
}

/**
 * 표의 상태. spec 이 초기값을 적고 사용자가 바꾼다.
 * URL 로 가는 축(`TableViewUrl`)과 사용자 설정으로 가는 축(`TableViewPrefs`)으로 갈라진다. 선택·확장은 어느 쪽에도 남기지 않는다.
 */
export interface TableView
{
    readonly sorting: ReadonlyArray<SortRule>;
    readonly columnFilters: ReadonlyArray<ColumnFilter>;
    readonly globalFilter: string;
    readonly pagination: PaginationState;
    readonly columnVisibility: Readonly<Record<string, boolean>>;
    readonly columnOrder: ReadonlyArray<string>;
    readonly columnPinning: ColumnPinning;
    readonly columnSizing: Readonly<Record<string, number>>;
    readonly density: Density;
    readonly rowSelection: Readonly<Record<string, boolean>>;
    readonly expanded: Readonly<Record<string, boolean>>;
}

export type TableViewUrl = Pick<TableView, "sorting" | "columnFilters" | "globalFilter" | "pagination">;
export type TableViewPrefs = Pick<TableView, "columnVisibility" | "columnOrder" | "columnPinning" | "columnSizing" | "density">;

/** 셀 좌표 — 화면에 보이는 순서 기준의 행·열 인덱스 */
export interface CellAddress
{
    readonly row: number;
    readonly col: number;
}

export interface CellRange
{
    readonly minRow: number;
    readonly maxRow: number;
    readonly minCol: number;
    readonly maxCol: number;
}

declare module "@tanstack/react-table" {
    /** 열 명세 중 렌더러가 읽는 부분. 함수(tone·format)는 여기 두지 않고 컴포넌트가 명세 맵에서 읽는다 */
    interface ColumnMeta<TData extends RowData, TValue>
    {
        readonly kind: CellKind;
        readonly align: ColumnAlign;
        readonly filter?: ColumnFilterKind;
        readonly facetOptions?: ReadonlyArray<FacetOption>;
        readonly editable?: ColumnEditing;
    }
}
