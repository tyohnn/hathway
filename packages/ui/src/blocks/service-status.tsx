import { CircleCheck, TriangleAlert } from "@hathway/ui/icons";

import { ROW_LABEL } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type Service = {
    name: string;
    /** `ok` reads as muted text behind a check, `degraded` in the destructive colour behind a warning sign */
    state: "ok" | "degraded";
    /** The state in words ("Operational") */
    label: string;
};

const STATE = { ok: "text-muted-foreground", degraded: "text-destructive" } as const;

const LABEL = "flex items-center gap-1.5 text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] [&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0";

/**
 * The state of each service, one per row: its name on one side, the state in words behind an icon on the other.
 * Use it for a status card or a list of health checks. `loading` draws `count` rows with a bar for the name and a
 * bar for the state, without the icon that tells which state it is.
 */
export const ServiceStatus = ({
    services = [],
    loading,
    count = 4,
    className,
}: {
    services?: readonly Service[];
    loading?: boolean;
    /** How many rows to draw while loading */
    count?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("flex flex-col gap-2", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-2">
                <span className={ROW_LABEL}><PendingText length={14} /></span>
                <span className={cn(LABEL, STATE.ok)}><span><PendingText length={11} /></span></span>
            </div>
        ))}
        {!loading && services.map((service) => (
            <div key={service.name} className="flex items-center justify-between gap-2">
                <span className={ROW_LABEL}>{service.name}</span>
                <span className={cn(LABEL, STATE[service.state])}>
                    {service.state === "ok" ? <CircleCheck /> : <TriangleAlert />}
                    {service.label}
                </span>
            </div>
        ))}
    </div>
);
