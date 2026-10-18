import type { ReactNode } from "react";

import { cn } from "@hathway/ui/lib/utils";

/**
 * An outline with the system's corners around a bare table (DataTable) that stands on the page or in an article
 * instead of in a card. For a table with a toolbar and a footer use DataTableCard.
 */
export const TableFrame = ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={cn("overflow-hidden rounded-[var(--radius-lg)] border border-border", className)}>{children}</div>
);
