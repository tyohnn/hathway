import type { ReactNode } from "react";

import { GUTTER_INLINE, type Gutter } from "@hathway/ui/blocks/lib/frame";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The bar at the top of a page inside an app window: the page's title with its status beside it, and the global
 * actions (search, notifications, the account) at the other end, over a divider. When the two do not fit on one
 * line the actions go under the title. `loading` draws a bar for the title and leaves the status badge out; the
 * actions stay.
 *
 * `gutter`: how far the bar's ends stand from the page's edge — the page's small gutter, so the bar lines up with a
 * page at that step and moves with it.
 */
export const PageBar = ({ leading, title, status, actions, loading, gutter = "sm", className }: { /** Before the title: the sidebar's trigger where the sidebar can close */ leading?: ReactNode; title?: ReactNode; /** A badge next to the title */ status?: ReactNode; actions?: ReactNode; loading?: boolean; gutter?: Gutter; className?: string }) => (
    <header {...pendingFrame(loading)} className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-2.5", GUTTER_INLINE[gutter], className)}>
        <div className="flex min-w-0 items-center gap-2.5">
            {leading}
            <h1 className="m-0 font-heading text-[length:var(--heading-font-size-sm)] leading-[var(--heading-line-height-sm)] font-semibold tracking-[var(--heading-letter-spacing)]">{loading ? <PendingText length={10} /> : title}</h1>
            {!loading && status}
        </div>
        {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
    </header>
);
