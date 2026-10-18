/**
 * Text recipes the blocks share. Each reads system tokens only (the UI type scale, the font stacks, the semantic
 * colours), so a block's text changes with the design system and with nothing else.
 */

/** A page's title */
export const TITLE = "m-0 font-heading text-[length:var(--ui-text-lg)] leading-[var(--ui-line-height-lg)] font-semibold text-foreground";

/** Small secondary text on one line: a meta line, a count, a caption under a name */
export const META = "text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground tabular-nums whitespace-nowrap";

/** Figures that line up in a column or change in place */
export const FIGURE = "tabular-nums";

/** An identifier: order number, key, hash */
export const CODE = "font-mono whitespace-nowrap";

/** A figure that stands on its own: a count over its label */
export const BIG_FIGURE = "font-heading text-[length:var(--ui-text-lg)] leading-[var(--ui-line-height-lg)] font-semibold tabular-nums text-foreground";
