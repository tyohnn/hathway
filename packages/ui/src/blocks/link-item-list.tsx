import type { ReactNode } from "react";

import { ArrowRight, ChevronRight } from "@hathway/ui/icons";

import { Badge } from "@hathway/ui/components/badge";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@hathway/ui/components/item";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type LinkItem = {
    id: string;
    href: string;
    icon?: ReactNode;
    title: ReactNode;
    /** A badge after the title ("New", "Updated") */
    badge?: ReactNode;
    /** One line under the title: where it belongs, how long it is, when it changed */
    description?: ReactNode;
};

/**
 * A list of outlined items that each open something: an optional icon, the title with a badge, one line of detail
 * and a chevron or an arrow at the end; the whole item is the link. Use it for articles, documents, earlier
 * releases or search results. For items that carry their own buttons use ActionItemList. `loading` draws `count`
 * outlined items that are not links yet, with bars for the title and the detail and the same chevron or arrow. A row
 * whose item the caller already passed keeps that item's icon and an empty badge where it has one, so the row is as
 * tall as it will be.
 */
export const LinkItemList = ({
    items = [],
    trailing = "chevron",
    loading,
    count = 5,
    className,
}: {
    items?: readonly LinkItem[];
    trailing?: "chevron" | "arrow";
    loading?: boolean;
    /** How many items to draw while loading */
    count?: number;
    className?: string;
}) =>
{
    const Trailing = trailing === "arrow" ? ArrowRight : ChevronRight;

    return (
        <ItemGroup {...pendingFrame(loading)} className={cn("gap-2", className)}>
            {loading && Array.from({ length: count }, (_, index) => (
                <Item key={index} size="sm" variant="outline">
                    {items[index]?.icon !== undefined && <ItemMedia variant="icon">{items[index].icon}</ItemMedia>}
                    <ItemContent>
                        <ItemTitle>
                            <span><PendingText length={32} /></span>
                            {items[index]?.badge != null && <Badge variant="outline"><PendingText length={5} /></Badge>}
                        </ItemTitle>
                        <ItemDescription><PendingText length={36} /></ItemDescription>
                    </ItemContent>
                    <ItemActions><Trailing className="size-[var(--control-icon-size-lg)] shrink-0 text-muted-foreground" /></ItemActions>
                </Item>
            ))}
            {!loading && items.map((item) => (
                <Item key={item.id} size="sm" variant="outline" render={<a href={item.href} />}>
                    {item.icon !== undefined && <ItemMedia variant="icon">{item.icon}</ItemMedia>}
                    <ItemContent>
                        <ItemTitle>
                            {item.title}
                            {item.badge}
                        </ItemTitle>
                        {item.description !== undefined && <ItemDescription>{item.description}</ItemDescription>}
                    </ItemContent>
                    <ItemActions><Trailing className="size-[var(--control-icon-size-lg)] shrink-0 text-muted-foreground" /></ItemActions>
                </Item>
            ))}
        </ItemGroup>
    );
};
