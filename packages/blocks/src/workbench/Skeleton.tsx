import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface WorkbenchSkeletonProps
{
    /** 왼쪽 기둥에 그릴 줄 수 */
    readonly rows?: number;
    /** 왼쪽 기둥의 폭(px). 실제 화면과 같은 수를 준다 */
    readonly asideWidth?: number;
    readonly className?: string;
}

/**
 * 2단 화면이 오기 전의 자리. context 없이 선다.
 *
 * 폭을 인라인 style 로 주는 것은 Tailwind 가 빌드 때 클래스를 만들기 때문이다.
 * 호출부가 넘긴 수로는 임의값 클래스가 생성되지 않는다.
 */
export function WorkbenchSkeleton({ rows = 6, asideWidth = 360, className }: WorkbenchSkeletonProps)
{
    return (
        <div
            data-slot="workbench-skeleton"
            aria-busy
            className={cn("flex h-full min-h-0 w-full gap-[var(--surface-gap-lg)]", className)}
        >
            <div className="flex w-[var(--workbench-aside-width)] shrink-0 flex-col gap-[var(--surface-gap)]" style={asideWidth === undefined ? undefined : { width: `${asideWidth}px` }}>
                {Array.from({ length: rows }, (_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[var(--surface-gap-lg)]">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-full min-h-40 w-full" />
            </div>
        </div>
    );
}
