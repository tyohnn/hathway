import type { ReactNode } from "react";

import { PARAGRAPH, NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

const TONE = { success: "[&>svg]:text-success", destructive: "[&>svg]:text-destructive", muted: "[&>svg]:text-muted-foreground" } as const;

/**
 * One row of a short list in a side column: something in front (a small avatar, or a state icon in the `tone`'s
 * colour), a name that is cut when it is long, and at the end its state as a badge (`trailing`) or as small text
 * (`note`). A reviewer and their verdict, a check and how long it took. `loading` draws a bar for the name, and
 * one for the note when a `note` is passed (any value); what the caller puts in front and at the end stays.
 */
export const StatusLine = ({
    leading,
    tone,
    label,
    note,
    trailing,
    loading,
    className,
}: {
    leading?: ReactNode;
    /** The colour of a leading icon */
    tone?: keyof typeof TONE;
    label?: ReactNode;
    note?: ReactNode;
    trailing?: ReactNode;
    loading?: boolean;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex items-center gap-2 [&>svg]:size-[var(--control-icon-size-md)] [&>svg]:shrink-0", tone !== undefined && TONE[tone], className)}>
        {leading}
        <span className={cn(PARAGRAPH, "min-w-0 flex-1 truncate")}>{loading ? <PendingText length={14} /> : label}</span>
        {note !== undefined && <span className={cn(NOTE, "whitespace-nowrap")}>{loading ? <PendingText length={5} /> : note}</span>}
        {trailing}
    </div>
);
