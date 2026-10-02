"use client";

import { useId } from "react";

import { Badge } from "@investment/ui/components/badge";
import { Button } from "@investment/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@investment/ui/components/input-group";
import { Label } from "@investment/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@investment/ui/components/native-select";
import { ChevronDown, Search, X } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { FilterTrigger, facetSummary } from "../filter-trigger";
import { FacetFilter } from "./FacetFilter";
import { FacetPills } from "./FacetPills";
import { clearConditions, hasCondition, resolvePillValues, toggleFacetValue } from "./filter-state";
import { FILTER_BAR_LABELS } from "./labels";
import type { FacetSpec, FilterBarLabels, FilterBarProps, SortChoice } from "./types";

/** 격자 배치의 트리거에 적는 말. 이름은 위의 라벨이 맡으므로 고른 것만 적는다 */
function summaryText(facet: FacetSpec, selected: ReadonlyArray<string>, text: FilterBarLabels): string
{
    if (selected.length === 0)
    {
        return facet.placeholder ?? text.all;
    }

    if (selected.length === 1)
    {
        return facet.options.find((option) => option.value === selected[0])?.label ?? selected[0];
    }

    return text.selected(selected.length);
}

/**
 * 목록 위의 조건 띠.
 *
 * 트리거는 DataTable 의 열 필터와 같은 조각(FilterTrigger)을 쓴다. 표가 아닌 목록도
 * 같은 조건 띠를 쓰라는 뜻이다. 값은 갖지 않고 onChange 로 올린다 — 정본은 URL 이다.
 *
 * 배치는 둘이다. `bar` 는 검색·패싯·정렬이 한 줄에 서는 지금까지의 모양이고, `grid` 는
 * 패싯이 라벨을 위에 붙인 격자로 서고 검색이 한 줄을 통째로 쓰는 모양이다. 조건이 대여섯
 * 개가 되면 띠 한 줄이 넘쳐 이름과 값이 어디까지가 한 짝인지 읽히지 않기 때문이다.
 * ⚠ 기본은 `bar` 다 — 축을 늘렸다는 이유로 기존 화면의 모양이 바뀌면 안 된다.
 *
 * 패싯 하나하나는 `display` 로 늘 보이게(`pills`) 둘 수 있다. 그 줄은 배치와 무관하게
 * 자기 줄을 통째로 쓴다 — 격자 칸에 넣으면 항목 여섯이 11rem 안에서 세로로 접힌다.
 */
