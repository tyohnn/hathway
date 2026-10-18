import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A small titled card for a side column: the title with one line of description, an action or a badge in the
 * corner, the content, and buttons in the footer. The content is a column with the card's own gap. `loading`
 * draws bars for the title and the description; the corner, the content and the footer are the caller's, which
 * passes `loading` to the blocks inside.
 */
export const InfoCard = ({
    title,
    description,
    action,
    footer,
    children,
    loading,
    descriptionLines = 1,
    className,
    contentClassName,
}: {
    title?: ReactNode;
    description?: ReactNode;
    /** The header's corner: a badge or an icon button */
    action?: ReactNode;
    /** Buttons under the content */
    footer?: ReactNode;
    children?: ReactNode;
    /** The waiting face: a description that was passed (any value) keeps its line */
    loading?: boolean;
    /** How many lines the description is known to take, for its waiting face; a bar does not wrap */
    descriptionLines?: number;
    className?: string;
    contentClassName?: string;
}) => (
    <Card {...pendingFrame(loading)} size="sm" className={cn("shrink-0", className)}>
        <CardHeader>
            <CardTitle>{loading ? <PendingText length={14} /> : title}</CardTitle>
            {description !== undefined && <CardDescription>{loading ? Array.from({ length: descriptionLines }, (_, index) => <span key={index} className="block"><PendingText length={index === 0 ? 28 : 14} /></span>) : description}</CardDescription>}
            {action !== undefined && <CardAction>{action}</CardAction>}
        </CardHeader>
        {children !== undefined && <CardContent className={contentClassName}>{children}</CardContent>}
        {footer !== undefined && <CardFooter className="flex flex-wrap gap-2">{footer}</CardFooter>}
    </Card>
);
