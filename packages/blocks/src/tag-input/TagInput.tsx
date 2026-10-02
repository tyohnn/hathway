"use client";

import { useState } from "react";

import { Badge } from "@investment/ui/components/badge";
import { X } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { TAG_INPUT_LABELS } from "./labels";
import { mergeTags, splitTags } from "./tags";
import type { TagInputProps } from "./types";

/**
 * 값 여러 개를 칩으로 담는 입력.
 *
 * 칩은 Badge 그대로이고, 블록은 입력 면·추가·삭제·붙여넣기 분리만 맡는다.
 * 입력 면은 Input Group 에 그릇(슬롯)이 없어 직접 그렸다 — 색·모서리·테두리는 토큰이다.
 * 나누는 규칙은 tags.ts 에 있고 화면을 모른다.
 */
export function TagInput({
    value,
    onValueChange,
    placeholder,
    label,
    max,
    size = "default",
    disabled = false,
    validate,
    labels,
    className,
}: TagInputProps)
{
    const text = { ...TAG_INPUT_LABELS, ...labels };
    const [draft, setDraft] = useState("");
    const [message, setMessage] = useState<string | null>(null);

    const commit = (raw: string) =>
    {
        const parts = splitTags(raw);

        if (parts.length === 0)
        {
            return;
        }

        const invalid = validate === undefined
            ? null
            : parts.map((part) => validate(part)).find((result) => result !== null) ?? null;

        if (invalid !== null)
        {
            setMessage(invalid);
            return;
        }

        const result = mergeTags(value, parts, max);

        if (result.overflow.length > 0 && max !== undefined)
        {
            setMessage(text.overflow(max));
        }
        else if (result.duplicates.length > 0)
        {
            setMessage(text.duplicate(result.duplicates[0]));
        }
        else
        {
            setMessage(null);
        }

        if (result.value.length !== value.length)
        {
            onValueChange(result.value);
        }

        setDraft("");
    };

    const remove = (tag: string) =>
    {
        setMessage(null);
        onValueChange(value.filter((item) => item !== tag));
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) =>
    {
        if (event.key === "Enter" || event.key === ",")
        {
            event.preventDefault();
            commit(draft);
            return;
        }

        if (event.key === "Backspace" && draft === "" && value.length > 0)
        {
            remove(value[value.length - 1]);
        }
    };

    return (
        <div data-slot="tag-input" className={cn("flex flex-col gap-[var(--surface-gap)]", className)}>
            <div
                data-disabled={disabled ? "" : undefined}
                className={cn(
                    "flex flex-wrap items-center gap-[var(--control-gap-xs)] border border-input bg-background",
                    "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
                    disabled ? "cursor-not-allowed opacity-50" : "",
                )}
                style={{
                    borderRadius: "var(--control-radius)",
                    borderWidth: "var(--control-border-width)",
                    minHeight: size === "sm" ? "var(--control-height-sm)" : "var(--control-height-md)",
                    paddingInline: size === "sm" ? "var(--control-padding-x-sm)" : "var(--control-padding-x-md)",
                    paddingBlock: "var(--menu-padding)",
                }}
            >
                {value.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-[var(--control-gap-xs)]">
                        {tag}
                        <button
                            type="button"
                            aria-label={text.remove(tag)}
                            disabled={disabled}
                            className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            onClick={() => remove(tag)}
                        >
                            <X className="size-3" aria-hidden />
                        </button>
                    </Badge>
                ))}
                <input
                    value={draft}
                    aria-label={label ?? placeholder ?? text.input}
                    placeholder={value.length === 0 ? placeholder : undefined}
                    disabled={disabled || (max !== undefined && value.length >= max)}
                    className="min-w-24 flex-1 bg-transparent text-[length:var(--ui-text-md)] outline-none placeholder:text-muted-foreground"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={() => commit(draft)}
                    onPaste={(event) =>
                    {
                        event.preventDefault();
                        commit(event.clipboardData.getData("text"));
                    }}
                />
            </div>
            {message === null
                ? null
                : (
                    <span role="status" className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-destructive">
                        {message}
                    </span>
                )}
        </div>
    );
}
