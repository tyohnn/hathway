"use client";

import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column } from "@tanstack/react-table";

import { Badge } from "@investment/ui/components/badge";
import { Button } from "@investment/ui/components/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@investment/ui/components/command";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@investment/ui/components/dropdown-menu";
import { Input } from "@investment/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@investment/ui/components/input-group";
import { NativeSelect, NativeSelectOption } from "@investment/ui/components/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@investment/ui/components/popover";
import { Separator } from "@investment/ui/components/separator";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Search, SettingsAdvanced, X } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { isMetaColumnId, toFilterValue } from "./columns";
import { FilterTrigger, facetSummary } from "../filter-trigger";
import { useDataTable } from "./context";
import { GripVertical } from "../icons/extra";
import type { DataRow, FacetOption, SortRule } from "./types";

type DataColumn = Column<DataRow, unknown>;

const columnLabel = (column: DataColumn): string =>
{
    const header = column.columnDef.header;

    return typeof header === "string" ? header : column.id;
};

/** 전역 검색(9). 값은 view.globalFilter 이고 지우기 버튼은 값이 있을 때만 붙는다 */
function GlobalSearch()
{
    const { state, meta } = useDataTable();
    const { table, view } = state;
    const { labels } = meta;

    return (
        <InputGroup className="w-56" data-slot="data-table-search">
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupInput
                type="text"
                placeholder={labels.search}
                aria-label={labels.search}
                value={view.globalFilter}
                onChange={(event) => table.setGlobalFilter(event.target.value)}
            />
            {view.globalFilter !== "" && (
                <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-xs" aria-label={labels.clearSearch} onClick={() => table.setGlobalFilter("")}>
                        <X />
                    </InputGroupButton>
                </InputGroupAddon>
            )}
        </InputGroup>
    );
}

