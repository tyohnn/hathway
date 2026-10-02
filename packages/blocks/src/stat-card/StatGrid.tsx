"use client";

import { cn } from "@investment/ui/lib/utils";

import type { StatGridProps } from "./types";

/** 열 수는 값이 아니라 배치라 토큰이 아니다. 좁은 화면에서는 언제나 한 열이다 */
const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
};

/** StatCard 를 나란히 놓는 격자. 간격은 모달 안 구역 사이와 같은 축(surface/gap-lg)을 읽는다 */
export function StatGrid({ columns = 3, children, className }: StatGridProps)
{
    return (
        <div
            data-slot="stat-grid"
            className={cn("grid grid-cols-1 gap-[var(--surface-gap-lg)]", COLUMN_CLASS[columns], className)}
        >
            {children}
        </div>
    );
}
