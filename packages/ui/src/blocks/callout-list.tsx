import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@hathway/ui/components/alert";
import { BULLETS } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A callout that lists a few points under its title: the decisions of a meeting, what changes, what to check.
 * `loading` keeps the icon and draws a bar for the title and `count` bullets with a bar each.
 */
export const CalloutList = ({
    icon,
    title,
    items = [],
    loading,
    count = 3,
    className,
}: {
    icon?: ReactNode;
    title?: ReactNode;
    items?: readonly ReactNode[];
    loading?: boolean;
    /** How many points to draw while loading */
    count?: number;
    className?: string;
}) => (
    <Alert {...pendingFrame(loading)} className={className}>
        {icon}
        <AlertTitle>{loading ? <PendingText length={10} /> : title}</AlertTitle>
        <AlertDescription>
            <ul className={cn("flex flex-col gap-1", BULLETS)}>
                {loading && Array.from({ length: count }, (_, index) => <li key={index}><PendingText length={56} /></li>)}
                {!loading && items.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </AlertDescription>
    </Alert>
);
