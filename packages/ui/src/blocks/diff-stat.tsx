import type { ReactNode } from "react";

import { PendingText } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

const KIND = { add: "text-success", del: "text-destructive" } as const;

/**
 * A count of added or removed lines in mono, in the system's success or destructive colour ("+17", "−6").
 * `loading` draws a bar for the count. It is a word in someone else's line, so it carries no frame of its own.
 */
export const DiffStat = ({ kind, loading, children, className }: { kind: keyof typeof KIND; loading?: boolean; children?: ReactNode; className?: string }) => (
    <span className={cn("font-mono text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)]", KIND[kind], className)}>{loading ? <PendingText length={3} /> : children}</span>
);
