"use client";

import { useEffect, useRef, useState } from "react";

import type { Cell } from "@tanstack/react-table";

import { Button } from "@investment/ui/components/button";
import { Checkbox } from "@investment/ui/components/checkbox";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@investment/ui/components/context-menu";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@investment/ui/components/dropdown-menu";
import { Input } from "@investment/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@investment/ui/components/native-select";
import { TableCell } from "@investment/ui/components/table";
import { Textarea } from "@investment/ui/components/textarea";
import { ChevronDown, ChevronRight, Copy, MoreHorizontal, Pencil } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { isInRange, isNavigationKey, moveCell, normalizeRange } from "./cell-range";
import { cellText, isMetaColumnId, META_COLUMN } from "./columns";
import { useDataTable, type EditingCell } from "./context";
import { editKeyIntent } from "../editing";
import { ClipboardPaste, GripVertical } from "../icons/extra";
import { isInteractiveTarget } from "../interaction";
import { StatusBadge } from "../status-badge";
import { alignClass, pinEdgeClass, pinStyle } from "./pin-style";
import type { ColumnEditing, DataRow, Tone } from "./types";

function CellEditor(
    { editing, value, onCommit, onCancel }: Readonly<{
        editing: ColumnEditing;
        value: unknown;
        onCommit: (value: unknown) => void;
        onCancel: () => void;
    }>,
)
{
    const [draft, setDraft] = useState(value === null || value === undefined ? "" : String(value));
    const committed = useRef(false);

    const commit = () =>
    {
        if (committed.current)
        {
            return;
        }

        committed.current = true;

        if (editing.input === "number")
        {
            onCommit(draft.trim() === "" ? null : Number(draft));
            return;
        }

        onCommit(draft);
    };

    const cancel = () =>
    {
        committed.current = true;
        onCancel();
    };

    const onKeyDown = (event: React.KeyboardEvent) =>
    {
        const intent = editKeyIntent(event.key, {
            multiline: editing.input === "textarea",
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
        });

        if (intent === "none")
        {
            return;
        }

        event.preventDefault();

        if (intent === "revert")
        {
            cancel();
            return;
        }

        commit();
    };

    if (editing.input === "select")
    {
        return (
            <NativeSelect
                size="sm"
                autoFocus
                value={draft}
                aria-label="값 선택"
                onChange={(event) =>
                {
                    committed.current = true;
                    onCommit(event.target.value);
                }}
                onBlur={cancel}
                onKeyDown={(event) =>
                {
                    if (event.key === "Escape")
                    {
                        cancel();
                    }
                }}
            >
                {(editing.options ?? []).map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
                ))}
            </NativeSelect>
        );
    }

    if (editing.input === "textarea")
    {
        return (
            <Textarea
                autoFocus
                value={draft}
                aria-label="값 편집"
                className="min-h-16"
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={onKeyDown}
            />
        );
    }

    return (
        <Input
            autoFocus
            type={editing.input === "number" ? "number" : "text"}
            value={draft}
            aria-label="값 편집"
            className="h-8"
            onFocus={(event) => event.target.select()}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
        />
    );
}

