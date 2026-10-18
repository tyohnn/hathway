import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@hathway/ui/components/avatar";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@hathway/ui/components/item";
import { IconNote } from "@hathway/ui/blocks/icon-note";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type ActivityEntry = {
    id: string;
    /** Who did it */
    name: ReactNode;
    initials: string;
    image?: string;
    /** What they did, as the rest of the sentence ("moved ATL-151 to In review") */
    action: ReactNode;
    /** When, already formatted ("12 min ago") */
    when: ReactNode;
};

/**
 * What happened lately, newest first: who, what they did and when, one entry per row. `whenIcon` is the small
 * icon before each time. It is the bare list — put it in a card (InfoCard) that scrolls. `loading` draws
 * `loadingRows` entries: an avatar without initials, bars for who and what, and a bar behind the time's icon.
 */
export const ActivityFeed = ({
    entries = [],
    whenIcon,
    loading,
    loadingRows = 5,
    className,
}: {
    entries?: readonly ActivityEntry[];
    whenIcon: ReactNode;
    loading?: boolean;
    /** How many entries to draw while loading */
    loadingRows?: number;
    className?: string;
}) => (
    <ItemGroup {...pendingFrame(loading)} className={cn("gap-0", className)}>
        {loading && Array.from({ length: loadingRows }, (_, index) => (
            <Item key={index} role="listitem" size="xs" className="px-0">
                <ItemMedia>
                    <Avatar size="sm">
                        <AvatarFallback />
                    </Avatar>
                </ItemMedia>
                <ItemContent>
                    <ItemTitle><span><PendingText length={12} /></span></ItemTitle>
                    <ItemDescription><PendingText length={28} /></ItemDescription>
                </ItemContent>
                <ItemActions>
                    <IconNote icon={whenIcon}><span><PendingText length={8} /></span></IconNote>
                </ItemActions>
            </Item>
        ))}
        {!loading && entries.map((entry) => (
            <Item key={entry.id} role="listitem" size="xs" className="px-0">
                <ItemMedia>
                    <Avatar size="sm">
                        {entry.image !== undefined && <AvatarImage src={entry.image} alt="" />}
                        <AvatarFallback>{entry.initials}</AvatarFallback>
                    </Avatar>
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>{entry.name}</ItemTitle>
                    <ItemDescription>{entry.action}</ItemDescription>
                </ItemContent>
                <ItemActions>
                    <IconNote icon={whenIcon}>{entry.when}</IconNote>
                </ItemActions>
            </Item>
        ))}
    </ItemGroup>
);
