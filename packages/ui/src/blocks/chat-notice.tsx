import type { ReactNode } from "react";

import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

/**
 * A note from the system in the middle of a conversation, in a dashed outline: when the session started, what changed
 * between two messages. `loading` keeps the outline and the icon and draws a bar for the words. The note is as wide
 * as its words, so it carries no frame of its own: the pane the conversation scrolls in is the frame.
 */
export const ChatNotice = ({ icon, loading, children, className }: { icon?: ReactNode; loading?: boolean; children?: ReactNode; className?: string }) => (
    <div className={cn(NOTE, "flex items-center gap-2 self-center rounded-[var(--radius-lg)] border border-dashed border-border px-3 py-2 [&_svg]:size-[var(--control-icon-size-md)]", className)}>
        {icon}
        <span>{loading ? <PendingText length={48} /> : children}</span>
    </div>
);
