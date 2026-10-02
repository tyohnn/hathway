import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface ConversationSkeletonProps
{
    /** 몇 줄을 기다리는가. 비우면 셋이다 */
    readonly turns?: number;
    readonly className?: string;
}

/**
 * 대화가 오기 전의 자리. context 없이 선다.
 *
 * 줄을 번갈아 좌우로 두는 것은 기다리는 동안에도 이 자리가 대화라는 것을 알리기 위해서다. 한쪽으로만
 * 쌓으면 목록을 기다리는 자리와 구분되지 않는다.
 */
export function ConversationSkeleton({ turns = 3, className }: ConversationSkeletonProps)
{
    return (
        <div data-slot="conversation-skeleton" aria-busy className={cn("flex flex-col gap-5", className)}>
            {Array.from({ length: turns }, (_, index) => (
                <div key={index} className={cn("flex", index % 2 === 0 ? "justify-end" : "gap-2")}>
                    {index % 2 === 0 ? null : <Skeleton className="size-8 shrink-0 rounded-full" />}
                    <Skeleton className={cn("h-16 rounded-[var(--bubble-radius)]", index % 2 === 0 ? "w-2/5" : "w-3/5")} />
                </div>
            ))}
        </div>
    );
}
