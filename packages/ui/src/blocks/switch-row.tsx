"use client";

import type { ReactNode } from "react";

import { Field, FieldLabel } from "@hathway/ui/components/field";
import { Switch } from "@hathway/ui/components/switch";
import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * One setting on a single line: its name, a hint and the switch at the end — for a dense list of switches. For a
 * setting whose description runs under the name use SwitchField.
 *
 * The hint is cut with an ellipsis before it reaches the switch: its width is capped at a little over half the
 * row, so a wider typeface or a fallback font never pushes its last word under the switch.
 *
 * `loading` keeps the words and draws the switch disabled and off: whether it is on is what it waits for.
 */
export const SwitchRow = ({
    id,
    label,
    hint,
    checked,
    defaultChecked,
    onCheckedChange,
    disabled,
    loading,
}: {
    id: string;
    label: ReactNode;
    hint?: ReactNode;
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    loading?: boolean;
}) => (
    <Field {...pendingFrame(loading)} orientation="horizontal">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {hint !== undefined && <span className={cn(NOTE, "max-w-[56%] min-w-0 flex-[0_1_auto] truncate text-right")}>{hint}</span>}
        {/* The key: a switch that waited off takes its value when it arrives. */}
        <Switch key={loading ? "pending" : "value"} id={id} checked={loading ? false : checked} defaultChecked={defaultChecked} onCheckedChange={onCheckedChange} disabled={loading || disabled} />
    </Field>
);
