"use client";

import type { ReactNode } from "react";

import { Progress, ProgressLabel, ProgressValue } from "@hathway/ui/components/progress";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";

/**
 * How much of something is used: a progress bar with what it measures on one side and the percentage on the other.
 * `loading` draws bars for both over an empty track.
 */
export const UsageMeter = ({ label, value, loading }: { label?: ReactNode; /** 0–100 */ value?: number; loading?: boolean }) => (
    <Progress {...pendingFrame(loading)} value={loading || value === undefined ? null : value}>
        <ProgressLabel>{loading ? <PendingText length={18} /> : label}</ProgressLabel>
        {loading ? <ProgressValue className="ml-auto">{() => <PendingText length={3} />}</ProgressValue> : <ProgressValue className="ml-auto" />}
    </Progress>
);
