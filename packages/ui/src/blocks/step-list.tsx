import type { ReactNode } from "react";

import { MUTED_BODY } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type Step = {
    title: ReactNode;
    body?: ReactNode;
    /** What the step needs under its text: a code block, a figure */
    content?: ReactNode;
};

const NUMBER = "flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[length:var(--ui-text-sm)] leading-none text-foreground tabular-nums";

const STEP_TITLE = "m-0 text-[length:var(--ui-text-lg)] leading-[var(--ui-line-height-lg)] font-semibold";

/**
 * Numbered steps to follow in order: a number in a circle, the step's title, what to do, and a code block or figure
 * when the step has one. `loading` draws `count` numbered steps with bars for the title and one line of what to do.
 */
export const StepList = ({
    steps = [],
    loading,
    count = 3,
    className,
}: {
    steps?: readonly Step[];
    loading?: boolean;
    /** How many steps to draw while loading */
    count?: number;
    className?: string;
}) => (
    <ol {...pendingFrame(loading)} className={cn("mx-0 flex list-none flex-col gap-5 p-0", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <li key={index} className="flex gap-3">
                <span className={NUMBER} aria-hidden>{index + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <h3 className={STEP_TITLE}><PendingText length={24} /></h3>
                    <p className={cn("m-0", MUTED_BODY)}><PendingText length={56} /></p>
                </div>
            </li>
        ))}
        {!loading && steps.map((step, index) => (
            <li key={index} className="flex gap-3">
                <span className={NUMBER} aria-hidden>{index + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <h3 className={STEP_TITLE}>{step.title}</h3>
                    {step.body !== undefined && <p className={cn("m-0", MUTED_BODY)}>{step.body}</p>}
                    {step.content}
                </div>
            </li>
        ))}
    </ol>
);
