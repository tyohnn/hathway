"use client";

import { Fragment, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@hathway/ui/components/avatar";
import { Textarea } from "@hathway/ui/components/textarea";
import { PARAGRAPH, NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";
import { strings } from "@hathway/ui/strings";

/** One comment of the waiting face: how many lines its text takes, and the badge's own waiting face if it will carry one, so the comment is as tall as it will be */
export type PendingComment = { lines?: number; badge?: ReactNode };

export type ThreadComment = { id: string; name: ReactNode; initials: string; when: ReactNode; /** After the time: the commenter's role */ badge?: ReactNode; body: ReactNode };

/**
 * A thread of comments on one spot — a line of a diff, a paragraph, a pin on a design: each comment with its
 * author's avatar, name, time and an optional badge, then a reply field aligned with the comment text, with the
 * thread's own action (resolve) on one side and the reply buttons on the other. Between hairlines on the card
 * colour, so it reads as an inset in what it comments on. `replyLabel` names the field for assistive technology.
 * `loading` draws one comment per entry of `loadingComments` — an empty avatar, bars for the name and the time,
 * lines of bars for the text — over the reply field and the actions, which wait for nothing.
 */
export const CommentThread = ({
    comments = [],
    replyLabel = strings.blocks.comments.reply,
    replyPlaceholder,
    replyValue,
    onReplyChange,
    threadAction,
    replyActions,
    loading,
    loadingComments = [{ lines: 2 }, { lines: 1 }],
    className,
}: {
    comments?: readonly ThreadComment[];
    replyLabel?: string;
    replyPlaceholder?: string;
    replyValue?: string;
    onReplyChange?: (value: string) => void;
    /** Under the field at the start: resolve the conversation */
    threadAction?: ReactNode;
    /** Under the field at the end: cancel, reply */
    replyActions?: ReactNode;
    loading?: boolean;
    /** The comments to draw while loading */
    loadingComments?: readonly PendingComment[];
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-col gap-3 border-y border-border bg-card p-4 font-sans", className)}>
        {loading && loadingComments.map(({ lines = 1, badge }, index) => (
            <div key={index} className="flex gap-3">
                <Avatar size="sm">
                    <AvatarFallback />
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] font-semibold"><PendingText length={12} /></span>
                        <span className={cn(NOTE, "whitespace-nowrap")}><PendingText length={13} /></span>
                        {badge}
                    </div>
                    <p className={PARAGRAPH}>
                        {Array.from({ length: lines }, (_, line) => (
                            <Fragment key={line}>
                                {line > 0 && <br />}
                                <PendingText length={line === lines - 1 ? 48 : 96} className="overflow-hidden whitespace-nowrap" />
                            </Fragment>
                        ))}
                    </p>
                </div>
            </div>
        ))}
        {!loading && comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
                <Avatar size="sm">
                    <AvatarFallback>{comment.initials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] font-semibold">{comment.name}</span>
                        <span className={cn(NOTE, "whitespace-nowrap")}>{comment.when}</span>
                        {comment.badge}
                    </div>
                    <p className={PARAGRAPH}>{comment.body}</p>
                </div>
            </div>
        ))}
        <div className="flex flex-col gap-2 pl-10">
            <Textarea
                aria-label={replyLabel}
                className="min-h-16"
                placeholder={replyPlaceholder}
                value={replyValue}
                onChange={onReplyChange && ((event) => onReplyChange(event.target.value))}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
                {threadAction}
                {replyActions !== undefined && <div className="flex items-center gap-2">{replyActions}</div>}
            </div>
        </div>
    </div>
);
