import type { ReactNode } from "react";

import { Badge } from "@hathway/ui/components/badge";
import { HEADING_XL } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The head of one endpoint in an API reference: the method as a badge with the path in the mono stack and an
 * action beside it (copy), the endpoint's name as the page title, then what it does and what can be done with
 * it (prose, buttons) as children. `loading` draws bars for the method inside its badge, the path and the title;
 * the action after the path and the children, which the caller writes, stay.
 */
export const EndpointHeader = ({
    method,
    path,
    pathAction,
    title,
    loading,
    children,
    className,
}: {
    method?: ReactNode;
    path?: ReactNode;
    /** After the path: a copy button */
    pathAction?: ReactNode;
    title?: ReactNode;
    loading?: boolean;
    children?: ReactNode;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-col gap-4", className)}>
        <div className="flex flex-wrap items-center gap-2">
            <Badge>{loading ? <PendingText length={4} /> : method}</Badge>
            <code className="min-w-0 font-mono text-[length:var(--ui-text-md)] [overflow-wrap:anywhere]">{loading ? <PendingText length={32} /> : path}</code>
            {pathAction}
        </div>
        <h1 className={cn("m-0", HEADING_XL)}>{loading ? <PendingText length={16} /> : title}</h1>
        {children}
    </div>
);
