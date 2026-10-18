import type { ReactNode } from "react";

import { LEAD } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The head of a section inside a page: its title with a sentence under it, and one action at the other end
 * ("All 12 topics"). For the head of the page itself use PageHeading; for a title with a short meta at the end
 * of the line use SectionTitle. `loading` draws bars for the title and the description; the action stays.
 */
export const SectionHeading = ({ title, description, action, loading, className }: { title?: ReactNode; description?: ReactNode; action?: ReactNode; loading?: boolean; className?: string }) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-wrap items-end justify-between gap-2", className)}>
        <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[length:var(--ui-text-lg)] leading-[var(--ui-line-height-lg)] font-semibold">{loading ? <PendingText length={14} /> : title}</h2>
            {description !== undefined && <p className={LEAD}>{loading ? <PendingText length={40} /> : description}</p>}
        </div>
        {action}
    </div>
);
