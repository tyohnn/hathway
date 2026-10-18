import type { ReactNode } from "react";

import { ChevronRight } from "@hathway/ui/icons";

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type Topic = {
    id: string;
    icon: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    /** The line in the footer: how much is inside ("42 articles") */
    meta?: ReactNode;
    metaIcon?: ReactNode;
};

/**
 * A grid of small cards that each lead into a topic: an icon tile, the topic's name and what it covers, and in
 * the footer how much is inside, with a chevron. Two columns on a medium screen, three on a wide one. Use it for
 * the categories of a help center, a catalogue or a settings index. `loading` draws `count` cards: the icon tile
 * empty, bars for the name, the description and the footer line, and the chevron.
 */
export const TopicCards = ({
    topics = [],
    loading,
    count = 6,
    className,
}: {
    topics?: readonly Topic[];
    loading?: boolean;
    /** How many cards to draw while loading */
    count?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <Card key={index} size="sm">
                <CardHeader>
                    <div className="mb-2 flex size-9 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-muted text-foreground [&_svg]:size-[18px]" />
                    <CardTitle><PendingText length={14} /></CardTitle>
                    <CardDescription><PendingText length={32} /></CardDescription>
                </CardHeader>
                <CardFooter className="justify-between gap-2">
                    <span className={cn(NOTE, "flex items-center gap-1.5 [&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0")}><span><PendingText length={10} /></span></span>
                    <ChevronRight className="size-[var(--control-icon-size-lg)] shrink-0 text-muted-foreground" />
                </CardFooter>
            </Card>
        ))}
        {!loading && topics.map((topic) => (
            <Card key={topic.id} size="sm">
                <CardHeader>
                    <div className="mb-2 flex size-9 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-muted text-foreground [&_svg]:size-[18px]">{topic.icon}</div>
                    <CardTitle>{topic.title}</CardTitle>
                    {topic.description !== undefined && <CardDescription>{topic.description}</CardDescription>}
                </CardHeader>
                <CardFooter className="justify-between gap-2">
                    <span className={cn(NOTE, "flex items-center gap-1.5 [&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0")}>{topic.metaIcon}{topic.meta}</span>
                    <ChevronRight className="size-[var(--control-icon-size-lg)] shrink-0 text-muted-foreground" />
                </CardFooter>
            </Card>
        ))}
    </div>
);
