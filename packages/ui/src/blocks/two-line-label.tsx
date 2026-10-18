import type { ReactNode } from "react";

import { PendingText } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A name over a caption, each on one line: a product and its section, a count and what it counts. `loading` draws
 * bars for both lines. Like Person it is as wide as its words, so it marks no frame of its own.
 */
export const TwoLineLabel = ({ title, subtitle, loading, className }: { title?: ReactNode; subtitle?: ReactNode; loading?: boolean; className?: string }) => (
    <div className={cn("flex min-w-0 flex-col whitespace-nowrap", className)}>
        <span className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground" style={{ fontWeight: "var(--ui-font-weight)" }}>{loading ? <PendingText length={10} /> : title}</span>
        <span className="text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)] text-muted-foreground">{loading ? <PendingText length={14} /> : subtitle}</span>
    </div>
);
