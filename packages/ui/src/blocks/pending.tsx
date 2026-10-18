import { cn } from "@hathway/ui/lib/utils";

/**
 * The place of a text value before the value arrives. A block that is `loading` swaps only its value slots — a
 * title, a figure, a name — for this, and keeps its frame, so nothing moves when the value comes.
 *
 * - The bar's height is not a number: invisible glyphs fill it, so it is as tall as the slot's font size and sits
 *   in the middle of the line (`leading-none`, `align-middle`), inside the line box the text would make. The line
 *   keeps the height it has with text in it. Only the width is estimated, in characters (`length`).
 * - It is a `<span>`, so it fits wherever text does (a `<p>`, a heading, a table cell); the Skeleton component is
 *   a `<div>` and would not. It wears the same layer-3 class (`cn-skeleton`), so the system colours it.
 * - It is hidden from assistive technology; the block's own frame says `aria-busy` while it waits.
 */
export const PendingText = ({ length = 8, className }: { length?: number; className?: string }) => (
    <span data-slot="skeleton" aria-hidden className={cn("cn-skeleton inline-block max-w-full animate-pulse align-middle leading-none text-transparent select-none", className)}>
        {"0".repeat(length)}
    </span>
);

/** The attributes a block's frame carries while it waits */
export const pendingFrame = (loading: boolean | undefined) => (loading ? { "data-loading": "", "aria-busy": true as const } : {});

/**
 * For a surface on the muted colour (a code body, a file header, a board column, a hero band): the bars inside it
 * take the page background, because a system without a `--skeleton` of its own draws a bar in `--muted` and it
 * would vanish there.
 */
export const BARS_ON_MUTED = "[&_[data-slot=skeleton]]:bg-background";
