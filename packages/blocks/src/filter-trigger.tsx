"use client";

import { Badge } from "@investment/ui/components/badge";
import { Button } from "@investment/ui/components/button";
import { Separator } from "@investment/ui/components/separator";
import { Plus } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

/**
 * 조건 트리거 — 테두리 버튼에 이름과 선택 요약이 붙는다.
 *
 * DataTable 의 열 필터와 FilterBar 의 패싯이 같은 모양이라 여기로 올렸다(2026-09-06).
 * 고르는 방법은 서로 다르다 — 표 쪽은 TanStack 의 Column 을, 띠 쪽은 평범한 상태를 읽는다.
 * 같은 것은 보이는 모양뿐이라 이 조각만 공유한다.
 *
 * ⚠ Popover 가 `render` 로 끼워 넣는 ref·aria·이벤트를 그대로 Button 에 흘려야 열린다.
 *
 * ⚠ **크기가 `default` 인 것은 옆에 서는 검색 칸과 높이를 맞추기 위해서다.** 두 자리 모두 이
 *    트리거가 `InputGroup` 과 한 줄에 서는데, 그 칸의 높이는 3층이 `--control-height-md` 로 박아
 *    두어 줄일 수 없다(`.cn-input-group`). 여기를 `sm` 으로 두면 32 와 36 이 섞여 위아래 선이
 *    2px 씩 어긋난다(2026-09-21 실측).
 */
/**
 * 고른 값을 칩 안에 얼마나 적을지.
 *
 * 이름을 그대로 적으면 「덕유제약 주식회사」처럼 긴 값 둘만으로 칩이 400px 를 넘고, 조건 띠가
 * 줄바꿈하면서 아래 표가 통째로 내려간다. 그래서 **개수가 아니라 길이로 접는다** — 짧은 이름
 * 둘까지는 그대로 보이고, 길어지면 「N개 선택」이 된다.
 *
 * ⚠ 이 규칙을 호출부마다 따로 적지 않는다. DataTable 의 패싯 열 필터와 FilterBar 의 패싯이
 *    같은 칩을 쓰므로 한쪽만 고치면 같은 화면에서 두 규칙이 보인다.
 */
const SUMMARY_BUDGET = 10;

export function facetSummary(
    selectedLabels: ReadonlyArray<string>,
    countLabel: (count: number) => string,
): React.ReactNode
{
    if (selectedLabels.length === 0)
    {
        return undefined;
    }

    const fits = selectedLabels.length <= 2
        && selectedLabels.reduce((total, label) => total + label.length, 0) <= SUMMARY_BUDGET;

    if (!fits)
    {
        return <Badge variant="secondary" className="px-1.5 font-normal">{countLabel(selectedLabels.length)}</Badge>;
    }

    return (
        <span className="flex min-w-0 gap-1">
            {selectedLabels.map((label) => (
                <Badge key={label} variant="secondary" className="max-w-32 truncate px-1.5 font-normal">{label}</Badge>
            ))}
        </span>
    );
}

export function FilterTrigger(
    { label, summary, ...props }: Readonly<{ label: string; summary?: React.ReactNode }> & React.ComponentProps<typeof Button>,
)
{
    return (
        <Button variant="outline" size="default" {...props} className={cn("max-w-64", props.className)}>
            <Plus data-icon="inline-start" />
            {label}
            {summary !== undefined && (
                <>
                    {/* ⚠ `self-center` 가 있어야 가운데에 선다. 3층의 세로 구분선 규칙이
                        `height: 100%` 와 함께 `align-self: stretch` 를 걸어 두어서, 여기서 높이만
                        16px 로 줄이면 선이 위쪽에 붙는다(칩 가운데 462 · 선 가운데 453, 2026-09-21 실측). */}
                    <Separator orientation="vertical" className="mx-1 h-4 self-center" />
                    {summary}
                </>
            )}
        </Button>
    );
}
