import type { ReactNode } from "react";

import { Badge } from "@hathway/ui/components/badge";
import { Separator } from "@hathway/ui/components/separator";
import { NOTE, ROW_LABEL } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type Ticket = {
    id: string;
    title: ReactNode;
    /** The number it goes by ("#48213") */
    reference?: ReactNode;
    /** A badge with its state */
    status?: ReactNode;
    /** The last fact on the line, behind `detailIcon`: when it last changed */
    detail?: ReactNode;
    detailIcon?: ReactNode;
};

const LINE = "flex flex-wrap items-center gap-x-2 gap-y-1 [&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0";

/**
 * A short list of open things with a hairline between them: each a title over one line with its number, a status
 * badge and when it last changed. Use it for support requests, orders or incidents in a side card. `loading` draws
 * `count` entries with the same hairlines: bars for the title, the number and the time, and an empty badge.
 */
export const TicketList = ({
    tickets = [],
    loading,
    count = 2,
    className,
}: {
    tickets?: readonly Ticket[];
    loading?: boolean;
    /** How many entries to draw while loading */
    count?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-col gap-3", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <div key={index} className="flex flex-col gap-3">
                {index > 0 ? <Separator /> : null}
                <div className="flex flex-col gap-1">
                    <span className={ROW_LABEL}><PendingText length={30} /></span>
                    <span className={cn(NOTE, LINE)}>
                        <span><PendingText length={6} /></span>
                        <Badge variant="outline"><PendingText length={8} /></Badge>
                        <span><PendingText length={10} /></span>
                    </span>
                </div>
            </div>
        ))}
        {!loading && tickets.map((ticket, index) => (
            <div key={ticket.id} className="flex flex-col gap-3">
                {index > 0 ? <Separator /> : null}
                <div className="flex flex-col gap-1">
                    <span className={ROW_LABEL}>{ticket.title}</span>
                    <span className={cn(NOTE, LINE)}>
                        {ticket.reference}
                        {ticket.status}
                        {ticket.detail !== undefined && <span className="flex items-center gap-1">{ticket.detailIcon}{ticket.detail}</span>}
                    </span>
                </div>
            </div>
        ))}
    </div>
);
