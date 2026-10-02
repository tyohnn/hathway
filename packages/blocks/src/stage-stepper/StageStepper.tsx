"use client";

import { Check } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { Pause } from "../icons/extra";
import { stageLayout } from "./layout";
import { STAGE_STEPPER_LABELS } from "./labels";
import type { StageStepStatus, StageStepperProps } from "./types";

/** 좁은 화면에서 칸이 뭉개지지 않는 최소 너비. 이보다 좁아지면 띠가 제 그릇 안에서 옆으로 스크롤한다 */
const MIN_COLUMN_WIDTH = 72;

/**
 * 옵션 단계의 사선 무늬.
 *
 * ⚠ **줄 너비 6px 은 리터럴이다.** 이 띠 한 곳에만 쓰이고 어떤 축에도 걸리지 않는다. 축에
 *    걸치지 않는 값은 토큰으로 만들지 않는다(3층 progress.css 가 막대 두께를 두고 적어 둔
 *    판단과 같다). 색만 1층에서 읽는다.
 *
 * 옵션을 색으로만 구분하면 「아직 안 한 단계」와 같은 회색이 되는데, 그 둘은 다른 사실이다.
 */
const OPTIONAL_STRIPES =
    "bg-[repeating-linear-gradient(135deg,var(--muted)_0_6px,var(--background)_6px_12px)]";

/**
 * 갈매기의 모양 셋. 첫 칸은 왼쪽이, 끝 칸은 오른쪽이 직선이다.
 *
 * ⚠ **`style` 이 아니라 클래스로 둔다.** 세 갈래가 값이 아니라 자리로만 갈려서 클래스로
 *    표현되고, className 이라야 호출부가 덮을 수 있다(블록 규약 2). 파고드는 깊이 10px 은
 *    무늬와 같은 까닭으로 리터럴이다.
 */
const CLIP_ONLY = "";
const CLIP_FIRST = "[clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_50%,calc(100%_-_10px)_100%,0_100%)]";
const CLIP_LAST = "[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,10px_50%)]";
const CLIP_MIDDLE =
    "[clip-path:polygon(0_0,calc(100%_-_10px)_0,100%_50%,calc(100%_-_10px)_100%,0_100%,10px_50%)]";

/**
 * 상태마다의 면.
 *
 * 벨라는 헥사를 직접 적었지만 여기서는 1층 토큰만 읽는다. 진한 상태 색 위의 글자를
 * --background 로 두는 것은 라이트와 다크에서 상태 색의 명도가 뒤집히기 때문이다.
 * 라이트의 진한 초록 위에는 흰 글자가, 다크의 밝은 초록 위에는 검은 글자가 필요한데
 * --background 한 토큰이 그 둘을 다 말한다.
 */
const STATUS_FILL: Record<StageStepStatus, string> = {
    done: "bg-success text-background",
    current: "bg-primary text-primary-foreground",
    hold: "bg-warning text-background",
    optional: "bg-muted text-muted-foreground",
    todo: "bg-muted text-muted-foreground",
};

/** 갈매기 아래 이름의 색. 지금 단계와 멈춘 단계만 눈에 걸리게 한다 */
const STATUS_TEXT: Record<StageStepStatus, string> = {
    done: "text-muted-foreground",
    current: "text-foreground",
    hold: "text-warning",
    optional: "text-foreground-subtle",
    todo: "text-foreground-subtle",
};

/** 범례의 차례. 진행의 순서가 아니라 읽는 사람이 궁금해하는 순서다 */
const LEGEND_ORDER: ReadonlyArray<StageStepStatus> = ["done", "current", "optional", "hold", "todo"];

function clipOf(first: boolean, last: boolean): string
{
    if (first && last)
    {
        return CLIP_ONLY;
    }

    if (first)
    {
        return CLIP_FIRST;
    }

    return last ? CLIP_LAST : CLIP_MIDDLE;
}

/**
 * 갈매기로 그리는 단계 띠.
 *
 * Stepper 와 따로 서는 까닭은 상태의 축이 다르기 때문이다. 저쪽 넷은 절차를 어디까지
 * 밟았는지를 말하고 이쪽 다섯은 단계마다의 처지를 말하는데, 홀딩과 옵션은 앞뒤 순서로
 * 설명되지 않아서 저쪽 계약에 끼워 넣을 수 없다. 기존 계약을 비틀면 지금 Stepper 를 쓰는
 * 자리가 함께 다친다.
 *
 * ⚠ 옆으로 넘치는 것은 띠 자신의 그릇 안에서만 스크롤한다. 페이지 본문이 함께 밀리면
 *    단계가 열둘인 화면에서 나머지 내용까지 가로로 끌어야 한다.
 */
