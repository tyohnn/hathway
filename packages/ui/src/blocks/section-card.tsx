import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A titled card for a section of a page's main column: the title with one line of description, an action in the
 * corner, the content, and a footer with a note — behind an icon, or with an action at the other end. For a small
 * card in a side column use InfoCard. `loading` draws bars for the title, the description and the footer's note;
 * the corner, the content and the footer's icon and action are the caller's.
 */
export const SectionCard = ({
    title,
    description,
    action,
    footerIcon,
    footerNote,
    footerAction,
    children,
    loading,
    className,
    contentClassName,
}: {
    title?: ReactNode;
    description?: ReactNode;
    /** The header's corner: a button or a badge */
    action?: ReactNode;
    /** An icon before the footer's note */
    footerIcon?: ReactNode;
    /** The footer's line: a summary of the content, or where else to turn */
    footerNote?: ReactNode;
    /** The footer's other end: a button */
    footerAction?: ReactNode;
    children?: ReactNode;
    /** The waiting face: a description and a footer note that were passed (any value) keep their lines */
    loading?: boolean;
    className?: string;
    contentClassName?: string;
}) => (
    <Card {...pendingFrame(loading)} className={className}>
        <CardHeader>
            <CardTitle>{loading ? <PendingText length={16} /> : title}</CardTitle>
            {description !== undefined && <CardDescription>{loading ? <PendingText length={32} /> : description}</CardDescription>}
            {action !== undefined && <CardAction>{action}</CardAction>}
        </CardHeader>
        {children !== undefined && <CardContent className={contentClassName}>{children}</CardContent>}
        {(footerNote !== undefined || footerAction !== undefined) && (
            <CardFooter className={cn("gap-2 [&>svg]:size-[var(--control-icon-size-lg)] [&>svg]:shrink-0 [&>svg]:text-muted-foreground", footerAction !== undefined && "mt-auto justify-between")}>
                {footerIcon}
                {footerNote !== undefined && <span className={NOTE}>{loading ? <PendingText length={28} /> : footerNote}</span>}
                {footerAction}
            </CardFooter>
        )}
    </Card>
);
