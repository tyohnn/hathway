"use client";

import { RadioGroup, RadioGroupItem } from "@investment/ui/components/radio-group";
import { cn } from "@investment/ui/lib/utils";

import type { ChoiceCardsProps } from "./types";

const COLUMN_CLASS: Record<"auto" | 1 | 2 | 3, string> = {
    auto: "sm:grid-flow-col sm:auto-cols-fr",
    1: "",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
};

/**
 * 라디오를 카드로 그린 선택기.
 *
 * 선택 표시는 Radio 그대로이고, 블록은 카드 면·나열·선택됨 테두리만 맡는다.
 * 카드 면은 Card 에 그릇(슬롯)이 없어 직접 그렸다 — 색·모서리·여백은 전부 토큰이다.
 */
export function ChoiceCards({
    options,
    value,
    onValueChange,
    columns = "auto",
    indicator = "radio",
    name,
    disabled = false,
    className,
}: ChoiceCardsProps)
{
    return (
        <RadioGroup
            data-slot="choice-cards"
            name={name}
            value={value}
            disabled={disabled}
            onValueChange={(next) => onValueChange?.(String(next))}
            className={cn("grid grid-cols-1 gap-[var(--control-gap-md)]", COLUMN_CLASS[columns], className)}
        >
            {options.map((option) =>
            {
                const isSelected = option.value === value;

                return (
                    <label
                        key={option.value}
                        data-slot="choice-card"
                        data-selected={isSelected ? "" : undefined}
                        className={cn(
                            "flex cursor-pointer items-start gap-[var(--surface-icon-gap)] border bg-card transition-colors",
                            "has-disabled:cursor-not-allowed has-disabled:opacity-50",
                            isSelected ? "border-primary" : "border-border hover:bg-accent",
                        )}
                        style={{
                            borderRadius: "var(--surface-radius)",
                            padding: "var(--surface-padding-md)",
                            borderWidth: "var(--surface-border-width)",
                        }}
                    >
                        {indicator === "radio"
                            ? <RadioGroupItem value={option.value} disabled={option.disabled} className="mt-0.5" />
                            : <RadioGroupItem value={option.value} disabled={option.disabled} className="sr-only" />}
                        {option.icon === undefined ? null : <span className="shrink-0 text-muted-foreground">{option.icon}</span>}
                        <span className="flex min-w-0 flex-col gap-[var(--surface-gap)]">
                            <span
                                className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground"
                                style={{ fontWeight: "var(--ui-font-weight)" }}
                            >
                                {option.label}
                            </span>
                            {option.description === undefined
                                ? null
                                : (
                                    <span className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                                        {option.description}
                                    </span>
                                )}
                        </span>
                    </label>
                );
            })}
        </RadioGroup>
    );
}
