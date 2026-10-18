"use client";

import type { ReactNode } from "react";

import { Field, FieldLabel } from "@hathway/ui/components/field";
import { pendingFrame } from "@hathway/ui/blocks/pending";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hathway/ui/components/select";

export type SelectFieldOption = string | { value: string; label: string };

/**
 * A select as a form field: its label over a trigger as wide as the field. Options are plain strings or value and
 * label pairs. `name` is a fuller name for assistive technology when the visible label is short ("From" →
 * "Quiet hours start"). For a small select in a toolbar or a cell use CompactSelect. `loading` keeps the label
 * and draws the select disabled and empty: the choice is what it waits for.
 */
export const SelectField = ({
    id,
    label,
    name,
    options,
    value,
    defaultValue,
    onValueChange,
    disabled,
    loading,
}: {
    id: string;
    label: ReactNode;
    name?: string;
    options: readonly SelectFieldOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    loading?: boolean;
}) =>
{
    const items = options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));

    return (
        <Field {...pendingFrame(loading)}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {/* The key: a select that waited empty takes its value when it arrives. */}
            <Select
                key={loading ? "pending" : "value"}
                items={items}
                {...(loading ? { value: null } : value === undefined ? { defaultValue: defaultValue ?? items[0]?.value } : { value })}
                onValueChange={onValueChange && ((next) => onValueChange(String(next)))}
                disabled={loading || disabled}
            >
                <SelectTrigger id={id} aria-label={name} className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
            </Select>
        </Field>
    );
};
