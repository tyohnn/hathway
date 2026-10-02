import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

import type { FilterBarLayout } from "./types";

export interface FilterBarSkeletonProps
{
    readonly facets?: number;
    readonly layout?: FilterBarLayout;
    readonly pills?: number;
    readonly className?: string;
}

/**
 * 조건 띠가 오기 전의 자리. context 없이 선다.
 *
 * ⚠ 배치를 함께 받는다. 격자로 그릴 화면에 띠 모양 스켈레톤을 세우면 다 불러온 순간
 *    조건 영역의 높이가 통째로 바뀌어 아래 목록이 뛴다.
 */
export function FilterBarSkeleton({ facets = 2, layout = "bar", pills = 0, className }: FilterBarSkeletonProps)
{
    if (layout === "grid")
    {
        return (
            <div
                data-slot="filter-bar-skeleton"
                data-layout="grid"
                aria-busy
                className={cn("flex flex-col gap-[var(--surface-gap-lg)]", className)}
            >
                <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-[var(--surface-gap-lg)]">
                    {Array.from({ length: facets }, (_, index) => (
                        <div key={index} className="flex flex-col gap-[var(--control-gap-md)]">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-9 w-full" />
                {pills === 0
                    ? null
                    : (
                        <div className="flex flex-wrap gap-[var(--control-gap-sm)]">
                            {Array.from({ length: pills }, (_, index) => <Skeleton key={index} className="h-8 w-16" />)}
                        </div>
                    )}
            </div>
        );
    }

    return (
        <div
            data-slot="filter-bar-skeleton"
            data-layout="bar"
            aria-busy
            className={cn("flex flex-wrap items-center gap-[var(--control-gap-sm)]", className)}
        >
            <Skeleton className="h-9 w-56" />
            {Array.from({ length: facets }, (_, index) => <Skeleton key={index} className="h-9 w-24" />)}
            <Skeleton className="h-9 w-28" />
            {pills === 0
                ? null
                : (
                    <div className="flex basis-full flex-wrap gap-[var(--control-gap-sm)]">
                        {Array.from({ length: pills }, (_, index) => <Skeleton key={index} className="h-8 w-16" />)}
                    </div>
                )}
        </div>
    );
}
