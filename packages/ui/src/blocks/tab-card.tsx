"use client";

import type { ReactNode } from "react";

import { Card } from "@hathway/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hathway/ui/components/tabs";
import { FOOTER_BAND, TOOLBAR_BAND } from "@hathway/ui/blocks/lib/bands";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { META } from "@hathway/ui/blocks/lib/text";
import { cn } from "@hathway/ui/lib/utils";

export type TabCardTab = { value: string; label: string; count?: ReactNode; content?: ReactNode };

/**
 * A card of panels behind tabs: the tabs with their counts and the controls in the toolbar, the open panel
 * scrolling inside the card, and a footer with a summary on one side and an action on the other. Each tab brings
 * its own panel (a table, a list); a tab without `content` opens nothing yet. `loading` draws bars for the tab
 * counts and the summary; the tabs, the controls and the footer action stay, and a panel is the caller's, which
 * passes `loading` to the table or the list inside.
 */
export const TabCard = ({
    tabs,
    defaultTab,
    onTabChange,
    controls,
    summary,
    footerAction,
    loading,
    className,
}: {
    tabs: readonly TabCardTab[];
    defaultTab?: string;
    onTabChange?: (value: string) => void;
    /** The toolbar's right side: search and filters */
    controls?: ReactNode;
    /** The footer's left side ("Showing 10 of 18 members") */
    summary?: ReactNode;
    /** The footer's right side */
    footerAction?: ReactNode;
    /** The waiting face: counts and a summary that were passed (any value) keep their places */
    loading?: boolean;
    className?: string;
}) => (
    <Card {...pendingFrame(loading)} className={cn("min-h-0 min-w-0 flex-1 gap-0 py-0", className)}>
        <Tabs defaultValue={defaultTab ?? tabs[0]?.value} onValueChange={onTabChange && ((value) => onTabChange(String(value)))} className="min-h-0 flex-1 gap-0">
            <div className={TOOLBAR_BAND}>
                <TabsList>
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                            {tab.count !== undefined && <span className={META}>{loading ? <PendingText length={2} /> : tab.count}</span>}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {controls !== undefined && <div className="flex flex-wrap items-center gap-2">{controls}</div>}
            </div>
            {tabs.filter((tab) => tab.content !== undefined).map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="min-h-0 overflow-y-auto">{tab.content}</TabsContent>
            ))}
        </Tabs>
        {(summary !== undefined || footerAction !== undefined) && (
            <div className={FOOTER_BAND}>
                {summary !== undefined && <span className={META}>{loading ? <PendingText length={28} /> : summary}</span>}
                {footerAction}
            </div>
        )}
    </Card>
);
