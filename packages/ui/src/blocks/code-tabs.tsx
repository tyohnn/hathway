"use client";

import type { ReactNode } from "react";

import { CodeBlock } from "@hathway/ui/blocks/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hathway/ui/components/tabs";

export type CodeTab = {
    value: string;
    /** The tab's name: a package manager, a language */
    label: string;
    code?: string;
    /** The code block's title; the tab's name when left out */
    title?: ReactNode;
    /** The end of the code block's bar: a copy button */
    action?: ReactNode;
};

/**
 * The same code in several forms behind tabs, one code block per tab: an install command per package manager,
 * a request per language. For one piece of code use CodeBlock. `loading` keeps the tabs, which are the product's
 * words, and draws each code block's waiting face with `loadingLines` lines.
 */
export const CodeTabs = ({
    tabs,
    defaultTab,
    onTabChange,
    icon,
    size,
    loading,
    loadingLines,
    className,
}: {
    tabs: readonly CodeTab[];
    defaultTab?: string;
    onTabChange?: (value: string) => void;
    /** The icon in front of every code block's title */
    icon?: ReactNode;
    size?: "sm" | "md";
    loading?: boolean;
    /** How many lines of code to draw while loading */
    loadingLines?: number;
    className?: string;
}) => (
    <Tabs defaultValue={defaultTab ?? tabs[0]?.value} onValueChange={onTabChange && ((value) => onTabChange(String(value)))} className={className}>
        <TabsList>
            {tabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
        </TabsList>
        {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
                <CodeBlock title={tab.title ?? tab.label} icon={icon} code={tab.code} action={tab.action} size={size} loading={loading} loadingLines={loadingLines} />
            </TabsContent>
        ))}
    </Tabs>
);
