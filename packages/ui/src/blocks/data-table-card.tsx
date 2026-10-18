"use client";

import { type ReactNode, useState } from "react";

import { Card, CardContent } from "@hathway/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@hathway/ui/components/tabs";
import { DataTable, type DataTableColumn, type DataTableSelection } from "@hathway/ui/blocks/data-table";
import { FOOTER_BAND, TOOLBAR_BAND } from "@hathway/ui/blocks/lib/bands";
import { PendingText } from "@hathway/ui/blocks/pending";
import { META } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

export type DataTableTab = { value: string; label: string; count?: ReactNode };

export type DataTableCardSelection<Row> = Omit<DataTableSelection<Row>, "selected" | "width"> & {
    /** The line in the selection bar ("2 selected") */
    summary: (count: number) => ReactNode;
    /** Bulk actions in the selection bar */
    actions?: ReactNode;
};

/**
 * A table in a card that fills the height it is given and scrolls inside: views as tabs with counts and the
 * filters in the toolbar, a bar of bulk actions while rows are selected, and the summary with the pages in the
 * footer. The tabs filter the one table (the caller swaps the rows); for tabs that switch panels use TabCard.
 */
export const DataTableCard = <Row,>({
    columns,
    rows,
    rowId,
    tabs,
    defaultTab,
    onTabChange,
    controls,
    selection,
    summary,
    pagination,
    loading,
    loadingRows,
    className,
}: {
    columns: readonly DataTableColumn<Row>[];
    rows?: readonly Row[];
    rowId: (row: Row) => string;
    tabs?: readonly DataTableTab[];
    defaultTab?: string;
    onTabChange?: (value: string) => void;
    /** The toolbar's right side: search, filters, column and filter buttons */
    controls?: ReactNode;
    selection?: DataTableCardSelection<Row>;
    /** The footer's left side ("Showing 1–12 of 2,184 orders") */
    summary?: ReactNode;
    /** The footer's right side */
    pagination?: ReactNode;
    /** The waiting face: the toolbar stays, the table draws rows of bars, the summary is a bar */
    loading?: boolean;
    loadingRows?: number;
    className?: string;
}) =>
{
    const [selected, setSelected] = useState<readonly string[]>(selection?.defaultSelected ?? []);
    // While loading there are no rows to count: a selection the caller already knows keeps its bar, so the table does not move when the rows arrive.
    const count = loading || rows === undefined ? selected.length : rows.filter((row) => selected.includes(rowId(row))).length;

    return (
        <Card className={cn("min-h-0 flex-1 gap-0 py-0", className)}>
            {(tabs !== undefined || controls !== undefined) && (
                <div className={TOOLBAR_BAND}>
                    {tabs !== undefined && (
                        <Tabs defaultValue={defaultTab ?? tabs[0]?.value} onValueChange={onTabChange && ((value) => onTabChange(String(value)))}>
                            <TabsList>
                                {tabs.map((tab) => (
                                    <TabsTrigger key={tab.value} value={tab.value}>
                                        {tab.label}
                                        {tab.count !== undefined && <span className={META}>{loading ? <PendingText length={3} /> : tab.count}</span>}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    )}
                    {controls !== undefined && <div className="flex flex-wrap items-center gap-2">{controls}</div>}
                </div>
            )}
            {selection !== undefined && count > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted px-4 py-2">
                    <span className={META}>{selection.summary(count)}</span>
                    {selection.actions}
                </div>
            )}
            <CardContent className="min-h-0 flex-1 overflow-y-auto px-0">
                <DataTable
                    columns={columns}
                    rows={rows}
                    loading={loading}
                    loadingRows={loadingRows}
                    rowId={rowId}
                    selection={selection && {
                        selected,
                        onChange: (next) =>
                        {
                            setSelected(next);
                            selection.onChange?.(next);
                        },
                        selectAllLabel: selection.selectAllLabel,
                        selectRowLabel: selection.selectRowLabel,
                    }}
                />
            </CardContent>
            {(loading || summary !== undefined || pagination !== undefined) && (
                <div className={FOOTER_BAND}>
                    {loading ? <span className={META}><PendingText length={28} /></span> : summary !== undefined && <span className={META}>{summary}</span>}
                    {pagination}
                </div>
            )}
        </Card>
    );
};
