"use client";

import type { ReactNode } from "react";

import { Progress, ProgressLabel, ProgressValue } from "@hathway/ui/components/progress";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { META } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

/**
 * One part of a whole as a progress bar: its name, how many it is and the share that makes: a step of a funnel,
 * a channel's part of the traffic. Stack a few in a column. For a single "used of total" bar use UsageMeter.
 * `loading` draws bars for the name, the count and the share over an empty track.
 */
export const ShareMeter = ({
    label,
    count,
    value,
    loading,
}: {
    label?: ReactNode;
    /** The absolute figure, already formatted ("6,367") */
    count?: ReactNode;
    /** 0–100 */
    value?: number;
    loading?: boolean;
}) => (
    <Progress {...pendingFrame(loading)} value={loading || value === undefined ? null : value} className="items-center">
        <ProgressLabel>{loading ? <PendingText length={14} /> : label}</ProgressLabel>
        <span className={cn(META, "ml-auto")}>{loading ? <PendingText length={5} /> : count}</span>
        {loading ? <ProgressValue className={META}>{() => <PendingText length={3} />}</ProgressValue> : <ProgressValue className={META} />}
    </Progress>
);
