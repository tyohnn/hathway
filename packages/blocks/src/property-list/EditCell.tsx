"use client";

import { useRef, useState } from "react";

import { Badge } from "@investment/ui/components/badge";
import { Button } from "@investment/ui/components/button";
import { Calendar } from "@investment/ui/components/calendar";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@investment/ui/components/command";
import { Input } from "@investment/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@investment/ui/components/popover";
import { Separator } from "@investment/ui/components/separator";
import { Textarea } from "@investment/ui/components/textarea";
import { Check, ChevronDown, Lock, Plus, X } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { editKeyIntent } from "../editing";
import { StatusBadge } from "../status-badge";
import {
    canCommitTransition,
    formatDay,
    parseDay,
    shouldCommit,
    toggleChoice,
    transitionChoices,
} from "./edit";
import type {
    DateEdit,
    MultiEdit,
    PropertyListLabels,
    PropertyOption,
    SelectEdit,
    TextEdit,
    TransitionEdit,
} from "./types";

/**
 * 그 자리에서 고치는 칸들.
 *
 * ⚠ **읽는 모양과 고치는 모양의 높이가 같다.** 다르면 누를 때마다 아래가 밀려서, 칸 셋을
 * 잇따라 고치는 동안 눈이 따라가야 할 자리가 계속 움직인다. 그래서 읽는 자리도 고치는 자리도
 * 같은 높이(`--control-height-sm`)를 쓴다.
 *
 * ⚠ **저장 단추가 없다.** 벗어나면 저장하고 Esc 로 되돌린다. 단추를 두면 「고치기」 모드가
 * 다시 생기고, 칸 하나를 고치려고 모드를 여닫는 일이 남는다.
 */

/** 읽는 자리와 고치는 자리가 나눠 쓰는 높이. 3층의 컨트롤 높이를 그대로 읽는다 */
const CELL_HEIGHT = "min-h-(--control-height-sm)";

/** 누르면 고쳐지는 자리. 배경만으로 「여기는 누른다」를 말한다 */
function ReadTrigger(
    { label, children, ...props }: Readonly<{ label: string }> & React.ComponentProps<"button">,
)
{
    return (
        <button
            type="button"
            aria-label={label}
            {...props}
            className={cn(
                "-mx-2 flex max-w-full items-center gap-2 rounded-[var(--control-radius)] px-2 py-1 text-left",
                CELL_HEIGHT,
                "hover:bg-muted-soft focus-visible:bg-muted-soft focus-visible:outline-none",
                props.className,
            )}
        >
            {children}
        </button>
    );
}

/** 고를 거리 한 줄. tone 이 있으면 배지로 서고 없으면 글자로 선다 */
function OptionLabel({ option }: Readonly<{ option: PropertyOption }>)
{
    return (
        <span className="flex min-w-0 items-center gap-2">
            {option.tone === undefined
                ? <span className="truncate">{option.label}</span>
                : <StatusBadge tone={option.tone} label={option.label} dot />}
            {option.description === undefined
                ? null
                : (
                    <span className="truncate text-[length:var(--ui-text-sm)] text-muted-foreground">
                        {option.description}
                    </span>
                )}
        </span>
    );
}

/** ① 글 · 수 — 누르면 테두리 없는 칸이 그 자리에 선다 */
export function TextCell(
    { edit, label, text, children }: Readonly<{
        edit: TextEdit;
        label: string;
        text: PropertyListLabels;
        children: React.ReactNode;
    }>,
)
{
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(edit.value);
    /** 되돌리고 빠져나갈 때 blur 가 뒤따라 저장하지 않게 막는다 */
    const settled = useRef(false);

    const open = () =>
    {
        setDraft(edit.value);
        settled.current = false;
        setEditing(true);
    };

    const close = (save: boolean) =>
    {
        if (settled.current)
        {
            return;
        }

        settled.current = true;
        setEditing(false);

        if (save && shouldCommit(draft, edit.value))
        {
            edit.onCommit(draft.trim());
        }
    };

    if (!editing)
    {
        return (
            <ReadTrigger label={text.edit(label)} onClick={open} className={edit.multiline === true ? "items-start" : ""}>
                <span className={cn("min-w-0", edit.multiline === true ? "whitespace-pre-line" : "truncate")}>
                    {children}
                </span>
            </ReadTrigger>
        );
    }

    const onKeyDown = (event: React.KeyboardEvent) =>
    {
        const intent = editKeyIntent(event.key, {
            multiline: edit.multiline,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
        });

        if (intent === "none")
        {
            return;
        }

        event.preventDefault();
        close(intent === "commit");
    };

    const common = {
        autoFocus: true,
        value: draft,
        "aria-label": text.edit(label),
        placeholder: edit.placeholder,
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
        onBlur: () => close(true),
        onKeyDown,
    };

    /* ⚠ 테두리를 지우고 면과 초점 고리만 남긴다. 테두리가 서면 그 폭만큼 아래가 밀린다 */
    return edit.multiline === true
        ? <Textarea {...common} className="min-h-20 border-0 bg-background shadow-none ring-1 ring-ring-focus" />
        : <Input {...common} className="h-(--control-height-sm) border-0 bg-background shadow-none ring-1 ring-ring-focus" />;
}

