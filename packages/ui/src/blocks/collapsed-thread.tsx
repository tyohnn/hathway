import type { ReactNode } from "react";

import { ChevronDown } from "@hathway/ui/icons";

import { Avatar, AvatarFallback } from "@hathway/ui/components/avatar";
import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type CollapsedMessage = { id: string; name: string; initials: string; teaser: ReactNode; date: ReactNode };

/**
 * The earlier messages of a thread, folded to one row each: who wrote, the start of what they wrote, when. A row
 * is a button that opens its message (`onOpen`). Put it above the message that is open. `loading` draws `count`
 * rows with an empty avatar and bars for the name, the teaser and the date; a waiting row opens nothing.
 */
export const CollapsedThread = ({
    messages = [],
    onOpen,
    loading,
    count = 2,
    className,
}: {
    messages?: readonly CollapsedMessage[];
    onOpen?: (id: string) => void;
    loading?: boolean;
    /** How many rows to draw while loading */
    count?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <button
                key={index}
                type="button"
                disabled
                className="flex w-full items-center gap-3 bg-transparent px-3 py-2 text-left text-inherit [font:inherit] [&+&]:border-t [&+&]:border-border"
            >
                <Avatar size="sm">
                    <AvatarFallback />
                </Avatar>
                <span className="shrink-0 text-[length:var(--ui-text-md)] font-medium text-foreground"><PendingText length={11} /></span>
                <span className={cn(NOTE, "min-w-0 flex-1 truncate")}><PendingText length={64} /></span>
                <span className={cn(NOTE, "shrink-0")}><PendingText length={6} /></span>
                <ChevronDown className="size-[var(--control-icon-size-lg)] shrink-0 text-muted-foreground" />
            </button>
        ))}
        {!loading && messages.map((message) => (
            <button
                key={message.id}
                type="button"
                onClick={onOpen && (() => onOpen(message.id))}
                className="flex w-full items-center gap-3 bg-transparent px-3 py-2 text-left text-inherit [font:inherit] [&+&]:border-t [&+&]:border-border"
            >
                <Avatar size="sm">
                    <AvatarFallback>{message.initials}</AvatarFallback>
                </Avatar>
                <span className="shrink-0 text-[length:var(--ui-text-md)] font-medium text-foreground">{message.name}</span>
                <span className={cn(NOTE, "min-w-0 flex-1 truncate")}>{message.teaser}</span>
                <span className={cn(NOTE, "shrink-0")}>{message.date}</span>
                <ChevronDown className="size-[var(--control-icon-size-lg)] shrink-0 text-muted-foreground" />
            </button>
        ))}
    </div>
);
