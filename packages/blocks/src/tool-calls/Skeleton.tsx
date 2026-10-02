import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface ToolCallsSkeletonProps
{
    /** 몇 줄을 기다리는가. 비우면 접힌 묶음 한 줄이다 */
    readonly rows?: number;
    readonly className?: string;
}

/**
 * 도구 호출이 오기 전의 자리. context 없이 선다.
 *
 * 기본이 한 줄인 것은 접힌 묶음이 차지하는 높이가 딱 그만큼이기 때문이다. 레일처럼 펴 둔 목록을
 * 기다릴 때만 rows 로 채운다.
 */
export function ToolCallsSkeleton({ rows = 1, className }: ToolCallsSkeletonProps)
{
    return (
        <div
            data-slot="tool-calls-skeleton"
            aria-busy
            className={cn(
                "divide-y divide-border overflow-hidden rounded-[var(--surface-radius-sm)]",

                // ⚠ 테두리는 여럿을 묶을 때만 선다. 한 줄을 두르는 상자는 말하는 것이 없다
                rows > 1 ? "border border-border" : "",
                className,
            )}
        >
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="flex items-center gap-2 px-2.5 py-1.5">
                    <Skeleton className="size-3.5 shrink-0 rounded-sm" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-10" />
                </div>
            ))}
        </div>
    );
}
