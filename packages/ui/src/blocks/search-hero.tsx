"use client";

import type { ReactNode } from "react";

import { Search } from "@hathway/ui/icons";

import { Badge } from "@hathway/ui/components/badge";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@hathway/ui/components/input-group";
import { Kbd } from "@hathway/ui/components/kbd";
import { HEADING_XL, LEAD, NOTE } from "@hathway/ui/blocks/lib/copy";
import { BARS_ON_MUTED, PendingText, pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";
import { strings } from "@hathway/ui/strings";

/**
 * The band at the top of a help center or a directory, centred on one large search field: a status badge, the
 * greeting as the page's title, a sentence under it, the field with its shortcut and its button, and a line of
 * suggested searches. Use it where searching is the first thing to do on the page. `loading` draws bars for the
 * title and the sentence and `suggestionCount` empty badges for the suggestions; the badge the caller passes and the
 * search field, which wait for nothing, stay.
 */
export const SearchHero = ({
    status,
    title,
    description,
    searchLabel = strings.blocks.search.label,
    placeholder,
    shortcut,
    submitLabel = strings.blocks.search.submit,
    suggestionsLabel,
    suggestions,
    value,
    onValueChange,
    onSubmit,
    loading,
    suggestionCount = 4,
    className,
}: {
    /** A badge over the title: the service's state */
    status?: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
    /** Names the field for assistive technology */
    searchLabel?: string;
    placeholder?: string;
    /** The keys that focus the field ("⌘ K") */
    shortcut?: string;
    submitLabel?: string;
    /** What the suggestions are ("Popular:") */
    suggestionsLabel?: string;
    suggestions?: readonly string[];
    value?: string;
    onValueChange?: (value: string) => void;
    onSubmit?: () => void;
    loading?: boolean;
    /** How many suggestions to draw while loading, when `suggestions` are passed (any value) */
    suggestionCount?: number;
    className?: string;
}) => (
    <section {...pendingFrame(loading)} className={cn("flex flex-col items-center gap-4 border-b border-border bg-muted px-6 py-10 text-center", BARS_ON_MUTED, className)}>
        {status}
        <h1 className={cn("m-0", HEADING_XL)}>{loading ? <PendingText length={20} /> : title}</h1>
        {description !== undefined && <p className={LEAD}>{loading ? <PendingText length={64} /> : description}</p>}
        <InputGroup className="h-12 w-full max-w-[40rem] bg-background">
            <InputGroupAddon>
                <Search />
            </InputGroupAddon>
            <InputGroupInput aria-label={searchLabel} placeholder={placeholder} value={value} onChange={onValueChange && ((event) => onValueChange(event.target.value))} />
            <InputGroupAddon align="inline-end">
                {shortcut !== undefined && <InputGroupText><Kbd>{shortcut}</Kbd></InputGroupText>}
                <InputGroupButton variant="default" size="sm" onClick={onSubmit}>{submitLabel}</InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
        {suggestions !== undefined && (
            <div className="flex flex-wrap items-center justify-center gap-2">
                {suggestionsLabel !== undefined && <span className={NOTE}>{suggestionsLabel}</span>}
                {loading && Array.from({ length: suggestionCount }, (_, index) => <Badge key={index} variant="outline"><PendingText length={10} /></Badge>)}
                {!loading && suggestions.map((term) => <Badge key={term} variant="outline">{term}</Badge>)}
            </div>
        )}
    </section>
);
