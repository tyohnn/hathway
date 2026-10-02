"use client";

import type React from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@investment/ui/components/command";
import { Check } from "@investment/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@investment/ui/components/popover";
import { cn } from "@investment/ui/lib/utils";

import type { FacetSpec, FilterBarLabels } from "./types";

/**
 * 패싯 하나를 고르는 면.
 *
 * 트리거를 props 로 받는다 — 배치에 따라 누르는 자리의 모양만 다르고 고르는 목록은 같기
 * 때문이다. 띠 배치는 조건 트리거(DataTable 과 공용)를, 격자 배치는 라벨이 위에 따로
 * 서므로 이름을 되풀이하지 않는 선택 요약 버튼을 넘긴다.
 */
export function FacetFilter(
    { facet, selected, trigger, text, onToggle }: Readonly<{
        facet: FacetSpec;
        selected: ReadonlyArray<string>;
        trigger: React.ReactElement;
        text: FilterBarLabels;
        onToggle: (option: string) => void;
    }>,
)
{
    const selectedSet = new Set(selected);

    return (
        <Popover>
            <PopoverTrigger render={trigger} />
            <PopoverContent align="start" className="w-56 p-0" data-slot="filter-bar-facet" data-facet-key={facet.key}>
                <Command>
                    <CommandInput placeholder={text.filterSearch} />
                    <CommandList>
                        <CommandEmpty>{text.noResults}</CommandEmpty>
                        <CommandGroup>
                            {facet.options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => onToggle(option.value)}
                                >
                                    <span
                                        className={cn(
                                            "flex items-center justify-center rounded-[var(--control-indicator-radius)] border",
                                            selectedSet.has(option.value) ? "border-primary bg-primary text-primary-foreground" : "border-border",
                                        )}
                                        style={{ width: "var(--control-indicator-size)", height: "var(--control-indicator-size)" }}
                                    >
                                        {selectedSet.has(option.value) ? <Check className="size-3" /> : null}
                                    </span>
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
