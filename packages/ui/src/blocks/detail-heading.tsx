import type { ReactNode } from "react";

import { HEADING_LG, NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The head of a page about one thing — a project, an account, a release: its name in the large size with its
 * status beside it, a description that may run over lines, and the people and actions on the other side. For the
 * head of a list page (a title and one meta line) use PageHeading. `loading` draws bars for the title and the
 * description and leaves the status badge out; the people and actions on the other side stay.
 */
export const DetailHeading = ({
    title,
    status,
    description,
    actions,
    loading,
    className,
}: {
    title?: ReactNode;
    /** A badge next to the title */
    status?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    /** The waiting face: a description that was passed (any value) keeps its line */
    loading?: boolean;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}>
        <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
                <h1 className={cn("m-0", HEADING_LG)}>{loading ? <PendingText length={16} /> : title}</h1>
                {!loading && status}
            </div>
            {description !== undefined && <p className={NOTE}>{loading ? <PendingText length={48} /> : description}</p>}
        </div>
        {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
);
