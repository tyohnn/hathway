import type { ReactNode } from "react";

import { cn } from "@hathway/ui/lib/utils";

const SIZE = { md: "text-[length:var(--ui-text-md)]", lg: "text-[length:var(--ui-text-lg)]" } as const;

/**
 * Written text on the system's typeset: headings, paragraphs, lists, quotes and inline code take the system's
 * reading rhythm. `preset="tool"` is text inside a product screen (docs, a release post, notes, a mail's body, a
 * chat reply), `document` a page that is read on its own. `size` sets the text at a UI text step instead of the
 * typeset's own size. It is as wide as the place it is put in — give it a measure with `className`
 * (`max-w-[72ch]`). A component set in the text carries `IN_PROSE` (lib/copy.ts) so the typeset rules leave it alone.
 */
export const Prose = ({
    as: Tag = "div",
    preset = "tool",
    size,
    children,
    className,
}: {
    as?: "div" | "article" | "section";
    preset?: "tool" | "document";
    size?: keyof typeof SIZE;
    children: ReactNode;
    className?: string;
}) => (
    <Tag className={cn("typeset", preset === "tool" && "typeset-tool", "mx-0 max-w-none [&>:first-child]:mt-0", size !== undefined && SIZE[size], className)}>{children}</Tag>
);
