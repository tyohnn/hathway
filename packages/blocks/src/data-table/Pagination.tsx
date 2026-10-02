"use client";

import { Button } from "@investment/ui/components/button";
import { NativeSelect, NativeSelectOption } from "@investment/ui/components/native-select";
import { ChevronLeft, ChevronRight } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { useDataTable } from "./context";
import { ChevronsLeft, ChevronsRight } from "../icons/extra";

/** 페이지 번호 창. 7개 이하는 전부, 그 위는 처음·끝·현재 주변 셋만 보이고 나머지는 줄임표다 */
export function pageWindow(current: number, total: number): ReadonlyArray<number | "…">
{
    if (total <= 7)
    {
        return Array.from({ length: total }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, total, current, current - 1, current + 1]);
    const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
    const result: (number | "…")[] = [];

    sorted.forEach((page, index) =>
    {
        const previous = sorted[index - 1];

        if (previous !== undefined && page - previous > 1)
        {
            result.push("…");
        }

        result.push(page);
    });

    return result;
}

export interface PaginationProps
{
    readonly className?: string;
}

/**
 * 페이지네이션. `minimal` 은 범위 텍스트 + 이전·다음, `full` 은 페이지 크기 · 번호 · 처음·끝까지다.
 * 뷰포트가 virtual 이면 그리지 않는다.
 *
 * ⚠ 프리미티브 `Pagination` 은 링크(<a>)를 그려 disabled 가 없다. 자바스크립트로 넘기는 표에는 버튼이 맞다.
 */
export function Pagination({ className }: PaginationProps)
{
    const { state, meta } = useDataTable();
    const { table, features, totalRows } = state;
    const { labels } = meta;

    if (features.viewport.mode !== "paginated")
    {
        return null;
    }

    const { pageIndex, pageSize } = table.getState().pagination;
    const pageCount = Math.max(1, table.getPageCount());
    const current = pageIndex + 1;
    const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
    const to = Math.min(totalRows, (pageIndex + 1) * pageSize);
    const full = features.viewport.pagination === "full";

    return (
        <nav aria-label="pagination" data-slot="data-table-pagination" className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {full && (
                    <label className="flex items-center gap-2">
                        <span>{labels.rowsPerPage}</span>
                        <NativeSelect
                            size="sm"
                            aria-label={labels.rowsPerPage}
                            value={String(pageSize)}
                            onChange={(event) => table.setPageSize(Number(event.target.value))}
                        >
                            {features.viewport.pageSizes.map((size) => (
                                <NativeSelectOption key={size} value={String(size)}>{size}</NativeSelectOption>
                            ))}
                        </NativeSelect>
                    </label>
                )}
                <span data-slot="data-table-range">{labels.range(from, to, totalRows)}</span>
            </div>
            <div className="flex items-center gap-1">
                {full && (
                    <Button variant="outline" size="icon-sm" aria-label={labels.first} disabled={!table.getCanPreviousPage()} onClick={() => table.setPageIndex(0)}>
                        <ChevronsLeft />
                    </Button>
                )}
                <Button variant="outline" size="icon-sm" aria-label={labels.previous} disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
                    <ChevronLeft />
                </Button>
                {full
                    ? pageWindow(current, pageCount).map((page, index) =>
                        page === "…"
                            ? <span key={`gap-${index}`} className="px-1 text-muted-foreground" aria-hidden>…</span>
                            : (
                                <Button
                                    key={page}
                                    variant={page === current ? "outline" : "ghost"}
                                    size="icon-sm"
                                    aria-current={page === current ? "page" : undefined}
                                    aria-label={`${page} 페이지`}
                                    onClick={() => table.setPageIndex(page - 1)}
                                >
                                    {page}
                                </Button>
                            ))
                    : <span className="px-2 text-sm text-muted-foreground tabular-nums">{labels.page(current, pageCount)}</span>}
                <Button variant="outline" size="icon-sm" aria-label={labels.next} disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
                    <ChevronRight />
                </Button>
                {full && (
                    <Button variant="outline" size="icon-sm" aria-label={labels.last} disabled={!table.getCanNextPage()} onClick={() => table.setPageIndex(pageCount - 1)}>
                        <ChevronsRight />
                    </Button>
                )}
            </div>
        </nav>
    );
}
