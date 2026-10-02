import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface PropertyListSkeletonProps
{
    readonly rows?: number;
    readonly labelWidth?: number;
    readonly className?: string;
}

/** 속성 목록이 오기 전의 자리. context 없이 선다 */
export function PropertyListSkeleton({ rows = 4, labelWidth = 160, className }: PropertyListSkeletonProps)
{
    return (
        <div data-slot="property-list-skeleton" aria-busy className={cn("flex flex-col", className)}>
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="flex items-center gap-[var(--surface-gap-lg)] border-b border-border py-[var(--menu-item-padding-x)]">
                    <Skeleton className="h-4" style={{ width: `${labelWidth - 40}px` }} />
                    <Skeleton className="h-4 w-40" />
                </div>
            ))}
        </div>
    );
}
