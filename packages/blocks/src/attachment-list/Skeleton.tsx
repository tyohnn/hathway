import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface AttachmentListSkeletonProps
{
    readonly rows?: number;
    readonly className?: string;
}

/** 첨부 목록이 오기 전의 자리. context 없이 선다 */
export function AttachmentListSkeleton({ rows = 3, className }: AttachmentListSkeletonProps)
{
    return (
        <div
            data-slot="attachment-list-skeleton"
            aria-busy
            className={cn("flex flex-col gap-[var(--control-gap-sm)]", className)}
        >
            {Array.from({ length: rows }, (_, index) => (
                <div
                    key={index}
                    className="flex items-center gap-[var(--surface-icon-gap)] border border-border bg-card"
                    style={{ borderRadius: "var(--surface-radius)", padding: "var(--surface-padding-sm)" }}
                >
                    <Skeleton className="size-10 shrink-0 rounded-md" />
                    <div className="flex flex-1 flex-col gap-[var(--surface-gap)]">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
            ))}
        </div>
    );
}
