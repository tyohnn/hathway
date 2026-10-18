import type { ReactNode } from "react";

import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";

const HEADLINE = "font-heading text-[length:var(--heading-font-size-xl)] leading-[var(--heading-line-height-xl)] tracking-[var(--heading-letter-spacing)] font-bold text-foreground";

/**
 * The title of a document page — a brief, a page of notes — at twice the size of a screen's title, with an
 * optional cover (an emoji, a small picture) over it. For the title of an app screen use PageHeading. `loading`
 * draws a bar for the title and, when a cover is passed (any value), a short one in the cover's place (on the
 * baseline: the cover's line is exactly as tall as its type, and a bar in the middle would make it taller).
 */
export const DocumentTitle = ({ title, cover, loading }: { title?: ReactNode; /** Decorative; hidden from assistive technology */ cover?: ReactNode; loading?: boolean }) => (
    cover === undefined ? <h1 {...pendingFrame(loading)} className={HEADLINE}>{loading ? <PendingText length={24} /> : title}</h1> : (
        <div {...pendingFrame(loading)} className="flex flex-col gap-3">
            <span className="text-[length:calc(var(--heading-font-size-xl)*1.25)] leading-none" aria-hidden>{loading ? <PendingText length={2} className="align-baseline" /> : cover}</span>
            <h1 className={HEADLINE}>{loading ? <PendingText length={24} /> : title}</h1>
        </div>
    )
);
