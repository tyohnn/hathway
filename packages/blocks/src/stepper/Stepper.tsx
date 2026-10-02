"use client";

import { CircleCheck, TriangleAlert } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import type { Step, StepStatus, StepperProps } from "./types";

function resolveStatus(step: Step, index: number, current: number): StepStatus
{
    if (step.status !== undefined)
    {
        return step.status;
    }

    if (index < current)
    {
        return "done";
    }

    return index === current ? "current" : "pending";
}

/**
 * 여러 단계로 나뉜 절차의 진행 표시.
 *
 * 끝난 단계는 아이콘, 나머지는 숫자다. 지금 단계의 강조는 primary 테두리와 굵기로 낸다 —
 * 프리미티브 Avatar 에 tone 변형이 없어 Figma 에서는 굵기로만 냈던 자리이고, 코드에서는
 * 1층 primary 를 읽어 한 단계 더 잡아 준다.
 * 연결선은 선 조각이 없어 직접 그리며 두께는 surface/border-width 다.
 */
export function Stepper({ steps, current, orientation = "horizontal", onStepPress, className }: StepperProps)
{
    const isVertical = orientation === "vertical";

    return (
        <ol
            data-slot="stepper"
            data-orientation={orientation}
            className={cn("flex", isVertical ? "flex-col" : "flex-row items-center", className)}
        >
            {steps.map((step, index) =>
            {
                const status = resolveStatus(step, index, current);
                const pressable = onStepPress !== undefined && status === "done";

                const marker = (
                    <span
                        aria-hidden
                        className={cn(
                            "flex shrink-0 items-center justify-center rounded-full border text-[length:var(--ui-text-sm)]",
                            status === "done" ? "border-transparent text-success" : "",
                            status === "current" ? "border-primary text-foreground" : "",
                            status === "pending" ? "border-border text-muted-foreground" : "",
                            status === "error" ? "border-transparent text-destructive" : "",
                        )}
                        style={{
                            width: "var(--avatar-size-sm)",
                            height: "var(--avatar-size-sm)",
                            borderWidth: "var(--control-border-width)",
                        }}
                    >
                        {status === "done" ? <CircleCheck className="size-4" /> : null}
                        {status === "error" ? <TriangleAlert className="size-4" /> : null}
                        {status === "done" || status === "error" ? null : index + 1}
                    </span>
                );

                const label = (
                    <span className="flex flex-col">
                        <span
                            className={cn(
                                "text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)]",
                                status === "pending" ? "text-muted-foreground" : "text-foreground",
                            )}
                            style={status === "current" ? { fontWeight: "var(--ui-font-weight)" } : undefined}
                        >
                            {step.label}
                        </span>
                        {step.description === undefined
                            ? null
                            : (
                                <span className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                                    {step.description}
                                </span>
                            )}
                    </span>
                );

                return (
                    <li
                        key={step.id}
                        data-status={status}
                        aria-current={status === "current" ? "step" : undefined}
                        className={cn("flex", isVertical ? "flex-col" : "flex-1 flex-row items-center last:flex-none")}
                    >
                        <div className={cn("flex items-center gap-[var(--control-gap-sm)]", isVertical ? "" : "shrink-0")}>
                            {pressable
                                ? (
                                    <button
                                        type="button"
                                        className="flex items-center gap-[var(--control-gap-sm)] rounded-[var(--control-radius)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        onClick={() => onStepPress(step, index)}
                                    >
                                        {marker}
                                        {label}
                                    </button>
                                )
                                : (
                                    <>
                                        {marker}
                                        {label}
                                    </>
                                )}
                        </div>
                        {index < steps.length - 1
                            ? (
                                <span
                                    aria-hidden
                                    className={cn("bg-border", isVertical ? "ml-3" : "mx-[var(--control-gap-md)] flex-1")}
                                    style={isVertical
                                        ? { width: "var(--surface-border-width)", height: "var(--surface-padding-md)" }
                                        : { height: "var(--surface-border-width)" }}
                                />
                            )
                            : null}
                    </li>
                );
            })}
        </ol>
    );
}
