"use client";

import { type ReactNode, useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@hathway/ui/components/toggle-group";

export type SegmentedOption<Value extends string = string> = {
    value: Value;
    label: string;
    /** An icon before the label, with `data-icon="inline-start"` */
    icon?: ReactNode;
};

/**
 * A few choices side by side as one joined control, exactly one of them on: a period (24h · 7d · 30d), a view
 * (board · list), a scope (all · mine). `label` names the group for assistive technology. The first option is on
 * until `value` or `defaultValue` says otherwise; for more than a handful of options use CompactSelect.
 */
export const SegmentedControl = <Value extends string = string>({
    label,
    options,
    value,
    defaultValue,
    onValueChange,
    className,
}: {
    label: string;
    options: readonly SegmentedOption<Value>[];
    value?: Value;
    defaultValue?: Value;
    onValueChange?: (value: Value) => void;
    className?: string;
}) =>
{
    const [own, setOwn] = useState(defaultValue ?? options[0]?.value);

    return (
        <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[value ?? own]}
            // Pressing the option that is on would turn everything off; one stays on, so that press changes nothing.
            onValueChange={(next) =>
            {
                if (next[0] === undefined) return;

                setOwn(next[0] as Value);
                onValueChange?.(next[0] as Value);
            }}
            aria-label={label}
            className={className}
        >
            {options.map((option) => <ToggleGroupItem key={option.value} value={option.value}>{option.icon}{option.label}</ToggleGroupItem>)}
        </ToggleGroup>
    );
};
