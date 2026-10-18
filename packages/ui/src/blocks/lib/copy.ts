/**
 * Text recipes for running text and labels, next to the one-line recipes of `text.ts`. Each reads system tokens
 * only (the UI type scale and the semantic colours). Unlike META these do not force one line or tabular figures:
 * add `whitespace-nowrap` or `tabular-nums` where the text needs it.
 */

/** Small secondary text that may wrap or be cut: a note, a hint, a recipient line, a caption with words in it */
export const NOTE = "text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground";

/** The small step of the UI type scale */
export const SMALL = "text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)]";

/** The body step of the UI type scale: a row's title, a name in a list */
export const BODY = "text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)]";

/** A paragraph at the body step with no margin of its own: a comment, a message */
export const PARAGRAPH = "m-0 text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)]";

/** Secondary text at the body step: a caption beside a control, a sentence in a list */
export const MUTED_BODY = "text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-muted-foreground";

/** A sentence of supporting text under a heading (MUTED_BODY with no margin of its own) */
export const LEAD = "m-0 text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-muted-foreground";

/** The name of a row in a short list: a request, a service */
export const ROW_LABEL = "text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] font-medium";

/** The smallest text, with figures that line up: an hour on an axis, a gutter label */
export const CAPTION = "text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)] text-muted-foreground tabular-nums";

/** A line of text behind a small icon; goes with NOTE or BODY */
export const ICON_LINE = "flex items-center gap-1.5 [&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0";

/**
 * Titles on the system's heading scale (`--heading-font-size-*` · `--heading-line-height-*` ·
 * `--heading-letter-spacing`, in the heading stack): `lg` is a route's or a record's title, `xl` the title of a
 * screen that stands on its own — a hero, a document.
 */
export const HEADING_LG = "font-heading text-[length:var(--heading-font-size-lg)] leading-[var(--heading-line-height-lg)] tracking-[var(--heading-letter-spacing)] font-semibold";

export const HEADING_XL = "font-heading text-[length:var(--heading-font-size-xl)] leading-[var(--heading-line-height-xl)] tracking-[var(--heading-letter-spacing)] font-semibold";

/** A leading figure at the size of a route title: the value of a stat card */
export const FIGURE_LG = "text-[length:var(--heading-font-size-lg)] leading-[var(--heading-line-height-lg)]";

/** An identifier inside text or a table cell, in the mono stack at the small size */
export const INLINE_CODE = "font-mono text-[length:var(--ui-text-sm)]";

/** A bulleted list outside the typeset: in a callout, in a card */
export const BULLETS = "list-disc pl-[1.1rem]";

/** A component set in the flow of Prose: it leaves the typeset rules and takes the flow's space above it */
export const IN_PROSE = "not-typeset mt-5";
