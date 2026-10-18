import type { ReactNode } from "react";

import { TOOLBAR_BAND } from "@hathway/ui/blocks/lib/bands";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The band at the top of a card that is a workspace rather than a table: what the card is showing on one side (a
 * picker, a status badge), what can be done with it on the other (a view switch, share). Wraps when it runs out of
 * width. For tabs or table filters in the band use TabCard or DataTableCard.
 */
export const CardToolbar = ({ children, actions, className }: { /** The start of the band */ children?: ReactNode; actions?: ReactNode; className?: string }) => (
    <div className={cn(TOOLBAR_BAND, className)}>
        <div className="flex min-w-0 items-center gap-2">{children}</div>
        {actions !== undefined && <div className="flex min-w-0 flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
);
