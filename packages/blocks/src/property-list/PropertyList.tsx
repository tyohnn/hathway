"use client";

import { Table, TableBody, TableCell, TableRow } from "@investment/ui/components/table";
import { cn } from "@investment/ui/lib/utils";

import { formatCellValue } from "../data-table/columns";
import { DateCell, DerivedCell, LockedCell, MultiCell, SelectCell, TextCell, TransitionCell } from "./EditCell";
import { isEditable, resolveEditKind } from "./edit";
import { PROPERTY_LIST_LABELS } from "./labels";
import type { Property, PropertyListLabels, PropertyListProps } from "./types";

const DEFAULT_LABEL_WIDTH = 160;
const DEFAULT_EMPTY_VALUE = "—";

/** 값이 문자열·숫자면 종류가 형식을 정한다. 노드는 그대로 둔다 */
function renderValue(item: Property, emptyValue: string)
{
    if (item.value === null || item.value === undefined || item.value === "")
    {
        return <span className="text-muted-foreground">{emptyValue}</span>;
    }

    const formatted = typeof item.value === "string" || typeof item.value === "number"
        ? formatCellValue(item.kind, item.value)
        : null;

    const content = formatted === null ? item.value : (formatted === "" ? emptyValue : formatted);

    return item.href === undefined
        ? content
        : <a href={item.href} className="text-link underline-offset-4 hover:underline">{content}</a>;
}

/**
 * 값을 그리는 자리.
 *
 * ⚠ **그려지는 값은 갈래와 무관하게 `Property.value` 하나다.** 고치는 칸도 읽을 때는 그것을
 * 그대로 들고 선다 - 형식(금액·시간·날짜)이 표와 상세에서 갈리지 않게 하는 `formatCellValue` 가
 * 거기 걸려 있기 때문이다. 여럿 고르기만 예외이고 까닭은 그 칸에 적혀 있다.
 */
function PropertyValue(
    { item, emptyValue, readOnly, text }: Readonly<{
        item: Property;
        emptyValue: string;
        readOnly: boolean;
        text: PropertyListLabels;
    }>,
)
{
    const kind = resolveEditKind(item.edit, readOnly);
    const value = renderValue(item, emptyValue);

    if (item.edit === undefined || kind === "none")
    {
        return value;
    }

    /* 열람권이 없어 읽는 모양으로 내려온 칸. 셈한 값이 아니므로 출처를 달지 않는다 */
    if (kind === "derived" && item.edit.kind !== "derived")
    {
        return <DerivedCell>{value}</DerivedCell>;
    }

    switch (item.edit.kind)
    {
        case "text":
            return <TextCell edit={item.edit} label={item.label} text={text}>{value}</TextCell>;
        case "date":
            return <DateCell edit={item.edit} label={item.label} text={text}>{value}</DateCell>;
        case "select":
            return <SelectCell edit={item.edit} label={item.label} text={text}>{value}</SelectCell>;
        case "multi":
            return <MultiCell edit={item.edit} label={item.label} text={text} />;
        case "transition":
            return <TransitionCell edit={item.edit} label={item.label} text={text}>{value}</TransitionCell>;
        case "locked":
            return <LockedCell reason={item.edit.reason}>{value}</LockedCell>;
        case "derived":
            return <DerivedCell from={item.edit.from}>{value}</DerivedCell>;
    }
}

/** 여러 열로 나눌 때 순서를 세로로 유지한다 — 왼쪽 열을 먼저 채운다 */
function splitColumns(items: ReadonlyArray<Property>, columns: 1 | 2): ReadonlyArray<ReadonlyArray<Property>>
{
    if (columns === 1)
    {
        return [items];
    }

    const half = Math.ceil(items.length / 2);

    return [items.slice(0, half), items.slice(half)];
}

/**
 * 라벨과 값이 짝을 이루는 상세 속성 목록.
 *
 * 헤더 없는 2열 표를 얇게 감싼 블록이다. 조각은 Table / Row · Cell 그대로이고,
 * 블록이 더하는 것은 라벨 폭 하나 · 값 형식(DataTable 과 같은 formatCellValue) ·
 * 빈 값 「—」 규칙 · 열 배치뿐이다.
 *
 * 항목에 `edit` 를 주면 그 자리에서 고친다. 갈래는 일곱이고 판정은 `edit.ts` 가 갖는다.
 */
export function PropertyList({
    items,
    orientation = "horizontal",
    columns = 1,
    labelWidth = DEFAULT_LABEL_WIDTH,
    divider = "line",
    emptyValue = DEFAULT_EMPTY_VALUE,
    readOnly = false,
    labels,
    className,
}: PropertyListProps)
{
    const groups = splitColumns(items, columns);
    const rowBorder = divider === "none" ? "[&_tr]:border-0" : "";
    const text = { ...PROPERTY_LIST_LABELS, ...labels };

    if (orientation === "vertical")
    {
        return (
            <div
                data-slot="property-list"
                data-orientation="vertical"
                className={cn(
                    "grid grid-cols-1 gap-x-[var(--surface-gap-lg)]",
                    columns === 2 ? "sm:grid-cols-2" : "",
                    className,
                )}
            >
                {items.map((item, index) => (
                    <div
                        key={`${index}-${item.label}`}
                        className={cn(
                            "flex flex-col gap-[var(--surface-gap)] py-[var(--menu-item-padding-x)]",
                            divider === "none" ? "" : "border-b border-border",
                        )}
                    >
                        <span className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                            {item.label}
                        </span>
                        <span className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground">
                            <PropertyValue item={item} emptyValue={emptyValue} readOnly={readOnly} text={text} />
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div
            data-slot="property-list"
            data-orientation="horizontal"
            className={cn(
                "grid grid-cols-1 gap-x-[var(--surface-gap-lg)]",
                columns === 2 ? "sm:grid-cols-2" : "",
                className,
            )}
        >
            {groups.map((group, groupIndex) => (
                <Table key={groupIndex} className={rowBorder}>
                    <TableBody>
                        {group.map((item, index) =>
                        {
                            /* ⚠ 고치는 칸이 있는 줄은 가운데로 맞춘다. 칸의 높이가 글자보다 커서,
                               위로 맞추면 라벨이 값보다 몇 픽셀 올라가 줄마다 어긋나 보인다 */
                            const align = isEditable(resolveEditKind(item.edit, readOnly)) ? "align-middle" : "align-top";

                            return (
                                <TableRow key={`${index}-${item.label}`} className="hover:bg-transparent">
                                    <TableCell
                                        style={{ width: `${labelWidth}px` }}
                                        className={cn(align, "text-muted-foreground")}
                                    >
                                        {item.label}
                                    </TableCell>
                                    <TableCell className={cn(align, "text-foreground")}>
                                        <PropertyValue item={item} emptyValue={emptyValue} readOnly={readOnly} text={text} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            ))}
        </div>
    );
}
