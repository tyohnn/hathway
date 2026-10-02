import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface TagInputSkeletonProps
{
    readonly className?: string;
}

/** 칩 입력이 오기 전의 자리. context 없이 선다 */
export function TagInputSkeleton({ className }: TagInputSkeletonProps)
{
    return (
        <Skeleton
            data-slot="tag-input-skeleton"
            className={cn("w-full", className)}
            style={{ height: "var(--control-height-md)", borderRadius: "var(--control-radius)" }}
        />
    );
}