function RowActionsMenu({ row }: Readonly<{ row: DataRow }>)
{
    const { meta } = useDataTable();
    const actions = meta.rowActions?.(row) ?? [];

    if (actions.length === 0)
    {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={(
                    <Button variant="ghost" size="icon-xs" aria-label={meta.labels.actions}>
                        <MoreHorizontal />
                    </Button>
                )}
            />
            <DropdownMenuContent align="end" className="w-auto min-w-36">
                {actions.map((action) => (
                    <DropdownMenuItem
                        key={action.key}
                        variant={action.tone === "danger" ? "destructive" : "default"}
                        onClick={() => action.onSelect(row)}
                    >
                        {action.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export interface BodyCellProps
{
    readonly cell: Cell<DataRow, unknown>;
    /** 화면 순서의 행 인덱스(범위 선택 좌표) */
    readonly rowIndex: number;
    /** 데이터 열 중 몇 번째인지(범위 선택 좌표). 메타 열은 -1 */
    readonly colIndex: number;
    /** 행 드래그 손잡이의 속성. 드래그가 켜진 표에서 BodyRow 가 넘긴다 */
    readonly dragHandle?: React.ButtonHTMLAttributes<HTMLButtonElement> & { readonly ref?: (element: HTMLButtonElement | null) => void };
}

/** 몸통 셀 하나. 메타 열은 컨트롤을, 데이터 열은 종류별 형식을 그린다. 편집·범위 선택은 셀 축의 값에 따라 붙는다 */
export function BodyCell({ cell, rowIndex, colIndex, dragHandle }: BodyCellProps)
{
    const { state, actions, meta } = useDataTable();
    const { features, editing, range, specByKey, table } = state;
    const { labels } = meta;
    const column = cell.column;
    const row = cell.row;
    const id = column.id;
    const sized = features.columns.resizing || features.columns.pinning || features.overflow === "horizontal" || features.viewport.mode === "virtual";
    const style: React.CSSProperties = { ...(sized ? { width: column.getSize() } : {}), ...pinStyle(column) };
    const pinnedClass = column.getIsPinned() ? cn("bg-background group-data-[state=selected]/row:bg-muted", pinEdgeClass(column)) : undefined;
    const cellRef = useRef<HTMLTableCellElement>(null);

    const address = { row: rowIndex, col: colIndex };
    const rangeMode = features.cells === "range" && !isMetaColumnId(id);
    const isFocus = rangeMode && range !== null && range.focus.row === address.row && range.focus.col === address.col;
    const inRange = rangeMode && range !== null && isInRange(normalizeRange(range.anchor, range.focus), address);

    useEffect(() =>
    {
        if (isFocus && cellRef.current !== null && document.activeElement !== cellRef.current)
        {
            cellRef.current.focus({ preventScroll: false });
        }
    }, [isFocus]);

    if (id === META_COLUMN.select)
    {
        return (
            <TableCell style={{ ...style, width: "var(--table-meta-column-width)" }} className={pinnedClass}>
                <Checkbox
                    aria-label={labels.selectRow}
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    onCheckedChange={(checked) => row.toggleSelected(checked)}
                />
            </TableCell>
        );
    }

    if (id === META_COLUMN.expand)
    {
        const expanded = row.getIsExpanded();

        return (
            <TableCell style={{ ...style, width: "var(--table-meta-column-width)" }} className={pinnedClass}>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={expanded ? labels.collapseRow : labels.expandRow}
                    aria-expanded={expanded}
                    onClick={() => row.toggleExpanded()}
                >
                    {expanded ? <ChevronDown /> : <ChevronRight />}
                </Button>
            </TableCell>
        );
    }

    if (id === META_COLUMN.drag)
    {
        return (
            <TableCell style={{ ...style, width: "var(--table-meta-column-width)" }} className={pinnedClass}>
                <button
                    type="button"
                    aria-label={labels.dragRow}
                    className="inline-flex size-6 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                    {...dragHandle}
                >
                    <GripVertical className="size-4" />
                </button>
            </TableCell>
        );
    }

    if (id === META_COLUMN.actions)
    {
        return (
            <TableCell style={{ ...style, width: "var(--table-actions-column-width)" }} className={cn("text-right", pinnedClass)}>
                <RowActionsMenu row={row.original} />
            </TableCell>
        );
    }

    const spec = specByKey.get(id);
    const value = cell.getValue();
    const text = spec === undefined ? String(value ?? "") : cellText(spec, row.original);
    const columnMeta = column.columnDef.meta;
    const editable = features.cells === "edit" ? columnMeta?.editable : undefined;
    const isEditing = editing !== null && editing.rowId === row.id && editing.columnId === id;
    const editingCell: EditingCell = { rowId: row.id, columnId: id };

    const tone: Tone = spec?.tone?.(value, row.original)
        ?? columnMeta?.facetOptions?.find((option) => option.value === String(value))?.tone
        ?? "neutral";

    const content = isEditing && editable !== undefined
        ? (
            <CellEditor
                editing={editable}
                value={value}
                onCommit={actions.commitEdit}
                onCancel={actions.cancelEdit}
            />
        )
        : columnMeta?.kind === "badge" && text !== ""
            ? <StatusBadge tone={tone} label={text} />
            : text;

    const onKeyDown = (event: React.KeyboardEvent<HTMLTableCellElement>) =>
    {
        if (isEditing || isInteractiveTarget(event.target))
        {
            return;
        }

        if (rangeMode && isNavigationKey(event.key))
        {
            event.preventDefault();

            const bounds = {
                rows: table.getRowModel().rows.length,
                cols: table.getVisibleLeafColumns().filter((candidate) => !isMetaColumnId(candidate.id)).length,
            };
            const next = moveCell(range?.focus ?? address, event.key, bounds);

            actions.setRange({ anchor: event.shiftKey && range !== null ? range.anchor : next, focus: next });
            return;
        }

        if (rangeMode && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c")
        {
            event.preventDefault();
            void actions.copyRange();
            return;
        }

        if (rangeMode && event.key === "Escape")
        {
            actions.setRange(null);
            return;
        }

        if (editable !== undefined && (event.key === "Enter" || event.key === "F2"))
        {
            event.preventDefault();
            actions.startEdit(editingCell);
        }
    };

    const rangeHandlers = rangeMode
        ? {
            onMouseDown: (event: React.MouseEvent) =>
            {
                if (event.button !== 0)
                {
                    return;
                }

                actions.setRange({ anchor: event.shiftKey && range !== null ? range.anchor : address, focus: address });
            },
            onMouseEnter: (event: React.MouseEvent) =>
            {
                if (event.buttons === 1 && range !== null)
                {
                    actions.setRange({ anchor: range.anchor, focus: address });
                }
            },
        }
        : {};

    const tableCell = (
        <TableCell
            ref={cellRef}
            style={style}
            data-column-id={id}
            data-cell-address={rangeMode ? `${address.row}:${address.col}` : undefined}
            data-selected={inRange || undefined}
            data-editing={isEditing || undefined}
            tabIndex={rangeMode || editable !== undefined ? (isFocus || (!rangeMode && editable !== undefined) ? 0 : -1) : undefined}
            className={cn(
                alignClass(columnMeta?.align),
                pinnedClass,
                rangeMode && "cursor-cell select-none outline-none",
                inRange && "bg-accent",
                isFocus && "ring-2 ring-inset ring-ring",
                editable !== undefined && "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                isEditing && "p-1",
            )}
            onDoubleClick={editable !== undefined && !isEditing ? () => actions.startEdit(editingCell) : undefined}
            onKeyDown={onKeyDown}
            {...rangeHandlers}
        >
            {content}
        </TableCell>
    );

    if (editable === undefined || isEditing)
    {
        return tableCell;
    }

    // 편집 가능한 셀의 우클릭 메뉴 — 복사 · 붙여넣기 · 편집. 트리거는 셀 전체다.
    return (
        <ContextMenu>
            <ContextMenuTrigger render={tableCell} />
            <ContextMenuContent className="w-auto min-w-36">
                <ContextMenuItem onClick={() => void navigator.clipboard.writeText(text)}>
                    <Copy />
                    {labels.copy}
                </ContextMenuItem>
                <ContextMenuItem
                    onClick={() =>
                    {
                        void navigator.clipboard.readText().then((pasted) =>
                        {
                            actions.applyEdit(editingCell, editable.input === "number" ? (pasted.trim() === "" ? null : Number(pasted)) : pasted);
                        });
                    }}
                >
                    <ClipboardPaste />
                    {labels.paste}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => actions.startEdit(editingCell)}>
                    <Pencil />
                    {labels.edit}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

export { isInteractiveTarget };
