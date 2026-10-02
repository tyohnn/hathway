import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface SettingsListSkeletonProps
{
    readonly rows?: number;
    readonly className?: string;
}

/** 설정 목록이 오기 전의 자리. context 없이 선다 */
export function SettingsListSkeleton({ rows = 3, className }: SettingsListSkeletonProps)
{
    return (
        <div data-slot="settings-list-skeleton" aria-busy className={cn("flex flex-col", className)}>
            {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="flex items-center justify-between gap-[var(--surface-gap-lg)] border-b border-border py-[var(--surface-padding-md)]">
                    <div className="flex flex-col gap-[var(--surface-gap)]">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
                </div>
            ))}
        </div>
    );
}
