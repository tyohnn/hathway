"use client";

import type { ReactNode } from "react";

import { DataTable, type DataTableColumn } from "@hathway/ui/blocks/data-table";
import { INLINE_CODE, NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText } from "@hathway/ui/blocks/pending";
import { TableFrame } from "@hathway/ui/blocks/table-frame";
import { Badge } from "@hathway/ui/components/badge";
import { cn } from "@hathway/ui/lib/utils";
import { strings } from "@hathway/ui/strings";

export type Parameter = {
    name: string;
    type: string;
    required: boolean;
    description: ReactNode;
    /** A line under the description: the values it accepts, its default */
    note?: ReactNode;
};

export type ParameterTableLabels = {
    /** The four column names */
    name: string;
    type: string;
    required: string;
    description: string;
    /** The badge of a parameter that must be sent, and of one that may be left out */
    requiredBadge: string;
    optionalBadge: string;
};

/**
 * The parameters of an endpoint, a command or a function as a framed table: the name and its type in the mono
 * stack, whether it is required as a badge, and what it does with an optional note under it. `loading` keeps the
 * header and draws `loadingRows` rows: bars for the name, the type and the description, an empty badge. A waiting
 * row is one line tall; a description that wraps or carries a note makes its row taller when it arrives.
 */
export const ParameterTable = ({
    parameters,
    labels: given,
    loading,
    loadingRows = 3,
    className,
}: {
    parameters?: readonly Parameter[];
    /** Any of the words, in place of the locale's own */
    labels?: Partial<ParameterTableLabels>;
    loading?: boolean;
    loadingRows?: number;
    className?: string;
}) =>
{
    const labels: ParameterTableLabels = { ...strings.blocks.parameters, ...given };

    const columns: DataTableColumn<Parameter>[] = [
        { id: "name", header: labels.name, pending: <code className={cn(INLINE_CODE, "font-semibold whitespace-nowrap")}><PendingText length={12} /></code>, cell: (parameter) => <code className={cn(INLINE_CODE, "font-semibold whitespace-nowrap")}>{parameter.name}</code> },
        { id: "type", header: labels.type, pending: <code className={cn(INLINE_CODE, "whitespace-nowrap text-muted-foreground")}><PendingText length={7} /></code>, cell: (parameter) => <code className={cn(INLINE_CODE, "whitespace-nowrap text-muted-foreground")}>{parameter.type}</code> },
        {
            id: "required",
            header: labels.required,
            // The bar takes the badge's own line height, so the empty badge sits on the same baseline as one with a word in it.
            pending: <Badge variant="outline"><PendingText length={8} className="leading-[inherit]" /></Badge>,
            cell: (parameter) => parameter.required ? <Badge>{labels.requiredBadge}</Badge> : <Badge variant="outline">{labels.optionalBadge}</Badge>,
        },
        {
            id: "description",
            header: labels.description,
            kind: "wrap",
            pending: <span className="flex flex-col gap-1"><PendingText length={32} /></span>,
            cell: (parameter) => (
                <span className="flex flex-col gap-1">
                    {parameter.description}
                    {parameter.note !== undefined && <span className={NOTE}>{parameter.note}</span>}
                </span>
            ),
        },
    ];

    return (
        <TableFrame className={className}>
            <DataTable columns={columns} rows={parameters} rowId={(parameter) => parameter.name} loading={loading} loadingRows={loadingRows} />
        </TableFrame>
    );
};
