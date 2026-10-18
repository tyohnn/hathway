import type { ReactNode } from "react";

import { ArrowLeft, ArrowRight } from "@hathway/ui/icons";

import { Card, CardDescription, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";
import { strings } from "@hathway/ui/strings";

export type PagerPage = {
    /** The direction in words; the locale's "Previous" or "Next" when left out */
    label?: string;
    title?: ReactNode;
    description?: ReactNode;
};

/**
 * The end of a page in a series: the page before and the page after as two cards side by side, each with its
 * direction, title and one line about it. `loading` keeps the cards that were passed and their directions, and
 * draws bars for the title and for a description that was passed (any value).
 */
export const PagerCards = ({ previous, next, loading, className }: { previous?: PagerPage; next?: PagerPage; loading?: boolean; className?: string }) => (
    <div {...pendingFrame(loading)} className={cn("grid gap-3 sm:grid-cols-2", className)}>
        {previous !== undefined && (
            <Card size="sm" className="[&_svg]:size-[var(--control-icon-size-md)]">
                <CardHeader>
                    <CardDescription className="flex items-center gap-1.5"><ArrowLeft />{previous.label ?? strings.blocks.pager.previous}</CardDescription>
                    <CardTitle>{loading ? <PendingText length={18} /> : previous.title}</CardTitle>
                    {previous.description !== undefined && <CardDescription>{loading ? <PendingText length={30} /> : previous.description}</CardDescription>}
                </CardHeader>
            </Card>
        )}
        {next !== undefined && (
            <Card size="sm" className="text-end [&_svg]:size-[var(--control-icon-size-md)]">
                <CardHeader>
                    <CardDescription className="flex items-center justify-end gap-1.5">{next.label ?? strings.blocks.pager.next}<ArrowRight /></CardDescription>
                    <CardTitle>{loading ? <PendingText length={18} /> : next.title}</CardTitle>
                    {next.description !== undefined && <CardDescription>{loading ? <PendingText length={30} /> : next.description}</CardDescription>}
                </CardHeader>
            </Card>
        )}
    </div>
);
