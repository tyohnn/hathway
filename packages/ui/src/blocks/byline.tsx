import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@hathway/ui/components/avatar";
import { BODY, NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * Who wrote a post, as a band between two hairlines under its title: each author's avatar, name and role, and
 * the post's actions (copy link, subscribe) at the other end. `loading` draws `count` authors — an avatar without
 * initials and bars for the name and the role — and keeps the actions.
 */
export const Byline = ({
    authors = [],
    actions,
    loading,
    count = 1,
    className,
}: {
    authors?: readonly { name: string; initials: string; role?: ReactNode }[];
    actions?: ReactNode;
    loading?: boolean;
    /** How many authors to draw while loading */
    count?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-wrap items-center justify-between gap-3 border-y border-border py-4", className)}>
        <div className="flex flex-wrap items-center gap-4">
            {loading && Array.from({ length: count }, (_, index) => (
                <span key={index} className="flex items-center gap-2">
                    <Avatar size="sm"><AvatarFallback /></Avatar>
                    <span className="flex flex-col">
                        <span className={cn(BODY, "font-medium")}><PendingText length={12} /></span>
                        <span className={NOTE}><PendingText length={16} /></span>
                    </span>
                </span>
            ))}
            {!loading && authors.map((author) => (
                <span key={author.name} className="flex items-center gap-2">
                    <Avatar size="sm"><AvatarFallback>{author.initials}</AvatarFallback></Avatar>
                    <span className="flex flex-col">
                        <span className={cn(BODY, "font-medium")}>{author.name}</span>
                        {author.role !== undefined && <span className={NOTE}>{author.role}</span>}
                    </span>
                </span>
            ))}
        </div>
        {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
    </div>
);
