import type { ReactNode } from "react";

import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@hathway/ui/components/item";
import { cn } from "@hathway/ui/lib/utils";

export type ContactOption = {
    id: string;
    icon: ReactNode;
    title: ReactNode;
    /** What to expect: how fast the reply comes */
    description?: ReactNode;
    /** The one button that starts it */
    action?: ReactNode;
};

/**
 * A few ways to do one thing, stacked: each an outlined item with an icon, its name, what to expect and the one
 * button that starts it — chat or email to reach support, the ways to import a file, the plans to switch to.
 */
export const ContactOptions = ({ options, className }: { options: readonly ContactOption[]; className?: string }) => (
    <div className={cn("flex flex-col gap-3", className)}>
        {options.map((option) => (
            <Item key={option.id} variant="outline" size="sm">
                <ItemMedia variant="icon">{option.icon}</ItemMedia>
                <ItemContent>
                    <ItemTitle>{option.title}</ItemTitle>
                    {option.description !== undefined && <ItemDescription>{option.description}</ItemDescription>}
                </ItemContent>
                {option.action !== undefined && <ItemActions>{option.action}</ItemActions>}
            </Item>
        ))}
    </div>
);
