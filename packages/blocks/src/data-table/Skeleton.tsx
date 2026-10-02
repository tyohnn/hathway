import { Skeleton } from "@investment/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@investment/ui/components/table";
import { cn } from "@investment/ui/lib/utils";

export interface DataTableSkeletonProps
{
    readonly columns?: number;
    readonly rows?: number;
    readonly className?: string;
}

/** 표가 오기 전의 자리. 런타임이 Suspense fallback 으로 쓴다. context 가 필요 없다 */
export function DataTableSkeleton({ columns = 5, rows = 5, className }: DataTableSkeletonProps)
{
    return (
        <div className={cn("rounded-md border border-border", className)} data-slot="data-table-skeleton" aria-busy>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {Array.from({ length: columns }, (_, index) => (
                            <TableHead key={index}>
                                <Skeleton className="h-4 w-20" />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: rows }, (_, row) => (
                        <TableRow key={row} className="hover:bg-transparent">
                            {Array.from({ length: columns }, (__, column) => (
                                <TableCell key={column}>
                                    <Skeleton className="h-4 w-full" />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
