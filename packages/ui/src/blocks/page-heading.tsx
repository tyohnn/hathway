import type { ReactNode } from "react";

import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { META, TITLE } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The head of a page body: the title with one meta line under it, and the page's actions on the other side.
 * The actions wrap under the title when the row runs out of width, and the meta line wraps when the page is
 * narrower than it. `loading` draws bars for the title and the meta line in the same frame; the actions, which
 * wait for nothing, stay.
 */
export const PageHeading = ({ title, meta, actions, loading, className }: { title?: ReactNode; meta?: ReactNode; actions?: ReactNode; loading?: boolean; className?: string }) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
        <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className={TITLE}>{loading ? <PendingText length={12} /> : title}</h1>
            {loading ? <span className={META}><PendingText length={36} /></span> : meta !== undefined && <span className={cn(META, "whitespace-normal")}>{meta}</span>}
        </div>
        {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
);
