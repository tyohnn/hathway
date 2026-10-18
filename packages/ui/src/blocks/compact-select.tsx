"use client";

import type { ReactNode } from "react";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@hathway/ui/components/select";

export type CompactSelectOption = string | { value: string; label: string };

/**
 * A small select for a toolbar filter or a cell: a role, a status, a sort order. Options are plain strings or
 * value and label pairs; the first is selected until `value` or `defaultValue` says otherwise. `label` names the
 * control for assistive technology, and — with `showLabel` — is also written in the trigger before the value ("Sort by …").
 * `id` lets a field's label point at the trigger, and `heading` is a line over the options in the open list.
 */
export const CompactSelect = ({
    id,
    label,
    showLabel,
    icon,
    heading,
    options,
    value,
    defaultValue,
    onValueChange,
    disabled,
    className,
}: {
    id?: string;
    label: string;
    showLabel?: boolean;
    icon?: ReactNode;
    heading?: ReactNode;
    options: readonly CompactSelectOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    className?: string;
}) =>
{
    const items = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));

    return (
        <Select
            items={items}
            {...(value === undefined ? { defaultValue: defaultValue ?? items[0]?.value } : { value })}
            onValueChange={onValueChange && ((next) => { if (next != null) onValueChange(String(next)); })}
            disabled={disabled}
        >
            <SelectTrigger id={id} size="sm" aria-label={label} className={className}>
                {icon}
                {showLabel && <span className="text-muted-foreground">{label}</span>}
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {heading !== undefined && <SelectLabel>{heading}</SelectLabel>}
                    {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
};
