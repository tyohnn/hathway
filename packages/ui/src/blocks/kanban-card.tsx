import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { Progress, ProgressValue } from "@hathway/ui/components/progress";
import { Badge } from "@hathway/ui/components/badge";
import { IconMeta } from "@hathway/ui/blocks/icon-meta";
import { PendingText } from "@hathway/ui/blocks/pending";
import { META } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

/**
 * One item on a board (KanbanBoard): its key and title with the item's menu in the corner, a row of badges, how
 * far along it is, and at the bottom the people on it and a few counted facts (checklist, comments, due date).
 * It keeps its height in a scrolling column. `loading` draws a bar for the title and, for each part that is passed
 * (any value), its waiting face: a bar for the key, one empty badge, an empty progress bar with a bar for its label,
 * and a bar behind each fact's icon; the menu and the people the caller passes stay. It carries no frame attributes
 * of its own: the board is the frame.
 */
export const KanbanCard = ({
    code,
    title,
    action,
    badges,
    progress,
    people,
    facts,
    loading,
    className,
}: {
    /** The item's key, set in the mono stack over the title ("RM-212") */
    code?: ReactNode;
    title?: ReactNode;
    /** The header's corner: the item's menu button */
    action?: ReactNode;
    /** Badges under the title: priority, areas */
    badges?: ReactNode;
    /** A progress bar with what it measures on one side and the percentage on the other; `name` names it for assistive technology. `true` is enough while loading. */
    progress?: { value: number; label: ReactNode; name: string } | true;
    /** The footer's left side: an AvatarStack */
    people?: ReactNode;
    /** The footer's right side: short facts, each behind its icon */
    facts?: readonly { icon: ReactNode; text?: ReactNode }[];
    loading?: boolean;
    className?: string;
}) => (
    <Card size="sm" className={cn("shrink-0", className)}>
        <CardHeader>
            {code !== undefined && <CardDescription className="font-mono text-[length:var(--ui-text-sm)]">{loading ? <PendingText length={6} /> : code}</CardDescription>}
            <CardTitle>{loading ? <PendingText length={24} /> : title}</CardTitle>
            {action !== undefined && <CardAction>{action}</CardAction>}
        </CardHeader>
        {(badges !== undefined || progress !== undefined) && (
            <CardContent className="flex flex-col gap-3">
                {badges !== undefined && <div className="flex flex-wrap items-center gap-1.5">{loading ? <Badge variant="outline"><PendingText length={7} /></Badge> : badges}</div>}
                {progress !== undefined && loading && (
                    <Progress value={0} aria-hidden>
                        <span className={META}><PendingText length={8} /></span>
                        <span className={cn(META, "ml-auto")}><PendingText length={3} /></span>
                    </Progress>
                )}
                {progress !== undefined && !loading && progress !== true && (
                    <Progress value={progress.value} aria-label={progress.name}>
                        <span className={META}>{progress.label}</span>
                        <ProgressValue className={cn(META, "ml-auto")} />
                    </Progress>
                )}
            </CardContent>
        )}
        {(people !== undefined || facts !== undefined) && (
            <CardFooter className="flex items-center justify-between gap-2">
                {people}
                {facts !== undefined && (
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        {facts.map((fact, index) => <IconMeta key={index} icon={fact.icon}>{loading ? <span><PendingText length={4} /></span> : fact.text}</IconMeta>)}
                    </div>
                )}
            </CardFooter>
        )}
    </Card>
);
