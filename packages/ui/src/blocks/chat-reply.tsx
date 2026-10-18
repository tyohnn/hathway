import { Fragment, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@hathway/ui/components/avatar";
import { Button } from "@hathway/ui/components/button";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader } from "@hathway/ui/components/message";
import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText } from "@hathway/ui/blocks/pending";
import { Prose } from "@hathway/ui/blocks/prose";
import { cn } from "@hathway/ui/lib/utils";

export type ChatReplyAction = { label: string; icon: ReactNode; onClick?: () => void };

/**
 * What the assistant answered: its avatar and name, the reply as written text (paragraphs, lists, inline code)
 * at a reading measure, whatever it produced after the text (`extra`: a code block, a file), and a row of small
 * actions on the reply (copy, regenerate, rate) ending in one line about the run. The message it answers is a
 * ChatPrompt. `loading` keeps the avatar's circle and the actions and draws bars for the name, `lines` lines of
 * text and the run line; what the reply produced (`extra`) is left out. A reply is as tall as its text, which
 * nobody knows yet, so it carries no frame of its own: the pane the conversation scrolls in is the frame.
 */
export const ChatReply = ({
    avatar,
    name,
    children,
    extra,
    actions,
    meta,
    loading,
    lines = 4,
}: {
    /** Initials or an icon */
    avatar?: ReactNode;
    name?: ReactNode;
    /** The reply's text */
    children?: ReactNode;
    extra?: ReactNode;
    actions?: readonly ChatReplyAction[];
    /** After the actions: time, tokens, cost */
    meta?: ReactNode;
    /** The waiting face; the run line waits when a `meta` is passed (any value) */
    loading?: boolean;
    /** How many lines of text to draw while loading */
    lines?: number;
}) => (
    <Message>
        <MessageAvatar>
            <Avatar size="sm">
                <AvatarFallback>{loading ? null : avatar}</AvatarFallback>
            </Avatar>
        </MessageAvatar>
        <MessageContent className="min-w-0">
            <MessageHeader>{loading ? <PendingText length={11} /> : name}</MessageHeader>
            <Prose size="lg" className="max-w-[72ch]">
                {loading ? (
                    <p>
                        {Array.from({ length: lines }, (_, index) => (
                            <Fragment key={index}>
                                {index > 0 && <br />}
                                <PendingText length={index === lines - 1 ? 40 : 72} className="overflow-hidden whitespace-nowrap" />
                            </Fragment>
                        ))}
                    </p>
                ) : children}
            </Prose>
            {!loading && extra}
            {(actions !== undefined || meta !== undefined) && (
                <MessageFooter className="flex items-center gap-1">
                    {actions?.map((action) => <Button key={action.label} variant="ghost" size="icon-xs" aria-label={action.label} onClick={action.onClick}>{action.icon}</Button>)}
                    {meta !== undefined && <span className={cn(NOTE, "ml-2 whitespace-nowrap")}>{loading ? <PendingText length={24} /> : meta}</span>}
                </MessageFooter>
            )}
        </MessageContent>
    </Message>
);
