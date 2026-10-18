"use client";

import type { ReactNode } from "react";

import { Field, FieldContent, FieldDescription, FieldLabel } from "@hathway/ui/components/field";
import { Switch } from "@hathway/ui/components/switch";
import { pendingFrame } from "@hathway/ui/blocks/pending";

/**
 * One setting as a switch: its name and what turning it on does, with the switch at the end of the row. `icon`
 * puts a small icon before the name. For a dense list with the hint on the same line use SwitchRow. `loading`
 * keeps the words and draws the switch disabled and off: whether it is on is what it waits for.
 */
export const SwitchField = ({
    id,
    icon,
    label,
    description,
    checked,
    defaultChecked,
    onCheckedChange,
    disabled,
    loading,
}: {
    id: string;
    icon?: ReactNode;
    label: ReactNode;
    description?: ReactNode;
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    loading?: boolean;
}) => (
    <Field {...pendingFrame(loading)} orientation="horizontal">
        <FieldContent>
            <FieldLabel htmlFor={id} className={icon === undefined ? undefined : "[&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0"}>{icon}{label}</FieldLabel>
            {description !== undefined && <FieldDescription>{description}</FieldDescription>}
        </FieldContent>
        {/* The key: a switch that waited off takes its value when it arrives. */}
        <Switch key={loading ? "pending" : "value"} id={id} checked={loading ? false : checked} defaultChecked={defaultChecked} onCheckedChange={onCheckedChange} disabled={loading || disabled} />
    </Field>
);
