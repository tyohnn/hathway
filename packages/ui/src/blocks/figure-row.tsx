import type { ReactNode } from "react";

import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { BIG_FIGURE, META } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A few figures side by side, each over its label: seats used, invited, available. `loading` draws a bar for each
 * figure over its label, which waits for nothing.
 */
export const FigureRow = ({ figures, loading, className }: { figures: readonly { value?: ReactNode; label: string }[]; loading?: boolean; className?: string }) => (
    <div {...pendingFrame(loading)} className={cn("grid gap-2", className)} style={{ gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))` }}>
        {figures.map((figure) => (
            <div key={figure.label} className="flex flex-col">
                <span className={BIG_FIGURE}>{loading ? <PendingText length={2} /> : figure.value}</span>
                <span className={META}>{figure.label}</span>
            </div>
        ))}
    </div>
);
