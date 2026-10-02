import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface CollapsibleGroupSkeletonProps
{
    /** 펴 놓고 기다리는 자리에서만 안쪽 줄을 그린다. 비우면 머리글 한 줄이다 */
    readonly rows?: number;
    readonly className?: string;
}

/**
 * 묶음이 오기 전의 자리. context 없이 선다.
 *
 * 기본이 머리글 한 줄인 것은 접힌 묶음이 차지하는 높이가 딱 그만큼이기 때문이다.
 * 펴 둔 자리를 기다릴 때만 rows 로 안쪽을 채운다.
 */
export function CollapsibleGroupSkeleton({ rows = 0, className }: CollapsibleGroupSkeletonProps)
{
    return (
        <div
            data-slot="collapsible-group-skeleton"
            aria-busy
            className={cn("flex flex-col gap-[var(--surface-gap)]", className)}
        >
            <div className="flex items-center gap-[var(--control-gap-sm)]">
                <Skeleton className="size-4 shrink-0 rounded-sm" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            {Array.from({ length: rows }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
            ))}
        </div>
    );
}
