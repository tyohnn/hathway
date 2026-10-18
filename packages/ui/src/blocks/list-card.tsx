import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A card that fills the height it is given and holds a list: the title, one line of description and the list's
 * controls in a header over a divider, and the list running edge to edge and scrolling inside. Put a TaskList or
 * any list of full-width rows in it; for a table use DataTableCard. `loading` draws bars for the title and the
 * description; the controls stay, and the list is the caller's, which passes `loading` to it.
 */
export const ListCard = ({
    title,
    description,
    controls,
    children,
    loading,
    className,
}: {
    title?: ReactNode;
    description?: ReactNode;
    /** The header's corner: a view switch, a filter button */
    controls?: ReactNode;
    children?: ReactNode;
    /** The waiting face: a description that was passed (any value) keeps its line */
    loading?: boolean;
    className?: string;
}) => (
    <Card {...pendingFrame(loading)} className={cn("min-h-0 min-w-0 flex-1 gap-0", className)}>
        <CardHeader className="border-b border-border">
            <CardTitle>{loading ? <PendingText length={12} /> : title}</CardTitle>
            {description !== undefined && <CardDescription>{loading ? <PendingText length={28} /> : description}</CardDescription>}
            {controls !== undefined && <CardAction className="flex items-center gap-1.5">{controls}</CardAction>}
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto px-0">{children}</CardContent>
    </Card>
);
