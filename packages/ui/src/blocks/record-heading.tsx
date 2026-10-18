import type { ReactNode } from "react";

import { HEADING_LG } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The head of one record's page — a pull request, an issue, a ticket: its title with the record's number after
 * it, a line of status under the title (a state badge, who and what, a reference), and the people and actions on
 * the other side. For a page that lists things use PageHeading. `loading` draws one bar for the title and its
 * number; the status line and the actions are the caller's and stay, so pass the status line's own waiting face.
 */
export const RecordHeading = ({
    title,
    number,
    status,
    actions,
    loading,
    className,
}: {
    title?: ReactNode;
    /** After the title, muted ("#482") */
    number?: ReactNode;
    /** The line under the title */
    status?: ReactNode;
    actions?: ReactNode;
    loading?: boolean;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}>
        <div className="flex min-w-0 flex-col gap-2">
            <h1 className={cn("m-0", HEADING_LG)}>
                {loading ? <PendingText length={24} /> : <>{title} {number !== undefined && <span className="font-normal text-muted-foreground">{number}</span>}</>}
            </h1>
            {status !== undefined && <div className="flex flex-wrap items-center gap-2">{status}</div>}
        </div>
        {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
);
