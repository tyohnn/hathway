import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface StepperSkeletonProps
{
    readonly steps?: number;
    readonly className?: string;
}

/** 진행 표시가 오기 전의 자리. context 없이 선다 */
export function StepperSkeleton({ steps = 4, className }: StepperSkeletonProps)
{
    return (
        <div data-slot="stepper-skeleton" aria-busy className={cn("flex items-center", className)}>
            {Array.from({ length: steps }, (_, index) => (
                <div key={index} className={cn("flex items-center", index < steps - 1 ? "flex-1" : "")}>
                    <Skeleton className="size-6 shrink-0 rounded-full" />
                    <Skeleton className="ml-[var(--control-gap-sm)] h-5 w-20" />
                    {index < steps - 1
                        ? <span aria-hidden className="mx-[var(--control-gap-md)] h-px flex-1 bg-border" />
                        : null}
                </div>
            ))}
        </div>
    );
}
