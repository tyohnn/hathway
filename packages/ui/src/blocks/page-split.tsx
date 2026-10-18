"use client";

import { type ComponentProps, createContext, type ReactNode, useContext } from "react";

import { ASIDE_NARROW_HIDDEN, ASIDE_WIDTH, type AsideWidth, GAP, type Gap } from "@hathway/ui/blocks/lib/frame";
import { usePageFrame } from "@hathway/ui/blocks/page";
import { Button } from "@hathway/ui/components/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@hathway/ui/components/sheet";
import { cn } from "@hathway/ui/lib/utils";

/**
 * What the narrower pane does when its page is too narrow for two (below 56rem of the page's own width):
 *
 * - `stack`: it goes under the main pane and the page scrolls as one — for content read along with the main pane;
 * - `sheet`: it leaves the page and opens over it from a PageAsideTrigger — for a tool that works on the main pane,
 *   which keeps its height;
 * - `hide`: it is not drawn — for an aid the page works without (a table of contents).
 *
 * There is no "stay side by side": a pane that keeps its width squeezes the main one to nothing.
 */
export type SplitNarrow = "stack" | "sheet" | "hide";

const SplitContext = createContext<SplitNarrow>("stack");

/**
 * Two panes side by side: a main column that takes the room and a narrower one beside it. The first child is the
 * main pane and brings `min-w-0 flex-1` itself (a card that fills, a PagePane, a PageMain); the other is a
 * PageAside, or a block that is the pane with a width from ASIDE_WIDTH (lib/frame).
 */
export const PageSplit = ({
    gap = "sm",
    narrow = "stack",
    className,
    children,
    ...props
}: {
    gap?: Gap;
    narrow?: SplitNarrow;
    children?: ReactNode;
} & ComponentProps<"div">) => (
    <SplitContext.Provider value={narrow}>
        <div
            data-slot="page-split"
            data-narrow={narrow}
            className={cn("flex min-h-0 min-w-0 flex-1", narrow === "stack" && "@max-4xl/page:flex-none @max-4xl/page:flex-col", GAP[gap], className)}
            {...props}
        >
            {children}
        </div>
    </SplitContext.Provider>
);

/** The main pane of a split when what stands in it does not size itself: a plain column that takes the room. */
export const PageMain = ({ gap = "none", className, children, ...props }: { gap?: Gap; children?: ReactNode } & ComponentProps<"div">) => (
    <div data-slot="page-main" className={cn("flex min-h-0 min-w-0 flex-1 flex-col", GAP[gap], className)} {...props}>
        {children}
    </div>
);

/**
 * The narrower pane of a split: a column of blocks at one of the aside widths. What it does when the page is
 * narrow is its split's `narrow`.
 *
 * `label`: the pane's name. In a `sheet` split it is the sheet's title; give the same words to the trigger.
 * `scroll`: the pane scrolls by itself (in a pinned page whose aside can outgrow its height).
 */
export const PageAside = ({
    width = "md",
    gap = "sm",
    scroll = false,
    label,
    className,
    children,
    ...props
}: {
    width?: AsideWidth;
    gap?: Gap;
    scroll?: boolean;
    label?: ReactNode;
    children?: ReactNode;
} & ComponentProps<"div">) =>
{
    const narrow = useContext(SplitContext);
    const frame = usePageFrame();
    const classes = cn("flex min-h-0 min-w-0 flex-col", ASIDE_WIDTH[width], GAP[gap], scroll && "overflow-y-auto", narrow !== "stack" && ASIDE_NARROW_HIDDEN, className);

    if (narrow !== "sheet")
    {
        return <div data-slot="page-aside" className={classes} {...props}>{children}</div>;
    }

    // In the page while it is wide; in a sheet while it is narrow. Never both: the blocks inside keep one set of ids.
    return (
        <>
            <div data-slot="page-aside" className={classes} {...props}>{frame?.narrow ? null : children}</div>
            <Sheet open={frame?.asideOpen ?? false} onOpenChange={(open) => frame?.setAsideOpen(open)}>
                <SheetContent side="right" data-slot="page-aside-sheet" className="gap-0">
                    <SheetHeader>
                        <SheetTitle>{label}</SheetTitle>
                    </SheetHeader>
                    <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", GAP[gap])}>{children}</div>
                </SheetContent>
            </Sheet>
        </>
    );
};

/**
 * The button that opens an aside that became a sheet. It is drawn only while the page is narrow; put it where the
 * page's actions are (the heading, a toolbar). `label` is its accessible name — the aside's name — and the icon is
 * the caller's.
 */
export const PageAsideTrigger = ({ label, className, children, ...props }: { label: string; children: ReactNode } & Omit<ComponentProps<typeof Button>, "children">) =>
{
    const frame = usePageFrame();

    return (
        <Button
            variant="outline"
            size="icon-sm"
            data-slot="page-aside-trigger"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={frame?.asideOpen ?? false}
            className={cn("@4xl/page:hidden", className)}
            onClick={() => frame?.setAsideOpen(true)}
            {...props}
        >
            {children}
        </Button>
    );
};