export function FilterBar({
    value,
    onChange,
    searchable = true,
    facets,
    sortOptions,
    layout = "bar",
    disabled = false,
    labels,
    className,
}: FilterBarProps)
{
    const text = { ...FILTER_BAR_LABELS, ...labels };
    const facetValues = value.facets ?? {};
    const baseId = useId();

    const allFacets = facets ?? [];
    const pillFacets = allFacets.filter((facet) => facet.display === "pills");
    const pickerFacets = allFacets.filter((facet) => facet.display !== "pills");

    const toggleFacet = (key: string, option: string) => onChange(toggleFacetValue(value, key, option));

    const renderBarFacet = (facet: FacetSpec) =>
    {
        const selected = facetValues[facet.key] ?? [];
        const selectedSet = new Set(selected);

        /* 접는 규칙은 표의 패싯과 한 곳(`facetSummary`)에서 온다. 같은 칩이 화면에 나란히 서므로
           한쪽만 고치면 두 규칙이 한눈에 보인다. */
        const labelOf = new Map(facet.options.map((option) => [option.value, option.label]));
        const summary = facetSummary(selected.map((value) => labelOf.get(value) ?? value), text.selected);

        return (
            <FacetFilter
                key={facet.key}
                facet={facet}
                selected={selected}
                text={text}
                onToggle={(option) => toggleFacet(facet.key, option)}
                trigger={<FilterTrigger label={facet.label} summary={summary} disabled={disabled} />}
            />
        );
    };

    /**
     * 격자 칸 하나 — 라벨이 위에 서고 트리거는 고른 값만 적는다.
     *
     * ⚠ 이름을 `aria-labelledby` 로 라벨과 트리거 내용에서 함께 짓는다. `<label for>` 만으로는
     *    버튼의 접근 이름을 브라우저마다 다르게 계산해 「회사」 와 「전체」 중 무엇이 읽힐지 갈린다.
     */
    const renderGridFacet = (facet: FacetSpec) =>
    {
        const selected = facetValues[facet.key] ?? [];
        const labelId = `${baseId}-${facet.key}-label`;
        const triggerId = `${baseId}-${facet.key}`;

        return (
            <div key={facet.key} className="flex flex-col gap-[var(--control-gap-md)]">
                <Label id={labelId} htmlFor={triggerId}>{facet.label}</Label>
                <FacetFilter
                    facet={facet}
                    selected={selected}
                    text={text}
                    onToggle={(option) => toggleFacet(facet.key, option)}
                    trigger={(
                        <Button
                            id={triggerId}
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            aria-labelledby={`${labelId} ${triggerId}`}
                            className="w-full justify-between"
                        >
                            <span className="truncate">{summaryText(facet, selected, text)}</span>
                            <ChevronDown data-icon="inline-end" className="opacity-50" />
                        </Button>
                    )}
                />
            </div>
        );
    };

    const renderSort = (options: ReadonlyArray<SortChoice>, gridId?: string) => (
        <NativeSelect
            id={gridId}
            size="sm"
            aria-label={gridId === undefined ? options[0].label : undefined}
            className={gridId === undefined ? undefined : "w-full"}
            value={value.sort ?? options[0].value}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, sort: event.target.value })}
        >
            {options.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
            ))}
        </NativeSelect>
    );

    const renderSearch = (full: boolean) => (
        <InputGroup className={full ? undefined : "w-56"}>
            <InputGroupAddon align="inline-start">
                <Search />
            </InputGroupAddon>
            <InputGroupInput
                placeholder={text.search}
                aria-label={text.search}
                value={value.search ?? ""}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, search: event.target.value })}
            />
            {value.search === undefined || value.search === ""
                ? null
                : (
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            size="icon-xs"
                            aria-label={text.clearSearch}
                            disabled={disabled}
                            onClick={() => onChange({ ...value, search: "" })}
                        >
                            <X />
                        </InputGroupButton>
                    </InputGroupAddon>
                )}
        </InputGroup>
    );

    const renderPills = () => pillFacets.map((facet) => (
        <FacetPills
            key={facet.key}
            facet={facet}
            selected={facetValues[facet.key] ?? []}
            disabled={disabled}
            text={text}
            onValueChange={(next) => onChange(resolvePillValues(value, facet.key, next))}
        />
    ));

    const renderReset = () => hasCondition(value)
        ? (
            <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                disabled={disabled}
                onClick={() => onChange(clearConditions(value))}
            >
                {text.reset}
                <X />
            </Button>
        )
        : null;

    if (layout === "grid")
    {
        const hasCells = pickerFacets.length > 0 || (sortOptions ?? []).length > 0;
        const hasFooter = pillFacets.length > 0 || hasCondition(value);

        return (
            <div
                data-slot="filter-bar"
                data-layout="grid"
                className={cn("flex flex-col gap-[var(--surface-gap-lg)]", className)}
            >
                {/* 칸 수를 클래스로 적지 않는다 — 패싯 개수는 호출부가 정하고 Tailwind 는 만들어 낸
                    클래스 이름을 스캔하지 못한다. auto-fit 이 폭에 맞춰 열 수를 정한다 */}
                {hasCells
                    ? (
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-[var(--surface-gap-lg)]">
                            {pickerFacets.map(renderGridFacet)}
                            {sortOptions === undefined || sortOptions.length === 0
                                ? null
                                : (
                                    <div className="flex flex-col gap-[var(--control-gap-md)]">
                                        <Label htmlFor={`${baseId}-sort`}>{text.sort}</Label>
                                        {renderSort(sortOptions, `${baseId}-sort`)}
                                    </div>
                                )}
                        </div>
                    )
                    : null}

                {searchable ? renderSearch(true) : null}

                {hasFooter
                    ? (
                        <div className="flex flex-wrap items-center gap-[var(--control-gap-sm)]">
                            {renderPills()}
                            {renderReset()}
                        </div>
                    )
                    : null}
            </div>
        );
    }

    return (
        <div
            data-slot="filter-bar"
            data-layout="bar"
            className={cn("flex flex-wrap items-center gap-[var(--control-gap-sm)]", className)}
        >
            {searchable ? renderSearch(false) : null}

            {pickerFacets.map(renderBarFacet)}

            {sortOptions === undefined || sortOptions.length === 0 ? null : renderSort(sortOptions)}

            {renderReset()}

            {/* 알약 줄은 줄을 통째로 쓴다. flex-wrap 안에서 basis-full 이 줄바꿈을 만들므로
                줄이 없을 때의 DOM 과 클래스는 그대로 둔 채 아래 줄만 얻는다 */}
            {pillFacets.length === 0
                ? null
                : (
                    <div className="flex basis-full flex-wrap gap-[var(--control-gap-sm)]">
                        {renderPills()}
                    </div>
                )}
        </div>
    );
}
