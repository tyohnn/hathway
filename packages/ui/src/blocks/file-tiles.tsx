import type { ReactNode } from "react";

import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@hathway/ui/components/item";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type FileTile = {
    id: string;
    /** The icon of the file's kind */
    icon: ReactNode;
    name: string;
    /** One line under the name: type, size, who added it */
    meta?: ReactNode;
};

/**
 * A grid of small outlined tiles, each an icon with a name and one line of detail cut to the tile's width: recent
 * files, attachments. `loading` draws `count` tiles: the icon's place empty, bars for the name and the detail.
 */
export const FileTiles = ({
    files = [],
    loading,
    count = 4,
    className,
}: {
    files?: readonly FileTile[];
    loading?: boolean;
    /** How many tiles to draw while loading */
    count?: number;
    className?: string;
}) => (
    <div {...pendingFrame(loading)} className={cn("grid grid-cols-2 gap-2", className)}>
        {loading && Array.from({ length: count }, (_, index) => (
            <Item key={index} variant="outline" size="xs" className="min-w-0">
                <ItemMedia variant="icon"><span className="size-[var(--item-media-icon-size)]" /></ItemMedia>
                <ItemContent className="min-w-0">
                    <ItemTitle className="w-full truncate"><span><PendingText length={16} /></span></ItemTitle>
                    <ItemDescription className="truncate"><PendingText length={20} /></ItemDescription>
                </ItemContent>
            </Item>
        ))}
        {!loading && files.map((file) => (
            <Item key={file.id} variant="outline" size="xs" className="min-w-0">
                <ItemMedia variant="icon">{file.icon}</ItemMedia>
                <ItemContent className="min-w-0">
                    <ItemTitle className="w-full truncate">{file.name}</ItemTitle>
                    {file.meta !== undefined && <ItemDescription className="truncate">{file.meta}</ItemDescription>}
                </ItemContent>
            </Item>
        ))}
    </div>
);
