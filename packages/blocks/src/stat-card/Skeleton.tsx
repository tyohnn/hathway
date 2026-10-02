import { Card, CardContent, CardHeader } from "@investment/ui/components/card";
import { Skeleton } from "@investment/ui/components/skeleton";

export interface StatCardSkeletonProps
{
    readonly size?: "default" | "sm";
    readonly className?: string;
}

/** 지표가 오기 전의 자리. context 없이 선다 */
export function StatCardSkeleton({ size = "sm", className }: StatCardSkeletonProps)
{
    return (
        <Card size={size} data-slot="stat-card-skeleton" aria-busy className={className}>
            <CardHeader>
                <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-9 w-16" />
            </CardContent>
        </Card>
    );
}
