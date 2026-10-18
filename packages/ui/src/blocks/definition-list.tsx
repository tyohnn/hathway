import type { ReactNode } from "react";

import { Badge } from "@hathway/ui/components/badge";
import { BODY, MUTED_BODY } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type Definition = {
    id: string;
    /** What is defined, as a badge: a status code, a key, an error type */
    badge: ReactNode;
    /** Its name, on one line */
    term: ReactNode;
    description: ReactNode;
};

/**
 * An outlined list of short definitions with a hairline between them: a code or key as a badge, its name, and what
 * it means. `loading` draws `loadingRows` rows in the same outline: an empty badge and bars for the name and the meaning.
 */
export const DefinitionList = ({
    items = [],
    loading,
    loadingRows = 4,
    className,
}: {
    items?: readonly Definition[];
    loading?: boolean;
    /** How many rows to draw while loading */
    loadingRows?: number;
    className?: string;
}) => (
    <ul {...pendingFrame(loading)} className={cn("m-0 flex list-none flex-col rounded-[var(--radius-lg)] border border-border p-0", className)}>
        {loading && Array.from({ length: loadingRows }, (_, index) => (
            <li key={index} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border px-4 py-3 first:border-t-0">
                <Badge variant="outline"><PendingText length={3} /></Badge>
                <span className={cn(BODY, "font-medium whitespace-nowrap")}><PendingText length={12} /></span>
                <span className={cn(MUTED_BODY, "min-w-0 flex-1")}><PendingText length={40} /></span>
            </li>
        ))}
        {!loading && items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border px-4 py-3 first:border-t-0">
                {item.badge}
                <span className={cn(BODY, "font-medium whitespace-nowrap")}>{item.term}</span>
                <span className={cn(MUTED_BODY, "min-w-0 flex-1")}>{item.description}</span>
            </li>
        ))}
    </ul>
);
