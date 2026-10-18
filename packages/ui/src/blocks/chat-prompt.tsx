import { Fragment, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@hathway/ui/components/avatar";
import { Bubble, BubbleContent } from "@hathway/ui/components/bubble";
import { Message, MessageAvatar, MessageContent, MessageFooter } from "@hathway/ui/components/message";
import { PendingText } from "@hathway/ui/blocks/pending";

/**
 * What the person sent in a conversation with an assistant: their avatar and the message as a bubble on the end
 * side, with one line under it (who and when). The answer to it is a ChatReply. `loading` keeps the avatar's
 * circle and the bubble and draws `lines` bars for the text and one for the line under it. A message is as tall as
 * its text, which nobody knows yet, so it carries no frame of its own: the pane the conversation scrolls in is the
 * frame.
 */
export const ChatPrompt = ({
    avatar,
    meta,
    loading,
    lines = 2,
    children,
}: {
    /** Initials or an icon */
    avatar?: ReactNode;
    meta?: ReactNode;
    /** The waiting face; the line under the bubble waits when a `meta` is passed (any value) */
    loading?: boolean;
    /** How many lines of text to draw while loading */
    lines?: number;
    children?: ReactNode;
}) => (
    <Message align="end">
        <MessageAvatar>
            <Avatar size="sm">
                <AvatarFallback>{loading ? null : avatar}</AvatarFallback>
            </Avatar>
        </MessageAvatar>
        <MessageContent>
            <Bubble align="end">
                <BubbleContent>
                    {loading ? Array.from({ length: lines }, (_, index) => (
                        <Fragment key={index}>
                            {index > 0 && <br />}
                            <PendingText length={index === lines - 1 ? 32 : 56} className="overflow-hidden whitespace-nowrap" />
                        </Fragment>
                    )) : children}
                </BubbleContent>
            </Bubble>
            {meta !== undefined && <MessageFooter>{loading ? <PendingText length={12} /> : meta}</MessageFooter>}
        </MessageContent>
    </Message>
);
