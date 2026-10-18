import type { ReactNode } from "react";

import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * How an article opens: the chapter it belongs to over the title, a lead paragraph, and a line of meta (version
 * badges, reading time, who updated it). It is the first thing inside Prose, which sets the title and the lead.
 * `loading` draws bars for the chapter and the title. The lead is running text and the meta line is the caller's
 * own pieces, so both stay as they are passed; the block has no root of its own, so the title carries the frame.
 */
export const ArticleHeading = ({ eyebrow, title, lead, meta, loading }: { eyebrow?: ReactNode; title?: ReactNode; lead?: ReactNode; meta?: ReactNode; loading?: boolean }) => (
    <>
        {eyebrow !== undefined && <p className={cn("m-0", NOTE)}>{loading ? <PendingText length={14} /> : eyebrow}</p>}
        <h1 {...pendingFrame(loading)} className={eyebrow === undefined ? undefined : "mt-1"}>{loading ? <PendingText length={14} /> : title}</h1>
        {lead !== undefined && <p className="text-muted-foreground">{lead}</p>}
        {meta !== undefined && <div className={cn("not-typeset mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 [&_svg]:size-[var(--control-icon-size-md)]", NOTE)}>{meta}</div>}
    </>
);
