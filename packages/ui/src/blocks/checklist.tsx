"use client";

import { type ReactNode, useState } from "react";

import { Checkbox } from "@hathway/ui/components/checkbox";
import { Label } from "@hathway/ui/components/label";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type ChecklistItem = {
    /** Also the checkbox's element id */
    id: string;
    label: ReactNode;
    /** Checked at first; the list keeps the state from then on */
    done?: boolean;
};

/**
 * A list of things to tick off: a checkbox with its label, which is struck through and muted once it is done.
 * `loading` draws `count` rows with a checkbox that cannot be ticked and a bar for the label.
 */
export const Checklist = ({
    items = [],
    onChange,
    loading,
    count = 4,
    className,
}: {
    items?: readonly ChecklistItem[];
    /** The ids that are done, after every change */
    onChange?: (done: string[]) => void;
    loading?: boolean;
    /** How many rows to draw while loading */
    count?: number;
    className?: string;
}) =>
{
    const [done, setDone] = useState<readonly string[]>(() => items.filter((item) => item.done).map((item) => item.id));
    const update = (next: string[]) =>
    {
        setDone(next);
        onChange?.(next);
    };

    return (
        <div {...pendingFrame(loading)} className={cn("flex flex-col gap-2.5", className)}>
            {loading && Array.from({ length: count }, (_, index) => (
                <div key={index} className="flex items-start gap-3">
                    <Checkbox disabled aria-hidden tabIndex={-1} className="mt-0.5" />
                    <Label><span><PendingText length={26} /></span></Label>
                </div>
            ))}
            {!loading && items.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                    <Checkbox
                        id={item.id}
                        checked={done.includes(item.id)}
                        onCheckedChange={(checked) => update(checked ? [...done, item.id] : done.filter((id) => id !== item.id))}
                        className="mt-0.5"
                    />
                    <Label htmlFor={item.id} className={done.includes(item.id) ? "text-muted-foreground line-through" : undefined}>{item.label}</Label>
                </div>
            ))}
        </div>
    );
};
