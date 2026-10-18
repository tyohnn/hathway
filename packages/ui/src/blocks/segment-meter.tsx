import { PendingText } from "@hathway/ui/blocks/pending";
import { FIGURE } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

// Band of a filled tick by its position among the filled ticks: low → high reads destructive → warning → success.
const BANDS = ["bg-destructive", "bg-[color-mix(in_oklab,var(--destructive),var(--warning))]", "bg-warning", "bg-success"] as const;

/**
 * A percentage as a row of ticks with the figure beside it: a win probability, a health score. The filled ticks
 * run through the system's destructive, warning and success colours, so a low value reads red and a high one
 * ends green. The tick sizes are the meter's own geometry, not a look a system tunes. `loading` draws every tick
 * unfilled and a bar for the figure. Like Person it sits in a cell or a row, so it marks no frame of its own.
 */
export const SegmentMeter = ({ value = 0, ticks = 20, loading, className }: { /** 0–100 */ value?: number; ticks?: number; loading?: boolean; className?: string }) =>
{
    const filled = loading ? 0 : Math.round((value / 100) * ticks);

    return (
        <div className={cn("flex items-center gap-2.5", className)} role="meter" aria-valuenow={loading ? undefined : value} aria-valuemin={0} aria-valuemax={100}>
            <span className="flex h-[11px] items-stretch gap-[1.5px]">
                {Array.from({ length: ticks }, (_, index) => (
                    <i key={index} className={cn("block w-[2px] rounded-[1px]", index < filled ? BANDS[Math.min(3, Math.floor((index * 4) / filled))] : "bg-border")} />
                ))}
            </span>
            <span className={FIGURE}>{loading ? <PendingText length={3} /> : <>{value}%</>}</span>
        </div>
    );
};
