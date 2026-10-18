import type { ReactNode } from "react";

import { TrendingDown, TrendingUp } from "@hathway/ui/icons";

import { Badge } from "@hathway/ui/components/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { FIGURE, META } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

export type Metric = {
    label: string;
    value: ReactNode;
    /** The change against the comparison period, already formatted ("+12.4%") */
    change?: string;
    trend?: "up" | "down";
    /** One line under the figure: what it is compared with, or what stands out */
    note?: ReactNode;
};

/**
 * A row of small metric cards: label, figure, the change as a trend badge and one line of context.
 * `changeVariant` picks the badge the change is written in: outlined, or filled where the cards are the page's subject.
 * `loading` draws `count` cards with bars for the label, the figure and the note.
 */
export const MetricCards = ({
    metrics = [],
    changeVariant = "outline",
    loading,
    count = 4,
    className,
}: {
    metrics?: readonly Metric[];
    changeVariant?: "outline" | "secondary";
    loading?: boolean;
    /** How many cards to draw while loading */
    count?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("grid grid-cols-2 gap-4 xl:grid-cols-4", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <Card key={index} size="sm">
                <CardHeader>
                    <CardDescription><PendingText length={12} /></CardDescription>
                    <CardTitle className={FIGURE}><PendingText length={7} /></CardTitle>
                </CardHeader>
                <CardFooter>
                    <span className={META}><PendingText length={22} /></span>
                </CardFooter>
            </Card>
        ))}
        {!loading && metrics.map((metric) =>
        {
            const TrendIcon = metric.trend === "down" ? TrendingDown : TrendingUp;

            return (
                <Card key={metric.label} size="sm">
                    <CardHeader>
                        <CardDescription>{metric.label}</CardDescription>
                        <CardTitle className={FIGURE}>{metric.value}</CardTitle>
                        {metric.change !== undefined && (
                            <CardAction>
                                <Badge variant={changeVariant}>
                                    {metric.trend !== undefined && <TrendIcon data-icon="inline-start" />}
                                    {metric.change}
                                </Badge>
                            </CardAction>
                        )}
                    </CardHeader>
                    {metric.note !== undefined && (
                        <CardFooter>
                            <span className={META}>{metric.note}</span>
                        </CardFooter>
                    )}
                </Card>
            );
        })}
    </div>
);
