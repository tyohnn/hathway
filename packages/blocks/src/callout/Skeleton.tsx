import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface CalloutSkeletonProps
{
    readonly className?: string;
}

/** 배너가 오기 전의 자리. context 없이 선다 */
export function CalloutSkeleton({ className }: CalloutSkeletonProps)
{
    return (
        <div
            data-slot="callout-skeleton"
            aria-busy
            className={cn(
                "flex gap-[var(--surface-icon-gap)] rounded-[var(--surface-radius)] border border-border p-[var(--surface-padding-sm)]",
                className,
            )}
        >
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-[var(--surface-gap)]">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full max-w-96" />
            </div>
        </div>
    );
}
