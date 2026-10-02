"use client";

import { ToggleGroup, ToggleGroupItem } from "@investment/ui/components/toggle-group";

import { FACET_ALL_VALUE } from "./filter-state";
import type { FacetSpec, FilterBarLabels } from "./types";

/**
 * 값이 늘 보이는 패싯 줄.
 *
 * 드롭다운과 고르는 방법은 같다 — 값을 여럿 고르고 같은 자리에 실린다. 다른 것은 **늘 보이느냐**뿐이다.
 * 목록을 여는 이유의 대부분을 차지하는 축(태스크 목록의 상태)은 무엇으로 좁혀 보고 있는지가
 * 화면에 떠 있어야 해서 이 배치를 쓴다.
 *
 * ⚠ 「전체」 는 값이 아니라 아무것도 안 고른 상태다. 그래서 배타적으로 다룬다 — 누르면
 *    나머지가 꺼지고, 다른 값을 누르면 「전체」 가 빠진다. 판정은 `resolvePillValues` 가 한다.
 *
 * ⚠ 붙인 세그먼트(`spacing={0}`)로 두지 않는다. 항목이 여섯쯤 되면 좁은 화면에서 줄이
 *    넘치는데, 맞닿은 모서리는 줄바꿈을 견디지 못해 가운데 항목이 각진 채로 끊긴다.
 *    `w-fit` 인 채로 넘치게 두면 화면이 통째로 가로 스크롤을 얻는다.
 */
export function FacetPills(
    { facet, selected, disabled, text, onValueChange }: Readonly<{
        facet: FacetSpec;
        selected: ReadonlyArray<string>;
        disabled: boolean;
        text: FilterBarLabels;
        onValueChange: (next: ReadonlyArray<string>) => void;
    }>,
)
{
    const pressed = selected.length === 0 ? [FACET_ALL_VALUE] : [...selected];

    return (
        <ToggleGroup
            data-facet-key={facet.key}
            aria-label={facet.label}
            variant="outline"
            size="sm"
            multiple
            disabled={disabled}
            className="flex-wrap"
            value={pressed}
            onValueChange={onValueChange}
        >
            <ToggleGroupItem value={FACET_ALL_VALUE}>{text.all}</ToggleGroupItem>
            {facet.options.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                    {option.label}
                    {option.count === undefined
                        ? null
                        : (
                            <span className="text-[length:var(--ui-text-sm)] text-muted-foreground tabular-nums">
                                {option.count}
                            </span>
                        )}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
