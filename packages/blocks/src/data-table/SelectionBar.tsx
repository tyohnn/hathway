"use client";

import { ActionBar } from "../action-bar";
import { useDataTable } from "./context";

export interface SelectionBarProps
{
    readonly className?: string;
}

/**
 * 선택된 행이 있을 때 뜨는 액션 바(11).
 *
 * 모양은 `ActionBar` 블록이 갖고 이 파일은 어댑터다(2026-09-06). 종전에는 같은 띠를 두 곳에서
 * 각자 그렸다. 표의 `BulkAction`(행 배열을 받는다)을 `ActionBar` 의 `BarAction`(인자가 없다)으로
 * 옮기는 자리가 여기이고, 선택이 0 이면 `ActionBar` 가 스스로 아무것도 그리지 않는다.
 */
export function SelectionBar({ className }: SelectionBarProps)
{
    const { state, meta } = useDataTable();
    const { table, features } = state;
    const { labels, bulkActions } = meta;

    if (!features.rows.selection)
    {
        return null;
    }

    const selected = table.getFilteredSelectedRowModel().rows;
    const rows = selected.map((row) => row.original);

    return (
        <ActionBar
            className={className}
            count={selected.length}
            placement="floating"
            labels={{ selected: labels.selected, clear: labels.clearSelection }}
            onClear={() => table.resetRowSelection()}
            actions={bulkActions.map((action) => ({
                id: action.key,
                label: action.label,
                tone: action.tone,
                onPress: () => action.onSelect(rows),
            }))}
        />
    );
}
