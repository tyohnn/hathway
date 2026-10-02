"use client";

import { cn } from "@investment/ui/lib/utils";

import type { Tone } from "../tone";
import { clampCompleted, hasTrack, toPercent } from "./ratio";
import type { ProgressMeterProps } from "./types";

/**
 * 채운 칸의 색. tone.ts 의 옅은 짝(TONE_SURFACE)과 달리 여기는 꽉 찬 면이라 진한 쪽을 읽는다.
 * neutral 이 primary 인 것은 「진행」이 이 제품의 기본 강조이기 때문이다.
 */
const TONE_FILL: Record<Tone, string> = {
    neutral: "bg-primary",
    info: "bg-info",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
};

/** 잴 수 없는 자리의 표시. 0 을 적으면 「아직 하나도 안 끝났다」로 읽힌다 */
const NO_COUNT = "—";

/**
 * 끝난 수와 전체 수를 막대 하나로 보이는 진행률.
 *
 * 목록 행과 상세 머리와 카탈로그가 같은 모양을 쓰므로 블록으로 굳혔다.
 * 프리미티브 Progress 를 쓰지 않는 까닭은 셋이다. 3층 progress.css 가 막대 두께와 채운 색을
 * 고정해서 tone 과 size 를 둘 다 덮어써야 하고, 그 둘을 남의 컴포넌트 안쪽 data-slot 으로
 * 겨냥하면 그 파일이 바뀌는 날 조용히 풀린다. 그리고 여기서는 백분율을 블록이 직접 갖는 편이
 * 낫다. 비율 계산이 ratio.ts 에 있어 화면 없이 0 나눗셈과 넘침을 잴 수 있기 때문이다.
 *
 * ⚠ 전체가 0 이면 막대를 그리지 않는다. 눈금이 없는 막대는 「0% 진행」으로 읽히는데,
 *    세지 못한 것과 하나도 못 끝낸 것은 다른 사실이다.
 */
export function ProgressMeter({
    value,
    total,
    label,
    tone = "neutral",
    size = "default",
    showCount = true,
    className,
}: ProgressMeterProps)
{
    const measurable = hasTrack(total);
    const done = clampCompleted(value, total);
    const percent = toPercent(value, total);
    const count = measurable ? `${done} / ${total}` : NO_COUNT;

    // 수를 끄더라도 잴 수 없다는 사실은 남긴다. 막대도 수도 없으면 자리가 통째로 비어
    // 「아직 안 붙은 화면」과 구분되지 않는다.
    const countVisible = showCount || !measurable;

    return (
        <div
            data-slot="progress-meter"
            data-tone={tone}
            data-size={size}
            className={cn("flex w-full flex-col gap-[var(--surface-gap)]", className)}
        >
            {label === undefined && !countVisible
                ? null
                : (
                    <div
                        className={cn(
                            "flex items-center gap-[var(--control-gap-sm)]",
                            size === "sm"
                                ? "text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)]"
                                : "text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)]",
                        )}
                    >
                        {label === undefined
                            ? null
                            : <span className="min-w-0 truncate text-foreground">{label}</span>}
                        {countVisible
                            ? (
                                <span
                                    className={cn(
                                        "ml-auto shrink-0 tabular-nums",
                                        measurable ? "text-muted-foreground" : "text-foreground-subtle",
                                    )}
                                >
                                    {count}
                                </span>
                            )
                            : null}
                    </div>
                )}

            {measurable
                ? (
                    <div
                        role="progressbar"
                        aria-label={label ?? count}
                        aria-valuenow={done}
                        aria-valuemin={0}
                        aria-valuemax={total}
                        className={cn(
                            "w-full overflow-hidden rounded-full bg-border",
                            // ⚠ 트랙을 bg-muted 로 두면 흰 면 위에서 사라진다. 채운 칸만 남으면
                            //    분모가 화면에서 없어져 「어디까지 왔나」를 읽을 수 없다.
                            // ⚠ 두께 4px 과 6px 은 리터럴이다. 3층 progress.css 가 막대 두께를
                            //    두고 적어 둔 판단과 같은 자리로, 어떤 축에도 걸리지 않는다.
                            size === "sm" ? "h-1" : "h-1.5",
                        )}
                    >
                        <div
                            aria-hidden
                            className={cn("h-full rounded-full", TONE_FILL[tone])}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                )
                : null}
        </div>
    );
}
