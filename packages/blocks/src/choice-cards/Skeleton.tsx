import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface ChoiceCardsSkeletonProps
{
    readonly options?: number;
    readonly className?: string;
}

/** 선택지가 오기 전의 자리. context 없이 선다 */
export function ChoiceCardsSkeleton({ options = 3, className }: ChoiceCardsSkeletonProps)
{
    return (
        <div
            data-slot="choice-cards-skeleton"
            aria-busy
            className={cn("grid grid-cols-1 gap-[var(--control-gap-md)] sm:grid-flow-col sm:auto-cols-fr", className)}
        >
            {Array.from({ length: options }, (_, index) => (
                <div
                    key={index}
                    className="flex items-start gap-[var(--surface-icon-gap)] border border-border bg-card"
                    style={{ borderRadius: "var(--surface-radius)", padding: "var(--surface-padding-md)" }}
                >
                    <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                    <div className="flex flex-1 flex-col gap-[var(--surface-gap)]">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-4 w-40" />
                    </div>
                </div>
            ))}
        </div>
    );
}
