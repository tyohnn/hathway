import { Fragment, type ReactNode } from "react";

import { Badge } from "@hathway/ui/components/badge";
import { BODY } from "@hathway/ui/blocks/lib/copy";
import { BARS_ON_MUTED, PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type RuleStep = {
    id: string;
    /** The step's keyword as a badge: When, If, Then */
    keyword: ReactNode;
    /** The rest of the sentence: plain words as strings, the values as badges */
    parts: readonly ReactNode[];
};

/**
 * A rule read as a sentence per step — when this happens, if that holds, then do this — each in its own outlined
 * row: the keyword as a badge, then words and the values they refer to. `loading` draws `count` outlined rows,
 * each an empty badge and a bar for the sentence.
 */
export const RuleSteps = ({
    steps = [],
    loading,
    count = 3,
    className,
}: {
    steps?: readonly RuleStep[];
    loading?: boolean;
    /** How many rows to draw while loading */
    count?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-col gap-2", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <div key={index} className={cn("flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-muted px-3 py-2", BARS_ON_MUTED)}>
                <Badge variant="outline"><PendingText length={4} /></Badge>
                <span className={BODY}><PendingText length={28} /></span>
            </div>
        ))}
        {!loading && steps.map((step) => (
            <div key={step.id} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-muted px-3 py-2">
                {step.keyword}
                {step.parts.map((part, index) => (typeof part === "string" ? <span key={index} className={BODY}>{part}</span> : <Fragment key={index}>{part}</Fragment>))}
            </div>
        ))}
    </div>
);