export function StageStepper({ steps, onStepPress, legend = true, labels, className }: StageStepperProps)
{
    const text = { ...STAGE_STEPPER_LABELS, ...labels };
    const { columns, tracks } = stageLayout(steps);
    const named = tracks.length > 1;

    // 쓰이지 않은 상태까지 범례에 적으면 없는 단계를 찾게 만든다
    const shown = LEGEND_ORDER.filter((status) => steps.some((step) => step.status === status));

    return (
        <div
            data-slot="stage-stepper"
            className={cn("flex w-full flex-col gap-[var(--surface-gap-lg)]", className)}
        >
            <div className="w-full overflow-x-auto">
                <div
                    className="flex flex-col gap-[var(--surface-gap-lg)]"
                    style={{ minWidth: `${columns * MIN_COLUMN_WIDTH}px` }}
                >
                    {tracks.map((track) => (
                        <div
                            key={track.name ?? "__base"}
                            data-track={track.name}
                            className="flex items-start gap-[var(--control-gap-sm)]"
                        >
                            {named
                                ? (
                                    <div className="w-10 shrink-0 pt-[var(--surface-gap)] text-right text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)] text-muted-foreground">
                                        {track.name}
                                    </div>
                                )
                                : null}
                            <div
                                className="grid flex-1 gap-0.5"
                                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                            >
                                {track.cells.map((cell, position) =>
                                {
                                    const step = steps[cell.index];
                                    const first = position === 0;
                                    const last = position === track.cells.length - 1;

                                    const body = (
                                        <span className="flex min-w-0 flex-col gap-[var(--surface-gap)]">
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    "flex h-7 items-center justify-center",
                                                    STATUS_FILL[step.status],
                                                    step.status === "optional" ? OPTIONAL_STRIPES : "",
                                                    clipOf(first, last),
                                                    first && last ? "rounded-full" : "",
                                                    first && !last ? "rounded-l-full" : "",
                                                    last && !first ? "rounded-r-full" : "",
                                                )}
                                            >
                                                {step.status === "done" ? <Check className="size-3" strokeWidth={3} /> : null}
                                                {step.status === "hold" ? <Pause className="size-3" /> : null}
                                                {step.status === "current"
                                                    ? <span className="size-1.5 rounded-full bg-current" />
                                                    : null}
                                            </span>
                                            <span
                                                className={cn(
                                                    "break-keep text-center text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)]",
                                                    STATUS_TEXT[step.status],
                                                )}
                                            >
                                                {step.no === undefined
                                                    ? null
                                                    : (
                                                        <span className="mr-1 tabular-nums text-foreground-subtle">
                                                            {step.no}
                                                        </span>
                                                    )}
                                                {step.label}
                                            </span>
                                        </span>
                                    );

                                    return (
                                        <div
                                            key={step.id}
                                            data-status={step.status}
                                            className="min-w-0"
                                            style={{ gridColumn: `${cell.column} / span ${cell.span}` }}
                                        >
                                            {onStepPress === undefined
                                                ? body
                                                : (
                                                    <button
                                                        type="button"
                                                        className="w-full rounded-[var(--control-radius)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                        onClick={() => onStepPress(step, cell.index)}
                                                    >
                                                        {body}
                                                    </button>
                                                )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {legend && shown.length > 0
                ? (
                    <ul className="flex flex-wrap items-center gap-[var(--control-gap-md)] text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)] text-muted-foreground">
                        {shown.map((status) => (
                            <li key={status} className="flex items-center gap-[var(--control-gap-xs)]">
                                <span
                                    aria-hidden
                                    className={cn(
                                        "size-2.5 shrink-0 rounded-sm",
                                        STATUS_FILL[status],
                                        status === "optional" ? OPTIONAL_STRIPES : "",
                                    )}
                                />
                                {text[status]}
                            </li>
                        ))}
                    </ul>
                )
                : null}
        </div>
    );
}
