import type { ReactNode } from "react";

import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A short note behind a small icon, in running text that may wrap: when something happened, what a list is synced
 * with. For a one-line figure that lines up with others (a count, an expiry) use IconMeta.
 */
export const IconNote = ({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) => (
    <span className={cn(NOTE, "flex items-center gap-1 [&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0", className)}>{icon}{children}</span>
);
