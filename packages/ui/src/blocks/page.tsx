"use client";

import { type ComponentProps, createContext, type ElementType, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";

import { DOCUMENT_PADDING, GAP, type Gap, GUTTER, GUTTER_INLINE, type Gutter, MEASURE, type Measure, PAGE_SPLIT_MIN_REM } from "@hathway/ui/blocks/lib/frame";
import { cn } from "@hathway/ui/lib/utils";

/**
 * What a page tells the frames inside it: whether it is too narrow for two panes, and whether the aside that
 * became a sheet is open (page-split.tsx reads both).
 */
type PageFrame = { narrow: boolean; asideOpen: boolean; setAsideOpen: (open: boolean) => void };

const PageFrameContext = createContext<PageFrame | null>(null);

export const usePageFrame = () => useContext(PageFrameContext);

// A pinned page whose split has stacked cannot stay pinned: two panes under each other do not fit a fixed height.
// It scrolls as one, and what it holds keeps its own height.
const UNPIN_WHEN_STACKED = "@max-4xl/page:has-[[data-slot=page-split][data-narrow=stack]]:overflow-y-auto @max-4xl/page:has-[[data-slot=page-split][data-narrow=stack]]:*:shrink-0";

/**
 * The frame of a page: the content under the bar. It holds blocks and decides only where they stand — how far
 * from the edge, how far from each other, and what scrolls. It knows nothing about what is inside.
 *
 * `scroll="page"`: the content scrolls under the bar as one. `scroll="regions"`: the page is pinned to the height it
 * is given and something inside scrolls (a table in its card, a PagePane, a board's columns).
 *
 * Put it directly inside the inset, after the bar. It takes the height that is left (the inset is a column), so it
 * does not have to know how tall the bar is.
 *
 * `flush`: no gutter above, for a page under a bar that draws no rule — the bar's own height is the room.
 *
 * The page is a container (`@container/page`): what is inside reacts to the page's own width, not the viewport's,
 * so a split collapses when its page is narrow and comes back when the sidebar is closed. Being a container also
 * means wide content (a table, a board) never widens the inset; it scrolls in place. The frame around the page
 * is that container, because an element cannot answer a query about itself.
 */
export const Page = ({
    scroll = "page",
    gutter = "sm",
    gap = "sm",
    flush = false,
    className,
    children,
    ...props
}: {
    scroll?: "page" | "regions";
    gutter?: Gutter;
    gap?: Gap;
    flush?: boolean;
    children?: ReactNode;
} & ComponentProps<"div">) =>
{
    const frameRef = useRef<HTMLDivElement>(null);
    const [narrow, setNarrow] = useState(false);
    const [asideOpen, setAsideOpen] = useState(false);

    // The same question the classes ask with `@4xl/page:`, for what cannot be done in CSS (an aside in a sheet).
    useEffect(() =>
    {
        const frame = frameRef.current;

        if (!frame || typeof ResizeObserver === "undefined") return;

        const measure = () =>
        {
            const isNarrow = frame.clientWidth < PAGE_SPLIT_MIN_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);

            setNarrow(isNarrow);
            if (!isNarrow) setAsideOpen(false);
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(frame);

        return () => observer.disconnect();
    }, []);

    const frame = useMemo(() => ({ narrow, asideOpen: narrow && asideOpen, setAsideOpen }), [narrow, asideOpen]);

    return (
        <PageFrameContext.Provider value={frame}>
            <div ref={frameRef} data-slot="page-frame" className="@container/page flex min-h-0 flex-[1_1_0px] flex-col">
                <div
                    data-slot="page"
                    data-scroll={scroll}
                    className={cn("flex min-h-0 flex-1 flex-col", GUTTER[gutter], gutter !== "none" && flush && "pt-0", GAP[gap], scroll === "page" ? "overflow-y-auto" : UNPIN_WHEN_STACKED, className)}
                    {...props}
                >
                    {children}
                </div>
            </div>
        </PageFrameContext.Provider>
    );
};

/**
 * A region of a pinned page that scrolls by itself: the main column beside an aside, the reader under a toolbar.
 * It takes the room that is left, on either axis.
 */
export const PagePane = ({
    gutter = "none",
    gap = "none",
    flush = false,
    className,
    children,
    ...props
}: {
    gutter?: Gutter;
    gap?: Gap;
    /** No gutter above: the pane starts right under what is over it */
    flush?: boolean;
    children?: ReactNode;
} & ComponentProps<"div">) => (
    <div
        data-slot="page-pane"
        className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto", GUTTER[gutter], gutter !== "none" && flush && "pt-0", GAP[gap], className)}
        {...props}
    >
        {children}
    </div>
);

/**
 * A column of blocks inside something that scrolls (a Page with `scroll="page"`, a PagePane): the gutter, the gap,
 * and optionally a measure — the widest the column gets, centred unless `align="start"`.
 *
 * `document`: the column is a document. The room above and below it is the document's own (a little above, more
 * below, so the last line can scroll clear of the edge) instead of the gutter.
 */
export const PageContent = <Tag extends ElementType = "div">({
    as,
    gutter = "sm",
    gap = "sm",
    measure,
    align = "center",
    document = false,
    className,
    children,
    ...props
}: {
    as?: Tag;
    gutter?: Gutter;
    gap?: Gap;
    measure?: Measure;
    align?: "center" | "start";
    document?: boolean;
    children?: ReactNode;
} & Omit<ComponentProps<Tag>, "as" | "children">) =>
{
    const Element: ElementType = as ?? "div";

    return (
        <Element
            data-slot="page-content"
            className={cn(
                "flex w-full shrink-0 flex-col",
                document ? cn(GUTTER_INLINE[gutter], DOCUMENT_PADDING) : GUTTER[gutter],
                GAP[gap],
                measure !== undefined && MEASURE[measure],
                measure !== undefined && align === "center" && "mx-auto",
                className,
            )}
            {...props}
        >
            {children}
        </Element>
    );
};
