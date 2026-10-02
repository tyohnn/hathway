import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface StatusBadgeSkeletonProps
{
    readonly className?: string;
}

/** 배지가 오기 전의 자리. context 없이 선다 */
export function StatusBadgeSkeleton({ className }: StatusBadgeSkeletonProps)
{
    return <Skeleton className={cn("h-5 w-14 rounded-4xl", className)} data-slot="status-badge-skeleton" aria-busy />;
}
