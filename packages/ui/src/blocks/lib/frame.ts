/**
 * The steps a frame picks from (page.tsx, page-split.tsx). A frame decides which step a screen stands at; the value
 * of the step is a token. Each class reads the token and carries its default, so a system — or a product, in its
 * own CSS — declares a name only when it wants another value:
 *
 *     :root { --page-gutter-sm: 1.5rem; }      every screen at the small gutter moves, in every template
 *
 * Whole strings, picked from a table: Tailwind reads classes, not expressions.
 *
 * | Token                                      | Default                 | What stands at it                          |
 * |--------------------------------------------|-------------------------|--------------------------------------------|
 * | --page-gutter-sm · md · lg · xl            | 1 · 1.5 · 2 · 2.5rem    | the room between a page and its edge       |
 * | --page-gap-xs · sm · md · lg · xl          | .75 · 1 · 1.5 · 2 · 2.5 | the room between the blocks of a page      |
 * | --page-measure-sm · md · lg                | 48 · 52 · 64rem         | a reading column                           |
 * | --page-aside-xs · sm · md · lg · xl        | 14 · 18 · 20 · 26 · 30  | the narrower pane of a split               |
 * | --page-document-padding-start · -end       | 2 · 4rem                | above and below a document's column        |
 *
 * One number is not a token: the width below which a split collapses (PAGE_SPLIT_MIN_REM). A container query cannot
 * read a custom property.
 */

export type Gutter = "none" | "sm" | "md" | "lg" | "xl";
export type Gap = "none" | "xs" | "sm" | "md" | "lg" | "xl";
export type Measure = "sm" | "md" | "lg";
export type AsideWidth = "xs" | "sm" | "md" | "lg" | "xl";

/** The gutter on every side */
export const GUTTER: Record<Gutter, string> = {
    none: "",
    sm: "p-[var(--page-gutter-sm,1rem)]",
    md: "p-[var(--page-gutter-md,1.5rem)]",
    lg: "p-[var(--page-gutter-lg,2rem)]",
    xl: "p-[var(--page-gutter-xl,2.5rem)]",
};

/**
 * The gutter on the two sides only: the block padding comes from somewhere else — a document's own padding, or a
 * band's. A page with `gutter="none"` has no room of its own; the bands that stand on its edge (PageBar, FilterBar,
 * IconToolbar, CalendarToolbar, a row of tabs) take this, so a flush page moves with the gutter like any other.
 */
export const GUTTER_INLINE: Record<Gutter, string> = {
    none: "",
    sm: "px-[var(--page-gutter-sm,1rem)]",
    md: "px-[var(--page-gutter-md,1.5rem)]",
    lg: "px-[var(--page-gutter-lg,2rem)]",
    xl: "px-[var(--page-gutter-xl,2.5rem)]",
};

export const GAP: Record<Gap, string> = {
    none: "",
    xs: "gap-[var(--page-gap-xs,0.75rem)]",
    sm: "gap-[var(--page-gap-sm,1rem)]",
    md: "gap-[var(--page-gap-md,1.5rem)]",
    lg: "gap-[var(--page-gap-lg,2rem)]",
    xl: "gap-[var(--page-gap-xl,2.5rem)]",
};

/** The widest a reading column gets. Put it on the column itself, or on a block that is the column (Prose). */
export const MEASURE: Record<Measure, string> = {
    sm: "max-w-[var(--page-measure-sm,48rem)]",
    md: "max-w-[var(--page-measure-md,52rem)]",
    lg: "max-w-[var(--page-measure-lg,64rem)]",
};

/**
 * The width of the narrower pane of a split. Put it on a block that is the pane (a table of contents, a column of
 * examples); a PageAside takes it through `width`. The width holds while the page is wide enough for two panes
 * (PAGE_SPLIT_MIN_REM); below that the pane is as wide as the page, wherever its split puts it.
 */
export const ASIDE_WIDTH: Record<AsideWidth, string> = {
    xs: "w-full @4xl/page:w-[var(--page-aside-xs,14rem)] @4xl/page:shrink-0",
    sm: "w-full @4xl/page:w-[var(--page-aside-sm,18rem)] @4xl/page:shrink-0",
    md: "w-full @4xl/page:w-[var(--page-aside-md,20rem)] @4xl/page:shrink-0",
    lg: "w-full @4xl/page:w-[var(--page-aside-lg,26rem)] @4xl/page:shrink-0",
    xl: "w-full @4xl/page:w-[var(--page-aside-xl,30rem)] @4xl/page:shrink-0",
};

/**
 * A split stands side by side while its page is at least this wide: 56rem, Tailwind's `@4xl`. It is the page's own
 * width (the frame is a container), not the viewport's, so collapsing the sidebar gives the room back. The classes
 * of the frames spell the variant out (`@4xl/page:` · `@max-4xl/page:`); this number is for the script that has to
 * agree with them.
 */
export const PAGE_SPLIT_MIN_REM = 56;

/** On a pane that is not needed when the page is narrow (a table of contents): it is not drawn there */
export const ASIDE_NARROW_HIDDEN = "@max-4xl/page:hidden";

/** Above and below a document's column */
export const DOCUMENT_PADDING = "pt-[var(--page-document-padding-start,2rem)] pb-[var(--page-document-padding-end,4rem)]";

/**
 * The tokens above as data, for what lists them or lets someone try them (the preview's `?frames` panel, a docs
 * page). They are read out of the class strings, so the list cannot disagree with what the frames read. `max` and
 * `step` are a sensible range for a slider, in rem.
 */
export type FrameToken = { name: string; rem: number };
export type FrameTokenGroup = { id: string; title: string; hint: string; max: number; step: number; tokens: FrameToken[] };

const tokensIn = (classes: string[]): FrameToken[] =>
{
    const found = new Map<string, FrameToken>();

    for (const text of classes)
    {
        for (const match of text.matchAll(/var\((--page-[a-z-]+),([0-9.]+)rem\)/g)) found.set(match[1], { name: match[1], rem: Number(match[2]) });
    }

    return [...found.values()];
};

export const FRAME_TOKEN_GROUPS: FrameTokenGroup[] = [
    { id: "gutter", title: "Gutter", hint: "between a page and its edge", max: 5, step: 0.25, tokens: tokensIn(Object.values(GUTTER)) },
    { id: "gap", title: "Gap", hint: "between the blocks of a page", max: 5, step: 0.25, tokens: tokensIn(Object.values(GAP)) },
    { id: "measure", title: "Measure", hint: "the widest a reading column gets", max: 90, step: 1, tokens: tokensIn(Object.values(MEASURE)) },
    { id: "aside", title: "Aside", hint: "the narrower pane of a split", max: 40, step: 1, tokens: tokensIn(Object.values(ASIDE_WIDTH)) },
    { id: "document", title: "Document padding", hint: "above and below a document", max: 8, step: 0.25, tokens: tokensIn([DOCUMENT_PADDING]) },
];
