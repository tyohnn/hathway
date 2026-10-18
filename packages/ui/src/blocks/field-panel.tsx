import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { FieldGroup } from "@hathway/ui/components/field";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A panel of settings beside the thing they apply to: a card as tall as its column with a title, a description
 * and a corner action, the fields in a group that scrolls inside, and a footer that stays put (usage, a note).
 * The children are fields (Field, HintField, SliderField, SwitchField); a field with `flex-1` takes the height
 * that is left. Give the width with `className`. For a small card that is as tall as its content use InfoCard.
 */
export const FieldPanel = ({
    title,
    description,
    action,
    footer,
    children,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    /** The header's corner: an icon button */
    action?: ReactNode;
    /** Under the fields, stacked */
    footer?: ReactNode;
    children: ReactNode;
    className?: string;
}) => (
    <Card size="sm" className={cn("min-h-0 shrink-0", className)}>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description !== undefined && <CardDescription>{description}</CardDescription>}
            {action !== undefined && <CardAction>{action}</CardAction>}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <FieldGroup className="flex-1 gap-4">{children}</FieldGroup>
        </CardContent>
        {footer !== undefined && <CardFooter className="flex-col items-stretch gap-2">{footer}</CardFooter>}
    </Card>
);
