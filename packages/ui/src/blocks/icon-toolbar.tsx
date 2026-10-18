"use client";

import { Fragment, type ReactNode } from "react";

import { Button } from "@hathway/ui/components/button";
import { Separator } from "@hathway/ui/components/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hathway/ui/components/tooltip";
import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { GUTTER_INLINE, type Gutter } from "@hathway/ui/blocks/lib/frame";
import { cn } from "@hathway/ui/lib/utils";

export type IconToolbarAction = { label: string; icon: ReactNode; onClick?: () => void };

const ToolButton = ({ label, icon, onClick }: IconToolbarAction) => (
    <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} />}>{icon}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
    </Tooltip>
);

/**
 * A toolbar of icon buttons over a divider: what can be done with the open item (archive, reply, forward). Each
 * button shows its label as a tooltip. `groups` are separated by a hairline; `position` is a short note pushed to
 * the far end ("1 of 128"), followed by the `endActions` (previous, next, more).
 */
export const IconToolbar = ({
    groups,
    position,
    endActions,
    gutter = "sm",
    className,
}: {
    groups: readonly (readonly IconToolbarAction[])[];
    position?: ReactNode;
    endActions?: readonly IconToolbarAction[];
    /** How far its ends stand from the page's edge: the page's small gutter by default */
    gutter?: Gutter;
    className?: string;
}) => (
    <div className={cn("flex flex-wrap items-center gap-1 border-b border-border py-2", GUTTER_INLINE[gutter], className)}>
        {groups.map((actions, index) => (
            <Fragment key={actions.map((action) => action.label).join("|")}>
                {index > 0 && <Separator orientation="vertical" className="mx-1 data-vertical:h-4 data-vertical:self-auto" />}
                {actions.map((action) => <ToolButton key={action.label} {...action} />)}
            </Fragment>
        ))}
        {position !== undefined && <span className={cn(NOTE, "ml-auto")}>{position}</span>}
        {endActions?.map((action) => <ToolButton key={action.label} {...action} />)}
    </div>
);
