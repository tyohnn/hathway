"use client";

import { Search } from "@hathway/ui/icons";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@hathway/ui/components/input-group";
import { cn } from "@hathway/ui/lib/utils";
import { strings } from "@hathway/ui/strings";

/** The search field of a table's toolbar. `label` names it for assistive technology (the locale's "Search" when left out); the placeholder says what it searches. */
export const TableSearch = ({ label = strings.blocks.search.label, placeholder, value, onValueChange, className }: { label?: string; placeholder?: string; value?: string; onValueChange?: (value: string) => void; className?: string }) => (
    <InputGroup className={cn("w-56", className)}>
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput aria-label={label} placeholder={placeholder} value={value} onChange={onValueChange && ((event) => onValueChange(event.target.value))} />
    </InputGroup>
);
