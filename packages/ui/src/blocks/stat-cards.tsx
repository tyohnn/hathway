import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { Progress } from "@hathway/ui/components/progress";
import { FIGURE_LG, NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type Stat = {
    id: string;
    label: string;
    /** A figure or a few words, in the large size */
    value: ReactNode;
    /** 0–100: draws a progress bar under the value */
    progress?: number;
    /** One line of detail under it; it may wrap */
    detail?: ReactNode;
};

/**
 * A row of small cards that say where something stands: a label, the value in the large size, a progress bar
 * when the value is part of a whole, and a line of detail. For figures that change against a period (with a trend
 * badge) use MetricCards. `loading` draws `count` cards with bars for the label, the value and the detail over
 * an empty progress track.
 *
 * The row holds as many cards as fit at their least width (`--stat-card-min-width`, 10rem when a system does not
 * say) and the rest go to the next line: four across on a wide page, two on a phone, with no breakpoint.
 */
export const StatCards = ({
    stats = [],
    loading,
    count = 4,
    className,
}: {
    stats?: readonly Stat[];
    loading?: boolean;
    /** How many cards to draw while loading */
    count?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("grid grid-cols-[repeat(auto-fit,minmax(var(--stat-card-min-width,10rem),1fr))] gap-4", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <Card key={index} size="sm">
                <CardHeader>
                    <CardDescription><PendingText length={10} /></CardDescription>
                    <CardTitle className={cn(FIGURE_LG, "tabular-nums")}><PendingText length={6} /></CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Progress value={null} aria-hidden />
                    <span className={NOTE}><PendingText length={20} /></span>
                </CardContent>
            </Card>
        ))}
        {!loading && stats.map((stat) => (
            <Card key={stat.id} size="sm">
                <CardHeader>
                    <CardDescription>{stat.label}</CardDescription>
                    <CardTitle className={cn(FIGURE_LG, "tabular-nums")}>{stat.value}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    {stat.progress !== undefined && <Progress value={stat.progress} aria-label={stat.label} />}
                    {stat.detail !== undefined && <span className={NOTE}>{stat.detail}</span>}
                </CardContent>
            </Card>
        ))}
    </div>
);
