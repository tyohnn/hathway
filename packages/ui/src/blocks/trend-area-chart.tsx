"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@hathway/ui/components/chart";
import { seriesColor } from "@hathway/ui/blocks/lib/chart";
import { pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type TrendSeries = { key: string; label: string };

/**
 * A trend over time as filled areas, one per series, with a legend under it: visitors and page views by day,
 * revenue by month. It is the bare chart — put it in a card (InfoCard). The series take the system's chart colours
 * in order; the first is drawn in front, so list the smaller series first. Not animated: every render is the
 * final frame. The stroke width and the fill opacities are the graphic's own geometry. `loading` keeps the box
 * and the legend, which names the series the caller already knows, and draws the plot empty.
 */
export const TrendAreaChart = ({
    data = [],
    xKey,
    series,
    formatValue,
    valueAxisWidth = 36,
    loading,
    className,
}: {
    /** One row per point in time, with the label for the x axis under `xKey` and a number under each series key */
    data?: readonly Record<string, string | number>[];
    xKey: string;
    series: readonly TrendSeries[];
    /** How a value is written on the value axis ("1.5k") */
    formatValue?: (value: number) => string;
    /** The room for the value axis labels, in px */
    valueAxisWidth?: number;
    loading?: boolean;
    /** The chart's box; it needs a height */
    className?: string;
}) =>
{
    const config: ChartConfig = Object.fromEntries(series.map((item, index) => [item.key, { label: item.label, color: seriesColor(index) }]));
    const areas = series.map((item, index) => ({ key: item.key, color: seriesColor(index), front: index === 0 })).reverse();

    return (
        <ChartContainer {...pendingFrame(loading)} config={config} className={cn("aspect-auto h-52 w-full", className)}>
            <AreaChart accessibilityLayer data={loading ? [] : [...data]} margin={{ left: 0, right: 8, top: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={valueAxisWidth} tickFormatter={formatValue} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartLegend content={<ChartLegendContent />} />
                {areas.map((area) => (
                    <Area key={area.key} dataKey={area.key} type="monotone" fill={area.color} fillOpacity={area.front ? 0.3 : 0.15} stroke={area.color} strokeWidth={2} isAnimationActive={false} />
                ))}
            </AreaChart>
        </ChartContainer>
    );
};
