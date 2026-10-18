import { Fragment, type ReactNode } from "react";

import { Plus } from "@hathway/ui/icons";

import { Badge } from "@hathway/ui/components/badge";
import { Button } from "@hathway/ui/components/button";
import { KanbanCard } from "@hathway/ui/blocks/kanban-card";
import { BODY } from "@hathway/ui/blocks/lib/copy";
import { BARS_ON_MUTED, PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";
import { strings } from "@hathway/ui/strings";

export type KanbanColumn = {
    id: string;
    title: string;
    /** The icon of the column's state, before the title */
    icon?: ReactNode;
    /** How many items the column holds */
    count?: ReactNode;
    /** The column's add button: shown when either is given; `addLabel` names it ("Add to Backlog"), the locale's own words when left out */
    addLabel?: string;
    onAdd?: () => void;
    /** The column's cards (KanbanCard), and whatever ends the list: a "show more" button */
    cards?: ReactNode;
};

/**
 * A board of columns side by side, one per state, each a muted surface with its name and count on top and its
 * cards scrolling inside. The columns share the width equally and the board scrolls sideways when they run out
 * of it, so it never widens the page. Give it a height (it fills a flex column). `loading` keeps the columns the
 * caller passes — their surface, icon and add button — or draws `loadingColumns` of them, with a bar for each name,
 * an empty count badge and `loadingCards` waiting cards (`pending`) in each.
 */
export const KanbanBoard = ({
    columns,
    loading,
    loadingColumns = 4,
    loadingCards = 3,
    pending = <KanbanCard loading code badges />,
    className,
}: {
    columns?: readonly KanbanColumn[];
    loading?: boolean;
    /** How many columns to draw while loading when no `columns` are passed */
    loadingColumns?: number;
    /** How many waiting cards each column holds while loading */
    loadingCards?: number;
    /** A card's own waiting face: a KanbanCard `loading` with the parts the board's cards have */
    pending?: ReactNode;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex min-h-0 flex-1 gap-3 overflow-x-auto", className)}>
        {(columns ?? (loading ? Array.from({ length: loadingColumns }, (_, index): KanbanColumn => ({ id: String(index), title: "", count: null })) : [])).map((column) => (
            <section key={column.id} className="flex min-h-0 min-w-64 flex-1 basis-0 flex-col gap-3 rounded-[var(--radius-xl)] bg-muted p-2" aria-label={loading ? undefined : column.title}>
                <div className={cn("flex items-center gap-2 px-1 pt-1 [&>svg]:size-[var(--control-icon-size-lg)] [&>svg]:text-muted-foreground", BARS_ON_MUTED)}>
                    {column.icon}
                    <span className={cn(BODY, "font-medium text-foreground")}>{loading ? <PendingText length={9} /> : column.title}</span>
                    {column.count !== undefined && <Badge variant="secondary">{loading ? <PendingText length={2} /> : column.count}</Badge>}
                    {(column.addLabel !== undefined || column.onAdd !== undefined) && <Button variant="ghost" size="icon-xs" className="ml-auto" aria-label={column.addLabel ?? strings.blocks.kanban.add} onClick={column.onAdd}><Plus /></Button>}
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">{loading ? Array.from({ length: loadingCards }, (_, index) => <Fragment key={index}>{pending}</Fragment>) : column.cards}</div>
            </section>
        ))}
    </div>
);
