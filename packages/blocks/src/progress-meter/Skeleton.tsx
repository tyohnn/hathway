import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface ProgressMeterSkeletonProps
{
    /** 이름 줄을 함께 그릴지. 수만 보이는 자리에서는 끈다 */
    readonly label?: boolean;
    readonly className?: string;
}

/** 진행률이 오기 전의 자리. context 없이 선다 */
export function ProgressMeterSkeleton({ label = true, className }: ProgressMeterSkeletonProps)
{
    return (
        <div
            data-slot="progress-meter-skeleton"
            aria-busy
            className={cn("flex flex-col gap-[var(--surface-gap)]", className)}
        >
            {label
                ? (
                    <div className="flex items-center justify-between gap-[var(--control-gap-sm)]">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-10" />
                    </div>
                )
                : null}
            <Skeleton className="h-1 w-full rounded-full" />
        </div>
    );
}
