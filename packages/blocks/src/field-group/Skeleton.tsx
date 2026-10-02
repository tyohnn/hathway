import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface FieldGroupSkeletonProps
{
    readonly fields?: number;
    readonly columns?: 1 | 2;
    readonly className?: string;
}

/** 폼 구역이 오기 전의 자리. context 없이 선다 */
export function FieldGroupSkeleton({ fields = 4, columns = 1, className }: FieldGroupSkeletonProps)
{
    return (
        <div
            data-slot="field-group-skeleton"
            aria-busy
            className={cn(
                "grid grid-cols-1 gap-[var(--surface-gap-lg)]",
                columns === 2 ? "sm:grid-cols-2" : "",
                className,
            )}
        >
            {Array.from({ length: fields }, (_, index) => (
                <div key={index} className="flex flex-col gap-[var(--surface-gap)]">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-9 w-full" />
                </div>
            ))}
        </div>
    );
}
