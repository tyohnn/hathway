import { cn } from "@hathway/ui/lib/utils";

const LEVEL = [
    "h-[2px] bg-[color-mix(in_oklab,var(--success)_35%,transparent)]",
    "h-[4px] bg-success",
    "h-[6px] bg-success",
    "h-[9px] bg-success",
    "h-[12px] bg-success",
] as const;

/**
 * A trend as a row of small bars, one per period, each at a level from 0 (a faint dot: nothing happened) to 4.
 * Decorative: say the trend in words next to it when it matters. The bar sizes are the graphic's own geometry.
 * `loading` draws `count` bars at the lowest height in the border colour, so the row is there and says nothing;
 * like Person it sits in a cell, so it marks no frame of its own.
 */
export const ActivityBars = ({
    levels = [],
    loading,
    count = 12,
    className,
}: {
    levels?: readonly number[];
    loading?: boolean;
    /** How many bars to draw while loading */
    count?: number;
    className?: string;
}) => (
    <span className={cn("flex h-[12px] items-end gap-[2px]", className)} aria-hidden="true">
        {loading && Array.from({ length: count }, (_, index) => <i key={index} className="block h-[2px] w-[2px] rounded-[1px] bg-border" />)}
        {!loading && levels.map((level, index) => <i key={index} className={cn("block w-[2px] rounded-[1px]", LEVEL[Math.max(0, Math.min(4, level))])} />)}
    </span>
);
