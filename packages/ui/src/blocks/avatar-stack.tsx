import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@hathway/ui/components/avatar";
import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type StackPerson = {
    initials: string;
    /** Names the avatar for assistive technology */
    name?: string;
    image?: string;
};

/**
 * The people on something as overlapping avatars: a project's members, a card's owners, a meeting's attendees.
 * The first `max` are drawn and the rest are counted in a bubble at the end ("+3"); `total` is how many there are
 * in all when the list given is only the head of it, and `more` writes the bubble yourself. `label` puts a line
 * beside the stack ("5 attendees"). For one person with a name use Person. `loading` draws `count` avatars without
 * initials, the bubble empty when `more` or a larger `total` is passed, and a bar for the label when a `label` is
 * passed (any value). Like Person it is a piece of a row and carries no frame attributes of its own.
 */
export const AvatarStack = ({
    people,
    max = 3,
    total,
    more,
    label,
    loading,
    count = max,
    className,
}: {
    people?: readonly StackPerson[];
    max?: number;
    total?: number;
    more?: ReactNode;
    label?: ReactNode;
    loading?: boolean;
    /** How many avatars to draw while loading; `max` when left out */
    count?: number;
    className?: string;
}) =>
{
    const shown = loading || people === undefined ? [] : people.slice(0, max);
    const rest = (total ?? people?.length ?? 0) - shown.length;
    const group = (
        <AvatarGroup className={label === undefined ? className : undefined}>
            {loading && Array.from({ length: count }, (_, index) => (
                <Avatar key={index}>
                    <AvatarFallback />
                </Avatar>
            ))}
            {loading && (more !== undefined || (total !== undefined && total > count)) && <AvatarGroupCount />}
            {shown.map((person, index) => (
                <Avatar key={`${index}-${person.initials}`} aria-label={person.name}>
                    {person.image !== undefined && <AvatarImage src={person.image} alt="" />}
                    <AvatarFallback>{person.initials}</AvatarFallback>
                </Avatar>
            ))}
            {!loading && (more !== undefined ? <AvatarGroupCount>{more}</AvatarGroupCount> : rest > 0 && <AvatarGroupCount>+{rest}</AvatarGroupCount>)}
        </AvatarGroup>
    );

    return label === undefined ? group : (
        <div className={cn("flex items-center gap-2", className)}>
            {group}
            <span className={NOTE}>{loading ? <PendingText length={9} /> : label}</span>
        </div>
    );
};
