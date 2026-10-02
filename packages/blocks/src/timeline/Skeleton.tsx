import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface TimelineSkeletonProps
{
    readonly rows?: number;
    readonly className?: string;
}

/** 이력이 오기 전의 자리. context 없이 선다 */
export function TimelineSkeleton({ rows = 3, className }: TimelineSkeletonProps)
{
    return (
        <div data-slot="timeline-skeleton" aria-busy className={cn("flex flex-col", className)}>
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="flex gap-[var(--surface-icon-gap)]">
                    <div className="flex shrink-0 flex-col items-center">
                        <Skeleton className="size-4 rounded-full" />
                        {index < rows - 1
                            ? <span aria-hidden className="flex-1 bg-border" style={{ width: "var(--surface-border-width)" }} />
                            : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-[var(--surface-gap)] pb-[var(--surface-padding-md)]">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                </div>
            ))}
        </div>
    );
}
