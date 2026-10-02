import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface SectionHeaderSkeletonProps
{
    /** 설명 줄을 함께 그릴지. 비우면 제목 한 줄이다 */
    readonly description?: boolean;
    readonly className?: string;
}

/** 구획 머리가 오기 전의 자리. context 없이 선다 */
export function SectionHeaderSkeleton({ description = false, className }: SectionHeaderSkeletonProps)
{
    return (
        <div
            data-slot="section-header-skeleton"
            aria-busy
            className={cn("flex flex-col gap-[var(--surface-gap)]", className)}
        >
            <div className="flex items-center gap-[var(--control-gap-sm)]">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="ml-auto h-8 w-20" />
            </div>
            {description ? <Skeleton className="h-5 w-72" /> : null}
        </div>
    );
}
