import { Fragment, type ReactNode } from "react";

import { Separator } from "@hathway/ui/components/separator";
import { NOTE } from "@hathway/ui/blocks/lib/copy";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";

export type DetailSection = { id: string; title: ReactNode; /** At the end of the title's line: a count ("4 of 6 passed") */ note?: ReactNode; content: ReactNode };

/**
 * The side column of a record's page: short titled sections with a hairline between them — who reviews, which
 * checks ran, labels, links — behind a divider on its start edge, scrolling on its own. A section's content is
 * its own rows (StatusLine, badges, links). Give the width and padding with `className`. `loading` draws a bar
 * for each section's note; the section titles stay, and the content is the caller's, which passes `loading` to
 * the rows inside.
 */
export const DetailSections = ({ sections, loading, className }: { sections: readonly DetailSection[]; loading?: boolean; className?: string }) => (
    <aside {...pendingFrame(loading)} className={cn("flex shrink-0 flex-col gap-5 overflow-y-auto border-l border-border", className)}>
        {sections.map((section, index) => (
            <Fragment key={section.id}>
                {index > 0 && <Separator />}
                <div className="flex flex-col gap-2">
                    {section.note === undefined
                        ? <span className={cn(NOTE, "font-semibold")}>{section.title}</span>
                        : (
                            <div className="flex items-center justify-between gap-2">
                                <span className={cn(NOTE, "font-semibold")}>{section.title}</span>
                                <span className={cn(NOTE, "whitespace-nowrap")}>{loading ? <PendingText length={10} /> : section.note}</span>
                            </div>
                        )}
                    {section.content}
                </div>
            </Fragment>
        ))}
    </aside>
);
