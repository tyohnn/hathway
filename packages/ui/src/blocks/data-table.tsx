"use client";

import { type ReactNode, useState } from "react";

import { ArrowUpDown } from "@hathway/ui/icons";

import { Button } from "@hathway/ui/components/button";
import { Checkbox } from "@hathway/ui/components/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hathway/ui/components/table";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { CODE } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";
import { strings } from "@hathway/ui/strings";

export type DataTableColumn<Row> = {
    id: string;
    /** The column's name. `hidden` keeps it for assistive technology only (a column of row actions). */
    header: string;
    hidden?: boolean;
    /**
     * `number` right-aligns with tabular figures · `code` sets an identifier in the mono stack · `nowrap` keeps a short
     * value on one line · `wrap` lets a sentence run over several lines
     */
    kind?: "text" | "nowrap" | "wrap" | "code" | "number";
    /** `end` puts the header and the cells at the end of the column: a status badge, a row's action */
    align?: "end";
    /** Utilities for the column's body cells on top of its kind, reading tokens: a smaller size for a long path */
    cellClassName?: string;
    /** The least width in px; the table still lays out automatically, so a system with larger type widens the column */
    width?: number;
    /** The cell while the table is loading: a bar by default; pass the cell's own waiting face (`<Person loading detail />`) so the row keeps its height */
    pending?: ReactNode;
    /** Draws the header as a sort button and reports the press */
    onSort?: () => void;
    cell: (row: Row) => ReactNode;
};

export type DataTableSelection<Row> = {
    /** Row ids selected at first; the table keeps the selection from then on. Pass `selected` to own it instead. */
    defaultSelected?: readonly string[];
    selected?: readonly string[];
    onChange?: (selected: string[]) => void;
    /** Names for the checkboxes: the one in the header and each row's (the locale's own words when left out) */
    selectAllLabel?: string;
    selectRowLabel?: (row: Row) => string;
    /** The checkbox column's least width in px, when the columns have widths */
    width?: number;
};

const CELL: Record<NonNullable<DataTableColumn<unknown>["kind"]>, string> = {
    text: "",
    nowrap: "whitespace-nowrap",
    wrap: "whitespace-normal",
    code: CODE,
    number: "text-right tabular-nums whitespace-nowrap",
};

/**
 * A table drawn from columns and rows: typed cells (text, one-line, wrapping, identifier, number), sortable headers and a
 * checkbox column when `selection` is given. It is the bare table — put it in a card (DataTableCard), a tab panel
 * (TabCard) or straight on the page. The rows come from the caller; the table fetches nothing. `loading` keeps
 * the header and draws rows of bars; a column's `pending` is its cell's own waiting face.
 */
export const DataTable = <Row,>({
    columns,
    rows,
    rowId,
    selection,
    wrapHeaders,
    loading,
    loadingRows = 6,
}: {
    columns: readonly DataTableColumn<Row>[];
    rows?: readonly Row[];
    rowId: (row: Row) => string;
    selection?: DataTableSelection<Row>;
    /** Lets header labels wrap, so a narrow column follows its cells instead of its name */
    wrapHeaders?: boolean;
    /** The waiting face: the same header over `loadingRows` rows of bars */
    loading?: boolean;
    loadingRows?: number;
}) =>
{
    const [own, setOwn] = useState<readonly string[]>(selection?.defaultSelected ?? []);
    const selected = selection?.selected ?? own;
    const shown = loading || rows === undefined ? [] : rows;
    const ids = shown.map(rowId);
    const here = ids.filter((id) => selected.includes(id));
    const update = (next: string[]) =>
    {
        setOwn(next);
        selection?.onChange?.(next);
    };
    const sized = selection?.width !== undefined || columns.some((column) => column.width !== undefined);

    return (
        <Table {...pendingFrame(loading)}>
            {sized && (
                <colgroup>
                    {selection !== undefined && <col style={selection.width === undefined ? undefined : { width: selection.width }} />}
                    {columns.map((column) => <col key={column.id} style={column.width === undefined ? undefined : { width: column.width }} />)}
                </colgroup>
            )}
            <TableHeader>
                <TableRow>
                    {selection !== undefined && (
                        <TableHead>
                            <Checkbox
                                checked={ids.length > 0 && here.length === ids.length}
                                indeterminate={here.length > 0 && here.length < ids.length}
                                onCheckedChange={(checked) => update(checked ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id)))}
                                aria-label={selection.selectAllLabel ?? strings.blocks.dataTable.selectAll}
                            />
                        </TableHead>
                    )}
                    {columns.map((column) => (
                        <TableHead key={column.id} className={cn(column.kind === "number" && CELL.number, column.align === "end" && "text-right", wrapHeaders && "whitespace-normal") || undefined}>
                            {column.hidden ? <span className="sr-only">{column.header}</span> : column.onSort ? (
                                <Button variant="ghost" size="xs" className="-ml-2" onClick={column.onSort}>
                                    {column.header}
                                    <ArrowUpDown data-icon="inline-end" />
                                </Button>
                            ) : column.header}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading && Array.from({ length: loadingRows }, (_, index) => (
                    <TableRow key={index}>
                        {selection !== undefined && <TableCell><Checkbox disabled aria-hidden tabIndex={-1} /></TableCell>}
                        {columns.map((column) => (
                            <TableCell key={column.id} className={cn(CELL[column.kind ?? "text"], column.align === "end" && "text-right", column.cellClassName) || undefined}>
                                {column.pending ?? (column.hidden ? null : <PendingText length={column.kind === "number" ? 5 : 10} />)}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
                {shown.map((row) =>
                {
                    const id = rowId(row);
                    const isSelected = selected.includes(id);

                    return (
                        <TableRow key={id} data-state={isSelected ? "selected" : undefined}>
                            {selection !== undefined && (
                                <TableCell>
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => update(checked ? [...selected, id] : selected.filter((other) => other !== id))}
                                        aria-label={selection.selectRowLabel?.(row) ?? strings.blocks.dataTable.selectRow}
                                    />
                                </TableCell>
                            )}
                            {columns.map((column) => (
                                <TableCell key={column.id} className={cn(CELL[column.kind ?? "text"], column.align === "end" && "text-right", column.cellClassName) || undefined}>{column.cell(row)}</TableCell>
                            ))}
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};
