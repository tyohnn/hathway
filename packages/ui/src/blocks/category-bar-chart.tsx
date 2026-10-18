"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@hathway/ui/components/chart";
import { seriesColor } from "@hathway/ui/blocks/lib/chart";
import { pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * One figure compared across a few categories as horizontal bars, the category names down the side: visitors by
 * channel, revenue by plan. It is the bare chart — put it in a card (InfoCard). Each bar takes the next of the
 * system's chart colours. Not animated: every render is the final frame. The bar's corner is the graphic's own
 * geometry. `loading` keeps the box and draws the plot empty.
 */
export const CategoryBarChart = ({
    data = [],
    categoryKey,
    valueKey,
    valueLabel,
    formatValue,
    categoryAxisWidth = 64,
    loading,
    className,
}: {
    /** One row per category, with its name under `categoryKey` and the figure under `valueKey` */
    data?: readonly Record<string, string | number>[];
    categoryKey: string;
    valueKey: string;
    /** What the figure counts, for the tooltip ("Visitors") */
    valueLabel: string;
    /** How a value is written on the value axis ("1.5k") */
    formatValue?: (value: number) => string;
    /** The room for the category names, in px */
    categoryAxisWidth?: number;
    loading?: boolean;
    /** The chart's box; it needs a height */
    className?: string;
}) =>
{
    const config: ChartConfig = { [valueKey]: { label: valueLabel } };

    return (
        <ChartContainer {...pendingFrame(loading)} config={config} className={cn("aspect-auto h-52 w-full", className)}>
            <BarChart accessibilityLayer data={(loading ? [] : data).map((row, index) => ({ ...row, fill: seriesColor(index) }))} layout="vertical" margin={{ left: 0, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey={categoryKey} type="category" tickLine={false} axisLine={false} width={categoryAxisWidth} />
                <XAxis dataKey={valueKey} type="number" tickLine={false} axisLine={false} tickFormatter={formatValue} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey={valueKey} radius={4} isAnimationActive={false} />
            </BarChart>
        </ChartContainer>
    );
};
