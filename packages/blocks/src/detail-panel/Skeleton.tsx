import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface DetailPanelSkeletonProps
{
    readonly width?: number;
    readonly className?: string;
}

/** 패널이 오기 전의 자리. context 없이 선다 */
export function DetailPanelSkeleton({ width, className }: DetailPanelSkeletonProps)
{
    return (
        <div
            data-slot="detail-panel-skeleton"
            aria-busy
            className={cn("flex flex-col gap-[var(--surface-gap-lg)] border border-border bg-card", className)}
            style={{
                width: width === undefined ? "var(--surface-panel-width)" : `${width}px`,
                borderRadius: "var(--surface-radius)",
                padding: "var(--surface-padding-md)",
            }}
        >
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    );
}
