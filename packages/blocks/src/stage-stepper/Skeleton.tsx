import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface StageStepperSkeletonProps
{
    /** 그릴 칸 수. 실제 단계 수를 알면 그 수를 준다 */
    readonly steps?: number;
    /** 범례 자리를 함께 그릴지 */
    readonly legend?: boolean;
    readonly className?: string;
}

/** 단계 띠가 오기 전의 자리. context 없이 선다 */
export function StageStepperSkeleton({ steps = 6, legend = true, className }: StageStepperSkeletonProps)
{
    return (
        <div
            data-slot="stage-stepper-skeleton"
            aria-busy
            className={cn("flex w-full flex-col gap-[var(--surface-gap-lg)]", className)}
        >
            <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${steps}, minmax(0, 1fr))` }}
            >
                {Array.from({ length: steps }, (_, index) => (
                    <div key={index} className="flex min-w-0 flex-col gap-[var(--surface-gap)]">
                        <Skeleton className="h-7 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                ))}
            </div>
            {legend ? <Skeleton className="h-4 w-56" /> : null}
        </div>
    );
}
