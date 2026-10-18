import type { ReactNode } from "react";

import { GUTTER_INLINE, type Gutter } from "@hathway/ui/blocks/lib/frame";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The band over a table or a board: the filters that narrow it on one side, the actions that add to it or export it
 * on the other. When they do not fit on one line the filters wrap and the actions go under them.
 *
 * `gutter`: how far its ends stand from the page's edge — the page's small gutter by default. `none` inside something
 * that already has its own padding.
 */
export const FilterBar = ({ filters, actions, gutter = "sm", className }: { filters?: ReactNode; actions?: ReactNode; gutter?: Gutter; className?: string }) => (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4", GUTTER_INLINE[gutter], className)}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div>
        {actions !== undefined && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
);
