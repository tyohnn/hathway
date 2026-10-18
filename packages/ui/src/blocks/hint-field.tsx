import type { ReactNode } from "react";

import { Field, FieldLabel } from "@hathway/ui/components/field";
import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A field whose label line ends in a short hint or the current value ("200k · tools", "0.4"), with the control
 * under it. `id` is the control's id, so the label points at it. `loading` keeps the label and draws a bar for
 * the hint; the control is the caller's and waits as itself, disabled.
 */
export const HintField = ({ id, label, hint, loading, children, className }: { id?: string; label: ReactNode; hint?: ReactNode; loading?: boolean; children: ReactNode; className?: string }) => (
    <Field {...pendingFrame(loading)} className={className}>
        <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {hint !== undefined && <span className={cn(NOTE, "tabular-nums")}>{loading ? <PendingText length={6} /> : hint}</span>}
        </div>
        {children}
    </Field>
);
