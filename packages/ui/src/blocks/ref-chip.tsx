import type { ReactNode } from "react";

import { BARS_ON_MUTED, PendingText } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A reference in mono type on a muted chip: a branch and where it merges, a tag, a commit. Icons inside are drawn
 * small. `loading` keeps the chip and draws one bar for what it names, in the page colour: on the chip's muted
 * ground a system whose skeleton colour is its muted colour would draw nothing. It is a word in someone else's
 * line, so it carries no frame of its own.
 */
export const RefChip = ({ loading, children, className }: { loading?: boolean; children?: ReactNode; className?: string }) => (
    <span
        className={cn(
            "flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted px-1.5 font-mono text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] [&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0",
            BARS_ON_MUTED,
            className,
        )}
    >
        {loading ? <PendingText length={20} /> : children}
    </span>
);