/** ② 날짜 — 눌러서 달력 */
export function DateCell(
    { edit, label, text, children }: Readonly<{
        edit: DateEdit;
        label: string;
        text: PropertyListLabels;
        children: React.ReactNode;
    }>,
)
{
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<ReadTrigger label={text.edit(label)}>{children}</ReadTrigger>} />
            <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                    mode="single"
                    autoFocus
                    selected={parseDay(edit.value)}
                    defaultMonth={parseDay(edit.value)}
                    onSelect={(day) =>
                    {
                        setOpen(false);
                        edit.onCommit(day === undefined ? null : formatDay(day));
                    }}
                />
                {edit.value === undefined
                    ? null
                    : (
                        <div className="border-t border-border p-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="w-full"
                                onClick={() =>
                                {
                                    setOpen(false);
                                    edit.onCommit(null);
                                }}
                            >
                                {text.clear}
                            </Button>
                        </div>
                    )}
            </PopoverContent>
        </Popover>
    );
}

/** ③ 하나 고르기 */
export function SelectCell(
    { edit, label, text, children }: Readonly<{
        edit: SelectEdit;
        label: string;
        text: PropertyListLabels;
        children: React.ReactNode;
    }>,
)
{
    const [open, setOpen] = useState(false);

    const choose = (value: string | null) =>
    {
        setOpen(false);

        if (value !== edit.value)
        {
            edit.onCommit(value);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={(
                    <ReadTrigger label={text.choose(label)}>
                        {children}
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    </ReadTrigger>
                )}
            />
            <PopoverContent align="start" className="w-56 p-0">
                <Command>
                    <CommandInput placeholder={text.search} />
                    <CommandList>
                        <CommandEmpty>{text.noResults}</CommandEmpty>
                        <CommandGroup>
                            {edit.options.map((option) => (
                                <CommandItem key={option.value} value={option.label} onSelect={() => choose(option.value)}>
                                    <Check className={cn("size-4", option.value === edit.value ? "" : "invisible")} />
                                    <OptionLabel option={option} />
                                </CommandItem>
                            ))}
                            {edit.clearable === true && (
                                <CommandItem value={text.clear} onSelect={() => choose(null)}>
                                    <Check className="invisible size-4" />
                                    <span className="text-muted-foreground">{text.clear}</span>
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

/**
 * ④ 여럿 고르기 — 칩과 더하기.
 *
 * ⚠ **값을 칩으로 그리는 것은 이 칸뿐이다.** 나머지 갈래는 `Property.value` 가 그려 둔 것을
 * 그대로 들고 서는데, 여기는 하나씩 빼는 자리가 칩마다 있어야 해서 블록이 직접 그린다.
 */
export function MultiCell(
    { edit, label, text }: Readonly<{ edit: MultiEdit; label: string; text: PropertyListLabels }>,
)
{
    const [open, setOpen] = useState(false);
    const labels = new Map(edit.options.map((option) => [option.value, option.label]));

    return (
        <div className={cn("flex min-w-0 flex-wrap items-center gap-1", CELL_HEIGHT)}>
            {edit.value.map((value) => (
                <Badge key={value} variant="secondary" className="gap-1 pr-1">
                    {labels.get(value) ?? value}
                    <button
                        type="button"
                        aria-label={text.remove(labels.get(value) ?? value)}
                        className="rounded-[var(--control-radius)] hover:text-foreground"
                        onClick={() => edit.onCommit(toggleChoice(edit.value, value, edit.max))}
                    >
                        <X className="size-3" />
                    </button>
                </Badge>
            ))}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    render={(
                        <Button size="icon-sm" variant="ghost" aria-label={text.add(label)}>
                            <Plus />
                        </Button>
                    )}
                />
                <PopoverContent align="start" className="w-56 p-0">
                    <Command>
                        <CommandInput placeholder={text.search} />
                        <CommandList>
                            <CommandEmpty>{text.noResults}</CommandEmpty>
                            <CommandGroup>
                                {edit.options.map((option) => (
                                    <CommandItem
                                        key={option.value}
                                        value={option.label}
                                        onSelect={() => edit.onCommit(toggleChoice(edit.value, option.value, edit.max))}
                                    >
                                        <Check
                                            className={cn("size-4", edit.value.includes(option.value) ? "" : "invisible")}
                                        />
                                        <OptionLabel option={option} />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

/**
 * ⑤ 전이 — 허용된 곳만 서고 사유를 받는다.
 *
 * ⚠ **고르는 것이 곧 확정이다.** 확인 단추를 두면 그것이 저장 단추가 되고, 규칙 하나가 이 칸에서만
 * 깨진다. 사유를 반드시 받는 전이는 사유를 적기 전까지 갈 곳이 눌리지 않는다 — 단추를 잠그는
 * 대신 갈 곳을 잠근다.
 */
export function TransitionCell(
    { edit, label, text, children }: Readonly<{
        edit: TransitionEdit;
        label: string;
        text: PropertyListLabels;
        children: React.ReactNode;
    }>,
)
{
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState("");
    const choices = transitionChoices(edit);

    const change = (next: string) =>
    {
        setOpen(false);
        setReason("");
        edit.onCommit(next, reason.trim());
    };

    return (
        <Popover
            open={open}
            onOpenChange={(next) =>
            {
                setOpen(next);

                if (!next)
                {
                    setReason("");
                }
            }}
        >
            <PopoverTrigger
                render={(
                    <ReadTrigger label={text.transitionTitle(label)}>
                        {children}
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                    </ReadTrigger>
                )}
            />
            <PopoverContent align="start" className="w-80">
                <div className="flex flex-col gap-1">
                    {choices.map((option) =>
                    {
                        const allowed = canCommitTransition(edit, option.value, reason);

                        return (
                            <button
                                key={option.value}
                                type="button"
                                disabled={!allowed}
                                onClick={() => change(option.value)}
                                className={cn(
                                    "flex items-center gap-2 rounded-[var(--control-radius)] px-2 py-1.5 text-left",
                                    allowed ? "hover:bg-muted-soft" : "opacity-50",
                                )}
                            >
                                <OptionLabel option={option} />
                            </button>
                        );
                    })}
                </div>
                {edit.reason === "none"
                    ? null
                    : (
                        <>
                            <Separator className="my-2" />
                            <Input
                                value={reason}
                                aria-label={text.reason}
                                placeholder={text.reason}
                                className="h-(--control-height-sm)"
                                onChange={(event) => setReason(event.target.value)}
                            />
                        </>
                    )}
            </PopoverContent>
        </Popover>
    );
}

/** ⑥ 잠김 — 못 누르고 까닭이 붙는다 */
export function LockedCell({ reason, children }: Readonly<{ reason: string; children: React.ReactNode }>)
{
    return (
        <span className={cn("flex min-w-0 items-center gap-2 text-muted-foreground", CELL_HEIGHT)}>
            <span className="min-w-0 truncate">{children}</span>
            <Lock className="size-3.5 shrink-0" aria-hidden />
            <span className="text-[length:var(--ui-text-xs)]">{reason}</span>
        </span>
    );
}

/** ⑦ 셈한 값 — 커서가 서지 않는다 */
export function DerivedCell({ from, children }: Readonly<{ from?: string; children: React.ReactNode }>)
{
    return (
        <span className={cn("flex min-w-0 items-center gap-2", CELL_HEIGHT)}>
            <span className="min-w-0 truncate">{children}</span>
            {from === undefined
                ? null
                : <span className="shrink-0 text-[length:var(--ui-text-xs)] text-muted-foreground">{from}</span>}
        </span>
    );
}
