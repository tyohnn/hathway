"use client";

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupTextarea,
} from "@investment/ui/components/input-group";
import { Kbd } from "@investment/ui/components/kbd";
import { ArrowUp, Paperclip } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { PROMPT_INPUT_LABELS } from "./labels";
import type { PromptInputProps } from "./types";

/**
 * 에이전트에게 말을 실어 보내는 칸.
 *
 * ⚠ **`InputGroup` 한 벌로 선다.** 테두리와 높이와 안쪽 여백은 3층(`input-group.css`)이 갖고
 *    블록이 정하는 것은 무엇이 어느 자리에 서는가뿐이다. `block-end` 가 칸 아래 한 줄을 통째로 연다.
 *
 * ⚠ **Skeleton 이 없다.** 이 칸은 데이터를 기다리지 않는다. 대화가 오기 전에도 그대로 서 있고,
 *    기다리는 동안 대신 그릴 모양이 자기 자신이다. `ActionBar` 와 `FormSheet` 이 Skeleton 을 두지
 *    않는 것과 같은 판단이고 까닭만 다르다.
 *
 * ⚠ **보내는 열쇠가 칸에 적힌 그대로다.** 칸 오른쪽에 ⌘↵ 가 서 있으므로 엔터 혼자로는 보내지 않고
 *    줄을 바꾼다. 적힌 것과 다르게 동작하면 사람이 문서를 적다가 절반만 보내는 일이 생긴다.
 */
export function PromptInput({
    placeholder,
    value,
    defaultValue,
    onValueChange,
    onSubmit,
    onAttach,
    disabled = false,
    tools,
    hint,
    rows = 3,
    labels,
    className,
}: PromptInputProps)
{
    const text = { ...PROMPT_INPUT_LABELS, ...labels };

    return (
        <div data-slot="prompt-input" className={cn("flex shrink-0 flex-col gap-2", className)}>
            <InputGroup>
                <InputGroupTextarea
                    aria-label={text.input}
                    placeholder={placeholder}
                    rows={rows}
                    disabled={disabled}
                    {...(value === undefined ? { defaultValue } : { value })}
                    onChange={(event) => onValueChange?.(event.target.value)}
                    onKeyDown={(event) =>
                    {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey))
                        {
                            event.preventDefault();
                            onSubmit?.();
                        }
                    }}
                />

                <InputGroupAddon align="block-end">
                    {onAttach === undefined
                        ? null
                        : (
                            <InputGroupButton
                                size="icon-sm"
                                aria-label={text.attach}
                                disabled={disabled}
                                onClick={onAttach}
                            >
                                <Paperclip />
                            </InputGroupButton>
                        )}

                    {tools}

                    <InputGroupText className="ml-auto">
                        <Kbd>{text.shortcut[0]}</Kbd>
                        <Kbd>{text.shortcut[1]}</Kbd>
                    </InputGroupText>

                    <InputGroupButton
                        size="icon-sm"
                        variant="default"
                        aria-label={text.send}
                        disabled={disabled}
                        onClick={onSubmit}
                    >
                        <ArrowUp />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>

            {hint === undefined
                ? null
                : (
                    <p className="px-1 text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)] text-muted-foreground">
                        {hint}
                    </p>
                )}
        </div>
    );
}
