import type { ReactNode } from "react";

import { Badge } from "@hathway/ui/components/badge";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@hathway/ui/components/item";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type ActionItem = {
    id: string;
    icon: ReactNode;
    /** One line; a long one is cut with an ellipsis */
    title: string;
    description?: ReactNode;
    /** A line under the description: a badge, a meta line */
    extra?: ReactNode;
    /** Icon buttons stacked at the end of the item */
    actions?: ReactNode;
};

/**
 * A short list of outlined items, each with an icon, a title, a description and its own actions: pending invitations,
 * connected devices, open requests. `loading` draws `count` outlined items with bars for the title and the
 * description. A row whose item the caller already passed keeps that item's icon and actions, and an empty badge on
 * the extra line where it has one, so the row is as tall as it will be.
 */
export const ActionItemList = ({
    items = [],
    loading,
    count = 3,
    className,
}: {
    items?: readonly ActionItem[];
    loading?: boolean;
    /** How many items to draw while loading */
    count?: number;
    className?: string;
}) => (
    <ItemGroup {...pendingFrame(loading)} className={cn("gap-2", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <Item key={index} role="listitem" size="sm" variant="outline">
                {items[index] !== undefined && <ItemMedia variant="icon">{items[index].icon}</ItemMedia>}
                <ItemContent className="min-w-0">
                    <ItemTitle className="w-full min-w-0"><span className="block truncate"><PendingText length={20} /></span></ItemTitle>
                    <ItemDescription><PendingText length={28} /></ItemDescription>
                    {items[index]?.extra !== undefined && <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><Badge variant="outline"><PendingText length={8} /></Badge></div>}
                </ItemContent>
                {items[index]?.actions !== undefined && <ItemActions className="flex-col">{items[index].actions}</ItemActions>}
            </Item>
        ))}
        {!loading && items.map((item) => (
            <Item key={item.id} role="listitem" size="sm" variant="outline">
                <ItemMedia variant="icon">{item.icon}</ItemMedia>
                <ItemContent className="min-w-0">
                    <ItemTitle className="w-full min-w-0"><span className="block truncate">{item.title}</span></ItemTitle>
                    {item.description !== undefined && <ItemDescription>{item.description}</ItemDescription>}
                    {item.extra !== undefined && <div className="flex flex-wrap items-center gap-x-2 gap-y-1">{item.extra}</div>}
                </ItemContent>
                {item.actions !== undefined && <ItemActions className="flex-col">{item.actions}</ItemActions>}
            </Item>
        ))}
    </ItemGroup>
);
