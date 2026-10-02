import type { ColumnDef, FilterFn } from "@tanstack/react-table";

import { formatDateShort, formatDateTime } from "@investment/shared/utils/dateFormatting";
import { formatCurrency, formatHours, formatNumberWithCommas } from "@investment/shared/utils/formatters";

import type { CellKind, ColumnAlign, ColumnSpec, DataRow, DataTableFeatures, FilterValue } from "./types";

const isBlank = (value: unknown): boolean => value === null || value === undefined || value === "";

const toNumber = (value: unknown): number | undefined =>
{
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

    return Number.isFinite(parsed) ? parsed : undefined;
};

const isDateInput = (value: unknown): value is string | Date => typeof value === "string" || value instanceof Date;

/**
 * 셀 값을 표시 문자열로 바꾼다. 형식은 packages/shared 의 포매터 하나뿐이다 — 표마다 `toLocaleString` 을
 * 따로 부르던 드리프트(admin 34 파일 · 비즈센터 22 파일)를 여기서 막는다.
 */
export function formatCellValue(kind: CellKind | undefined, value: unknown): string
{
    if (isBlank(value))
    {
        return "";
    }

    switch (kind ?? "text")
    {
        case "number":
            return typeof value === "number" || typeof value === "string" ? formatNumberWithCommas(value) : String(value);
        case "money":
        {
            const amount = toNumber(value);

            return amount === undefined ? "" : formatCurrency(amount);
        }
        case "hours":
        {
            const hours = toNumber(value);

            return hours === undefined ? "" : formatHours(hours);
        }
        case "date":
            return isDateInput(value) ? formatDateShort(value) : String(value);
        case "datetime":
            return isDateInput(value) ? formatDateTime(value) : String(value);
        case "boolean":
            return value === true ? "예" : value === false ? "아니요" : String(value);
        case "badge":
        case "text":
            return String(value);
    }
}

/** 열의 표시 문자열 — 명세의 `format` 이 있으면 그것, 없으면 종류별 기본 형식 */
export function cellText<Row extends DataRow>(column: ColumnSpec<Row>, row: Row): string
{
    const value = row[column.key];

    return column.format ? column.format(value, row) : formatCellValue(column.kind, value);
}

export function defaultAlign(kind: CellKind = "text"): ColumnAlign
{
    switch (kind)
    {
        case "number":
        case "money":
        case "hours":
            return "end";
        case "boolean":
            return "center";
        default:
            return "start";
    }
}

/** TanStack 이 든 필터값을 우리 계약(문자열 배열)으로 접는다. 문자열 하나는 한 칸짜리 배열이다 */
export const toFilterValue = (value: unknown): FilterValue =>
    Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : typeof value === "string" && value !== "" ? [value] : [];

/** 텍스트 필터 — 대소문자 없이 부분 일치. 비어 있으면 통과 */
export function matchesText(cell: unknown, filter: FilterValue): boolean
{
    const needle = filter[0]?.trim().toLowerCase() ?? "";

    if (needle === "")
    {
        return true;
    }

    return String(cell ?? "").toLowerCase().includes(needle);
}

/** 패싯 필터 — 선택값 중 하나와 같으면 통과. 비어 있으면 통과 */
export function matchesFacet(cell: unknown, filter: FilterValue): boolean
{
    return filter.length === 0 || filter.includes(String(cell));
}

/** 행 기능이 붙이는 메타 열의 id. 데이터 열과 겹치지 않도록 밑줄 둘로 시작한다 */
export const META_COLUMN = {
    drag: "__drag",
    select: "__select",
    expand: "__expand",
    actions: "__actions",
} as const;

/** 메타 열인지. 데이터 열은 밑줄 둘로 시작할 수 없다 */
export const isMetaColumnId = (id: string): boolean => id.startsWith("__");

/** 행 기능에 따라 앞뒤에 붙는 메타 열. 앞은 드래그 → 선택 → 확장 순, 뒤는 액션이다 */
export function metaColumnIds(features: DataTableFeatures): ReadonlyArray<string>
{
    const ids: string[] = [];

    if (features.rows?.reorder)
    {
        ids.push(META_COLUMN.drag);
    }

    if (features.rows?.selection)
    {
        ids.push(META_COLUMN.select);
    }

    if (features.rows?.expansion)
    {
        ids.push(META_COLUMN.expand);
    }

    if (features.rows?.actions)
    {
        ids.push(META_COLUMN.actions);
    }

    return ids;
}

/**
 * 열 명세를 TanStack 열 정의로 바꾼다. 데이터 열만 만든다 — 메타 열(선택·확장·드래그·액션)은 JSX 가 필요해 컴포넌트가 붙인다.
 * 값 접근은 `accessorFn` 이다(`accessorKey` 는 점이 든 키를 경로로 해석한다).
 */
export function buildColumnDefs<Row extends DataRow>(
    specs: ReadonlyArray<ColumnSpec<Row>>,
    features: DataTableFeatures,
): ColumnDef<Row, unknown>[]
{
    const sortingOn = (features.sorting ?? "single") !== "none";

    return specs.map((spec) =>
    {
        // 행 타입마다 닫힌 함수를 만든다. 모듈 스코프의 FilterFn<DataRow> 은 반공변이라 FilterFn<Row> 에 대입되지 않는다.
        const filterFn: FilterFn<Row> = spec.filter === "facet"
            ? (row, columnId, filterValue) => matchesFacet(row.getValue(columnId), toFilterValue(filterValue))
            : (row, columnId, filterValue) => matchesText(row.getValue(columnId), toFilterValue(filterValue));

        return {
            id: spec.key,
            accessorFn: (row: Row) => row[spec.key],
            header: spec.label,
            enableSorting: sortingOn && spec.sortable !== false,
            enableHiding: spec.hideable !== false,
            enablePinning: spec.pinnable !== false,
            enableResizing: spec.resizable !== false,
            enableColumnFilter: spec.filter !== undefined,
            filterFn,
            ...(spec.width !== undefined ? { size: spec.width } : {}),
            ...(spec.minWidth !== undefined ? { minSize: spec.minWidth } : {}),
            ...(spec.maxWidth !== undefined ? { maxSize: spec.maxWidth } : {}),
            meta: {
                kind: spec.kind ?? "text",
                align: spec.align ?? defaultAlign(spec.kind),
                ...(spec.filter !== undefined ? { filter: spec.filter } : {}),
                ...(spec.facetOptions !== undefined ? { facetOptions: spec.facetOptions } : {}),
                ...(spec.editable !== undefined ? { editable: spec.editable } : {}),
            },
        };
    });
}
