import { Fragment, type ReactNode } from "react";

import { PendingText } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A few short facts on one line behind an icon, with a hairline between them: a date and what happened then.
 * `loading` keeps the icon and the hairlines and draws `count` bars for the facts. Like Person it is a piece of a
 * row and carries no frame attributes of its own.
 */
export const InlineFacts = ({
    icon,
    facts = [],
    loading,
    count = 2,
    className,
}: {
    icon?: ReactNode;
    facts?: readonly ReactNode[];
    loading?: boolean;
    /** How many facts to draw while loading */
    count?: number;
    className?: string;
}) => (
    <span className={cn("flex items-center gap-1.5 [&_svg]:size-[var(--control-icon-size-sm)] [&_svg]:shrink-0", className)}>
        {icon}
        {(loading ? Array.from({ length: count }, (_, index) => <PendingText key={index} length={8} />) : facts).map((fact, index) => (
            <Fragment key={index}>
                {index > 0 && <span className="h-[12px] w-px shrink-0 bg-muted-foreground" aria-hidden="true" />}
                <span>{fact}</span>
            </Fragment>
        ))}
    </span>
);