/** 텍스트 열 필터(9). 값은 한 칸짜리 배열이다 */
function TextFilter({ column }: Readonly<{ column: DataColumn }>)
{
    const { meta } = useDataTable();
    const { labels } = meta;
    const label = columnLabel(column);
    const value = toFilterValue(column.getFilterValue())[0] ?? "";

    return (
        <Popover>
            <PopoverTrigger
                render={<FilterTrigger label={label} summary={value !== "" ? <span className="max-w-24 truncate font-normal">{value}</span> : undefined} />}
            />
            <PopoverContent align="start" className="w-56 p-2" data-slot="data-table-text-filter" data-column-id={column.id}>
                <div className="flex items-center gap-1">
                    <Input
                        autoFocus
                        aria-label={`${label} ${labels.filterSearch}`}
                        placeholder={labels.filterSearch}
                        value={value}
                        onChange={(event) => column.setFilterValue(event.target.value === "" ? undefined : [event.target.value])}
                    />
                    {value !== "" && (
                        <Button variant="ghost" size="icon-sm" aria-label={labels.clearFilter} onClick={() => column.setFilterValue(undefined)}>
                            <X />
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * 패싯 열 필터(12). 선택지는 spec 의 facetOptions 가 우선이고, 없으면 데이터의 고유값에서 만든다.
 *
 * ⚠ **고유값은 거르기 전의 행에서 뽑는다.** `getFacetedUniqueValues()` 는 다른 열의 조건을 반영하므로,
 *    제목 검색이 한 줄도 남기지 않으면 회사와 담당의 선택지가 통째로 비어 고를 것도 되돌릴 것도
 *    없는 막다른 골목이 된다(2026-09-21 실측). 선택지는 조건과 무관하게 같은 자리에 있어야 한다.
 */
function FacetFilter({ column }: Readonly<{ column: DataColumn }>)
{
    const { state, meta } = useDataTable();
    const { table } = state;
    const { labels } = meta;
    const label = columnLabel(column);
    const selected = toFilterValue(column.getFilterValue());
    const selectedSet = new Set(selected);
    const values = new Set<string>();

    for (const row of table.getPreFilteredRowModel().flatRows)
    {
        const raw = row.getValue(column.id);

        if (raw !== null && raw !== undefined && raw !== "")
        {
            values.add(String(raw));
        }
    }

    const options: ReadonlyArray<FacetOption> = column.columnDef.meta?.facetOptions
        ?? [...values].sort((a, b) => a.localeCompare(b, "ko")).map((value) => ({ value, label: value }));

    /* 선택지 옆의 수는 반대로 **지금 걸린 조건 아래의** 수다. 몇 줄이 남는지를 미리 보여 주는
       값이라 다른 열의 조건을 반영해야 한다. 0이 되는 선택지는 수를 적지 않는다. */
    const counts = new Map<string, number>();

    column.getFacetedUniqueValues().forEach((count, key) =>
    {
        if (key !== null && key !== undefined && key !== "")
        {
            counts.set(String(key), (counts.get(String(key)) ?? 0) + count);
        }
    });

    const toggle = (value: string) =>
    {
        const next = selectedSet.has(value) ? selected.filter((item) => item !== value) : [...selected, value];

        column.setFilterValue(next.length > 0 ? next : undefined);
    };

    /* ⚠ 고른 값을 `options` 에서 찾아 그리지 않는다. 선택지가 비면 걸린 조건까지 칩에서 사라져,
       무엇이 걸려 있는지 모른 채 화면만 비는 일이 생긴다. 이름을 못 찾으면 값을 그대로 적는다. */
    const labelOf = new Map(options.map((option) => [option.value, option.label]));
    const summary = facetSummary(selected.map((value) => labelOf.get(value) ?? value), labels.selected);

    return (
        <Popover>
            <PopoverTrigger render={<FilterTrigger label={label} summary={summary} />} />
            <PopoverContent align="start" className="w-52 p-0" data-slot="data-table-facet-filter" data-column-id={column.id}>
                <Command>
                    <CommandInput placeholder={`${label} ${labels.filterSearch}`} />
                    <CommandList>
                        <CommandEmpty>{labels.noResults}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) =>
                            {
                                const checked = selectedSet.has(option.value);

                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        data-checked={checked}
                                        onSelect={() => toggle(option.value)}
                                    >
                                        <span
                                            aria-hidden
                                            className={cn(
                                                "flex size-4 items-center justify-center rounded-sm border border-primary [&_svg]:size-3",
                                                checked ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                                            )}
                                        >
                                            <Check />
                                        </span>
                                        <span className="truncate">{option.label}</span>
                                        {counts.has(option.value) && (
                                            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{counts.get(option.value)}</span>
                                        )}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {selected.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem className="justify-center" onSelect={() => column.setFilterValue(undefined)}>
                                        {labels.clearFilter}
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

/** 정렬 규칙 한 줄(32). 손잡이로 순서를 바꾸고, 방향 버튼과 제거 버튼이 붙는다 */
function SortRuleRow(
    { rule, label, onToggle, onRemove }: Readonly<{ rule: SortRule; label: string; onToggle: () => void; onRemove: () => void }>,
)
{
    const { meta } = useDataTable();
    const { labels } = meta;
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            data-sort-id={rule.id}
            className={cn("flex items-center gap-1 rounded-md bg-background", isDragging && "relative z-10 shadow-md")}
        >
            <button
                ref={setActivatorNodeRef}
                type="button"
                aria-label={`${label} ${labels.dragColumn}`}
                className="inline-flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="size-4" />
            </button>
            <span className="flex-1 truncate text-sm">{label}</span>
            <Button variant="outline" size="xs" onClick={onToggle} aria-label={`${label} ${rule.desc ? labels.descending : labels.ascending}`}>
                {rule.desc ? <ArrowDown data-icon="inline-start" /> : <ArrowUp data-icon="inline-start" />}
                {rule.desc ? labels.descending : labels.ascending}
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label={`${label} ${labels.clearSort}`} onClick={onRemove}>
                <X />
            </Button>
        </li>
    );
}

/** 다중 정렬 편집기(32). 규칙 목록 · 방향 · 순서 · 추가 · 지우기 */
function SortMenu()
{
    const { state, actions, meta } = useDataTable();
    const { table, view } = state;
    const { labels } = meta;
    const sorting = view.sorting;
    const sortable = table.getAllLeafColumns().filter((column) => !isMetaColumnId(column.id) && column.getCanSort());
    const remaining = sortable.filter((column) => !sorting.some((rule) => rule.id === column.id));
    const labelOf = (id: string) =>
    {
        const column = sortable.find((candidate) => candidate.id === id);

        return column === undefined ? id : columnLabel(column);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const onDragEnd = ({ active, over }: DragEndEvent) =>
    {
        if (over === null || active.id === over.id)
        {
            return;
        }

        const from = sorting.findIndex((rule) => rule.id === active.id);
        const to = sorting.findIndex((rule) => rule.id === over.id);

        if (from >= 0 && to >= 0)
        {
            actions.setView({ sorting: arrayMove([...sorting], from, to) });
        }
    };

    return (
        <Popover>
            <PopoverTrigger
                render={(
                    <Button variant="outline" size="sm" data-slot="data-table-sort-trigger">
                        <ArrowUpDown data-icon="inline-start" />
                        {labels.sort}
                        {sorting.length > 0 && <Badge variant="secondary" className="px-1.5 tabular-nums">{sorting.length}</Badge>}
                    </Button>
                )}
            />
            <PopoverContent align="end" className="w-80 p-3" data-slot="data-table-sort-menu">
                <div className="flex flex-col gap-3">
                    {sorting.length === 0
                        ? <p className="text-sm text-muted-foreground">{labels.addSort}</p>
                        : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                                <SortableContext items={sorting.map((rule) => rule.id)} strategy={verticalListSortingStrategy}>
                                    <ol className="flex flex-col gap-1" aria-label={labels.sort}>
                                        {sorting.map((rule) => (
                                            <SortRuleRow
                                                key={rule.id}
                                                rule={rule}
                                                label={labelOf(rule.id)}
                                                onToggle={() => actions.setView({
                                                    sorting: sorting.map((candidate) => (candidate.id === rule.id ? { ...candidate, desc: !candidate.desc } : candidate)),
                                                })}
                                                onRemove={() => actions.setView({ sorting: sorting.filter((candidate) => candidate.id !== rule.id) })}
                                            />
                                        ))}
                                    </ol>
                                </SortableContext>
                            </DndContext>
                        )}
                    <div className="flex items-center justify-between gap-2">
                        <NativeSelect
                            size="sm"
                            aria-label={labels.addSort}
                            value=""
                            disabled={remaining.length === 0}
                            onChange={(event) =>
                            {
                                if (event.target.value !== "")
                                {
                                    actions.setView({ sorting: [...sorting, { id: event.target.value, desc: false }] });
                                }
                            }}
                        >
                            <NativeSelectOption value="">{labels.addSort}</NativeSelectOption>
                            {remaining.map((column) => (
                                <NativeSelectOption key={column.id} value={column.id}>{columnLabel(column)}</NativeSelectOption>
                            ))}
                        </NativeSelect>
                        {sorting.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => actions.setView({ sorting: [] })}>
                                {labels.clearSort}
                            </Button>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

/** 열 메뉴(12·15) — 보이기·숨기기 체크와 밀도 선택. 체크 항목은 눌러도 메뉴가 닫히지 않는다 */
function ColumnsMenu()
{
    const { state, actions, meta } = useDataTable();
    const { table, features, view } = state;
    const { labels } = meta;
    const hideable = table.getAllLeafColumns().filter((column) => !isMetaColumnId(column.id) && column.getCanHide());

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={(
                    <Button variant="outline" size="sm" data-slot="data-table-columns-trigger">
                        <SettingsAdvanced data-icon="inline-start" />
                        {labels.columns}
                    </Button>
                )}
            />
            <DropdownMenuContent align="end" className="w-auto min-w-44">
                {/* ⚠ Label(Menu.GroupLabel)은 Group 안에서만 선다. 밖에 두면 Base UI error #31 로 화면 전체가 죽는다 */}
                {features.columns.visibility && hideable.length > 0 && (
                    <>
                        <DropdownMenuGroup>
                            <DropdownMenuLabel>{labels.columns}</DropdownMenuLabel>
                            {hideable.map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    checked={column.getIsVisible()}
                                    closeOnClick={false}
                                    onCheckedChange={(checked) => column.toggleVisibility(checked)}
                                >
                                    {columnLabel(column)}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                    </>
                )}
                <DropdownMenuGroup>
                    <DropdownMenuLabel>{labels.density}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={view.density}
                        onValueChange={(value) => actions.setDensity(value === "compact" ? "compact" : "default")}
                    >
                        <DropdownMenuRadioItem value="default" closeOnClick={false}>{labels.comfortable}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="compact" closeOnClick={false}>{labels.compact}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export interface ToolbarProps
{
    readonly className?: string;
    /** 필터 옆 자리. 호출부가 자기 컨트롤(내보내기 버튼 등)을 끼운다 */
    readonly children?: React.ReactNode;
}

/**
 * 툴바. 필터 축(전역 검색 · 열 필터 · 초기화)이 왼쪽, 정렬·열 메뉴가 오른쪽이다.
 * 켜진 것이 하나도 없으면 그리지 않는다.
 */
export function Toolbar({ className, children }: ToolbarProps)
{
    const { state, meta } = useDataTable();
    const { table, features, view } = state;
    const { labels } = meta;
    const showSearch = features.filter === "global" || features.filter === "both";
    const columnFilters = features.filter === "facet" || features.filter === "both"
        ? table.getAllLeafColumns().filter((column) => !isMetaColumnId(column.id) && column.getCanFilter() && column.columnDef.meta?.filter !== undefined)
        : [];
    const filtered = view.globalFilter !== "" || view.columnFilters.length > 0;
    const showSort = features.sorting === "multi";
    const showColumns = features.columns.visibility;

    if (!showSearch && columnFilters.length === 0 && !showSort && !showColumns && children === undefined)
    {
        return null;
    }

    return (
        <div data-slot="data-table-toolbar" className={cn("flex flex-wrap items-center gap-2", className)}>
            {showSearch && <GlobalSearch />}
            {columnFilters.map((column) =>
                column.columnDef.meta?.filter === "facet"
                    ? <FacetFilter key={column.id} column={column} />
                    : <TextFilter key={column.id} column={column} />)}
            {filtered && (
                <Button
                    variant="ghost"
                    size="default"
                    data-slot="data-table-reset-filters"
                    onClick={() =>
                    {
                        table.resetColumnFilters();
                        table.setGlobalFilter("");
                    }}
                >
                    {labels.resetFilters}
                    <X data-icon="inline-end" />
                </Button>
            )}
            {children}
            {(showSort || showColumns) && (
                <div className="ml-auto flex items-center gap-2">
                    {showSort && <SortMenu />}
                    {showColumns && <ColumnsMenu />}
                </div>
            )}
        </div>
    );
}
