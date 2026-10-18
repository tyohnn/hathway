import type { ReactNode } from "react";

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@hathway/ui/components/avatar";
import { PendingText } from "@hathway/ui/blocks/pending";
import { META } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A person in a row or a cell: an avatar, the name and one line of detail (email, role) under it. `size="md"` is
 * the default avatar for a roster, `sm` the small one for a dense table. `online` puts the presence badge on the
 * avatar, `badges` follow the name ("You", "Suspended"), and `tone` picks the system's avatar tone for the initials.
 * `loading` keeps the avatar and draws bars for the words.
 */
export const Person = ({
    name,
    detail,
    initials,
    image,
    size = "sm",
    online,
    badges,
    tone,
    loading,
    className,
}: {
    name?: ReactNode;
    detail?: ReactNode;
    initials?: string;
    image?: string;
    size?: "sm" | "md";
    online?: boolean;
    badges?: ReactNode;
    tone?: string;
    /** Bars for the name — and for the detail when a `detail` is passed (any value) — next to an empty avatar */
    loading?: boolean;
    className?: string;
}) => (
    <div className={cn("flex items-center", size === "sm" ? "gap-2" : "gap-3", className)}>
        <Avatar size={size === "sm" ? "sm" : undefined}>
            {image !== undefined && <AvatarImage src={image} alt="" />}
            <AvatarFallback data-tone={tone}>{loading ? null : initials}</AvatarFallback>
            {online && <AvatarBadge />}
        </Avatar>
        <div className="flex min-w-0 flex-col">
            {loading ? <span><PendingText length={12} /></span> : badges === undefined ? <span>{name}</span> : <span className="flex items-center gap-2">{name}{badges}</span>}
            {loading ? detail !== undefined && <span className={META}><PendingText length={18} /></span> : detail !== undefined && <span className={META}>{detail}</span>}
        </div>
    </div>
);
