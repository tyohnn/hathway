import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@hathway/ui/components/avatar";
import { HEADING_LG, NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * The head of an open message: the subject with its labels and an action (star, pin) on the other side, then the
 * sender's avatar, name and address, the recipient lines under them ("To: …", "Cc: …") and the date at the end.
 * `loading` draws bars for the subject, the name, the address, `loadingLines` recipient lines and the date, next to
 * an empty avatar; what stands beside the subject stays.
 */
export const MailHeader = ({
    subject,
    aside,
    name,
    address,
    initials,
    lines,
    date,
    loading,
    loadingLines = 1,
    className,
}: {
    subject?: ReactNode;
    /** Beside the subject: label badges, an icon button */
    aside?: ReactNode;
    name?: ReactNode;
    /** After the name, in small text */
    address?: ReactNode;
    initials?: string;
    /** Small lines under the name, one per entry */
    lines?: readonly ReactNode[];
    date?: ReactNode;
    /** The waiting face; the address and the date wait when one is passed (any value) */
    loading?: boolean;
    /** How many recipient lines to draw while loading */
    loadingLines?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-col gap-4", className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className={cn("min-w-0 text-foreground", HEADING_LG)}>{loading ? <PendingText length={28} /> : subject}</h1>
            {aside !== undefined && <div className="flex items-center gap-1.5">{aside}</div>}
        </div>
        <div className="flex items-start gap-3">
            <Avatar size="lg">
                <AvatarFallback>{loading ? null : initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[length:var(--ui-text-md)] font-semibold text-foreground">{loading ? <PendingText length={12} /> : name}</span>
                    {address !== undefined && <span className={NOTE}>{loading ? <PendingText length={20} /> : address}</span>}
                </div>
                {loading && Array.from({ length: loadingLines }, (_, index) => <span key={index} className={NOTE}><PendingText length={24} /></span>)}
                {!loading && lines?.map((line, index) => <span key={index} className={NOTE}>{line}</span>)}
            </div>
            {date !== undefined && <span className={cn(NOTE, "shrink-0")}>{loading ? <PendingText length={22} /> : date}</span>}
        </div>
    </div>
);
