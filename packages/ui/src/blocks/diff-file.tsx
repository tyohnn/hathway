"use client";

import type { ReactNode } from "react";

import { ChevronDown, ChevronRight } from "@hathway/ui/icons";

import { Button } from "@hathway/ui/components/button";
import { Checkbox } from "@hathway/ui/components/checkbox";
import { Label } from "@hathway/ui/components/label";
import { DiffStat } from "@hathway/ui/blocks/diff-stat";
import { BARS_ON_MUTED, PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";
import { strings } from "@hathway/ui/strings";

/**
 * One changed file of a review: a header with the button that folds it, the path, the lines added and removed,
 * a "viewed" checkbox and a menu, over the file's diff (a DiffView as the child; none while it is folded).
 * `toggleLabel` names the fold button for its current state, `viewedLabel` is the checkbox's visible label.
 * `loading` draws bars for the path and the two counts and keeps the header's controls, the checkbox disabled and
 * unchecked; the child is the diff's own waiting face (`<DiffView loading />`).
 */
export const DiffFile = ({
    id,
    path,
    added,
    removed,
    open,
    onToggle,
    toggleLabel,
    viewed,
    onViewedChange,
    viewedLabel = strings.blocks.diff.viewed,
    menu,
    loading,
    children,
    className,
}: {
    /** The id of the "viewed" checkbox */
    id: string;
    path?: ReactNode;
    added?: number;
    removed?: number;
    open: boolean;
    onToggle?: () => void;
    /** Names the fold button; "Collapse file" or "Expand file" in the locale's words when left out */
    toggleLabel?: string;
    viewed?: boolean;
    onViewedChange?: (viewed: boolean) => void;
    viewedLabel?: ReactNode;
    /** The end of the header: a "more" button or a RowMenu */
    menu?: ReactNode;
    loading?: boolean;
    children?: ReactNode;
    className?: string;
}) => (
    <section {...pendingFrame(loading)} className={cn("shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-border [&>*+*]:border-t [&>*+*]:border-border", className)}>
        {/* The waiting bars take the page colour: on this muted ground a system whose skeleton colour is its muted colour would draw nothing. */}
        <div className={cn("flex flex-wrap items-center gap-2 bg-muted px-3 py-2", BARS_ON_MUTED)}>
            <Button variant="ghost" size="icon-xs" aria-label={toggleLabel ?? (open ? strings.blocks.diff.collapse : strings.blocks.diff.expand)} onClick={onToggle}>
                {open ? <ChevronDown /> : <ChevronRight />}
            </Button>
            <span className="min-w-0 truncate font-mono text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] font-semibold">{loading ? <PendingText length={24} /> : path}</span>
            <DiffStat kind="add" loading={loading}>+{added}</DiffStat>
            <DiffStat kind="del" loading={loading}>−{removed}</DiffStat>
            <span className="ml-auto flex items-center gap-2">
                {/* The key: a box that waited unchecked takes the value when it arrives. */}
                <Checkbox key={loading ? "pending" : "value"} id={id} defaultChecked={loading ? undefined : viewed} disabled={loading} onCheckedChange={onViewedChange && ((checked) => onViewedChange(checked === true))} />
                <Label htmlFor={id}>{viewedLabel}</Label>
                {menu}
            </span>
        </div>
        {children}
    </section>
);
