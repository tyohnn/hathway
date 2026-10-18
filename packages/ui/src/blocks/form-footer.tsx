import type { ReactNode } from "react";

import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The foot of a form that scrolls: a note (when it was last saved) and the buttons, staying at the bottom of the
 * scrolling pane over a hairline. Inside a padded pane, pull it over the padding with `className`
 * (`-bottom-4 pb-4` for a pane with `p-4`).
 *
 * The footer does not name a surface colour of its own. It reads the surface it floats on: the system's glass
 * fill where floating surfaces are glass (with its own blur, which hides the form scrolling under it — the
 * panel's blur hides what is behind the panel), and the popover colour everywhere else, where the filter is none.
 */
export const FormFooter = ({ note, children, className }: { note?: ReactNode; /** The buttons */ children?: ReactNode; className?: string }) => (
    <div
        className={cn(
            "sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-[color:var(--glass-fill,var(--popover))] pt-3 pb-3 supports-[backdrop-filter:blur(1px)]:[backdrop-filter:var(--glass-filter,none)]",
            className,
        )}
    >
        {note !== undefined && <span className={NOTE}>{note}</span>}
        <div className="flex items-center gap-2">{children}</div>
    </div>
);
