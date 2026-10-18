import type { ReactNode } from "react";

import { META } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

/** One line of meta text behind a small icon: when something expires, where it is, how long it takes. */
export const IconMeta = ({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) => (
    <span className={cn(META, "flex items-center gap-1 [&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0", className)}>{icon}{children}</span>
);
