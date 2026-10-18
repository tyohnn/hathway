import { Fragment, type ReactNode } from "react";

import { BARS_ON_MUTED, PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

const BAR_TITLE = "font-mono text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground";

/** The lengths of the waiting lines, in characters, repeated down the block */
const PENDING = [36, 24, 44, 30, 18, 40] as const;

const SIZE = { sm: "text-[length:var(--ui-text-sm)]", md: "text-[length:var(--ui-text-md)]" } as const;

/**
 * A block of code under a title bar: what it is (a file name, a language, "Terminal") behind an optional icon, an
 * action at the end of the bar (a copy button), and the code itself, which scrolls sideways instead of wrapping.
 * `size="md"` sets the code at the body size for a page that is read, `sm` for a pane beside other content.
 * The code is plain text; the block highlights nothing. `loading` keeps the title bar with its action and draws
 * `loadingLines` lines of bars where the code goes.
 */
export const CodeBlock = ({
    code,
    title,
    icon,
    action,
    size = "md",
    loading,
    loadingLines = 6,
    className,
    barClassName,
}: {
    code?: string;
    title: ReactNode;
    icon?: ReactNode;
    /** The end of the bar: a copy button */
    action?: ReactNode;
    size?: keyof typeof SIZE;
    loading?: boolean;
    /** How many lines to draw while loading */
    loadingLines?: number;
    className?: string;
    barClassName?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("overflow-hidden rounded-[var(--radius-lg)] border border-border bg-muted text-foreground", className)}>
        <div className={cn("flex items-center justify-between gap-2 border-b border-border bg-background py-1 pr-1 pl-3", barClassName)}>
            {icon === undefined ? <span className={BAR_TITLE}>{title}</span> : (
                <span className={cn(BAR_TITLE, "flex min-w-0 items-center gap-1.5 [&_svg]:size-[var(--control-icon-size-md)] [&_svg]:shrink-0")}>
                    {icon}
                    <span className="truncate">{title}</span>
                </span>
            )}
            {action}
        </div>
        {/*
          * The size goes before the line height: merged the other way round, a font size drops the line height before it.
          * The waiting lines take the page colour, as the title bar does: on this muted ground a system whose skeleton
          * colour is its muted colour would draw nothing.
          */}
        <pre className={cn("m-0 overflow-x-auto px-4 py-3 font-mono", BARS_ON_MUTED, SIZE[size], "leading-[1.6]")}>
            <code>
                {loading ? Array.from({ length: loadingLines }, (_, index) => (
                    <Fragment key={index}>
                        {index > 0 && "\n"}
                        <PendingText length={PENDING[index % PENDING.length]} className="overflow-hidden" />
                    </Fragment>
                )) : code}
            </code>
        </pre>
    </div>
);
