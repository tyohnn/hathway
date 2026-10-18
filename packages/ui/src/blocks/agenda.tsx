"use client";

import { type ReactNode, useState } from "react";

import { Badge } from "@hathway/ui/components/badge";
import { Checkbox } from "@hathway/ui/components/checkbox";
import { BODY, NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type AgendaItem = {
    title: string;
    /** Who leads the item; hidden on a narrow screen */
    owner?: ReactNode;
    /** The timebox, as a badge ("10 min") */
    duration?: ReactNode;
    /** Covered at first; the agenda keeps the state from then on */
    done?: boolean;
};

/**
 * A meeting's agenda as an outlined, numbered list: a checkbox to mark an item covered (its title goes muted),
 * who leads it and its timebox. `loading` draws `loadingRows` numbered rows with a checkbox that cannot be ticked,
 * bars for the title and the owner, and an empty timebox badge.
 */
export const Agenda = ({
    items = [],
    checkboxLabel,
    loading,
    loadingRows = 4,
    className,
}: {
    items?: readonly AgendaItem[];
    /** The accessible name of an item's checkbox */
    checkboxLabel: (item: AgendaItem) => string;
    loading?: boolean;
    /** How many rows to draw while loading */
    loadingRows?: number;
    className?: string;
}) =>
{
    const [done, setDone] = useState<readonly string[]>(() => items.filter((item) => item.done).map((item) => item.title));

    return (
        <ol {...pendingFrame(loading)} className={cn("flex flex-col rounded-[var(--radius-lg)] border border-border", className)}>
            {loading && Array.from({ length: loadingRows }, (_, index) => (
                <li key={index} className="flex items-center gap-3 border-t border-border px-3 py-2.5 first:border-t-0">
                    <Checkbox disabled aria-hidden tabIndex={-1} />
                    <span className="min-w-5 text-[length:var(--ui-text-sm)] text-muted-foreground tabular-nums">{index + 1}</span>
                    <span className={cn(BODY, "min-w-0 flex-1 text-foreground")}><PendingText length={30} /></span>
                    <span className={cn(NOTE, "hidden shrink-0 sm:inline")}><PendingText length={12} /></span>
                    <Badge variant="outline"><PendingText length={6} /></Badge>
                </li>
            ))}
            {!loading && items.map((item, index) => (
                <li key={item.title} className="flex items-center gap-3 border-t border-border px-3 py-2.5 first:border-t-0">
                    <Checkbox
                        checked={done.includes(item.title)}
                        onCheckedChange={(checked) => setDone(checked ? [...done, item.title] : done.filter((title) => title !== item.title))}
                        aria-label={checkboxLabel(item)}
                    />
                    <span className="min-w-5 text-[length:var(--ui-text-sm)] text-muted-foreground tabular-nums">{index + 1}</span>
                    <span className={cn(BODY, "min-w-0 flex-1", done.includes(item.title) ? "text-muted-foreground" : "text-foreground")}>{item.title}</span>
                    {item.owner !== undefined && <span className={cn(NOTE, "hidden shrink-0 sm:inline")}>{item.owner}</span>}
                    {item.duration !== undefined && <Badge variant="outline">{item.duration}</Badge>}
                </li>
            ))}
        </ol>
    );
};
