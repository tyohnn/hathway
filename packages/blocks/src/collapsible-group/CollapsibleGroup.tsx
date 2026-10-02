"use client";

import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@investment/ui/components/collapsible";
import { ChevronRight } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { TONE_SURFACE } from "../tone";
import { COLLAPSIBLE_GROUP_LABELS } from "./labels";
import type { CollapsibleGroupProps } from "./types";

/**
 * 제목과 수를 머리글에 두고 안쪽을 접었다 펴는 묶음.
 *
 * 챙길 것과 문서함과 제출 구획이 같은 모양을 되풀이해서 블록으로 굳혔다.
 * 여닫는 일과 aria-expanded · aria-controls 는 프리미티브 Collapsible 이 맡는다.
 * 블록이 더하는 것은 머리글의 짜임과 제어·비제어 두 모드다.
 *
 * ⚠ **수는 접혀 있어도 머리글에 남는다.** 접었을 때 수까지 사라지면 안쪽을 펴 보기 전에는
 *    그 묶음에 무엇이 남았는지 알 수 없고, 그러면 접는 것이 곧 잊는 것이 된다.
 *
 * ⚠ 액션은 여닫는 버튼 **밖**에 둔다. 안에 넣으면 버튼 안에 버튼이 들어가서 문서가
 *    어긋나고, 액션을 누를 때마다 묶음이 함께 여닫힌다.
 */
export function CollapsibleGroup({
    title,
    count,
    open,
    defaultOpen,
    onOpenChange,
    actions,
    tone = "neutral",
    children,
    labels,
    className,
}: CollapsibleGroupProps)
{
    const text = { ...COLLAPSIBLE_GROUP_LABELS, ...labels };

    // 비제어 모드의 상태를 블록이 갖는다. 프리미티브에 맡기면 머리글의 「펼치기 · 접기」
    // 문구가 지금 어느 쪽인지 알 수 없어서, 그 한 줄을 위해 상태를 여기서도 읽는다.
    const [innerOpen, setInnerOpen] = useState(defaultOpen ?? false);
    const isOpen = open ?? innerOpen;

    const change = (next: boolean) =>
    {
        if (open === undefined)
        {
            setInnerOpen(next);
        }

        onOpenChange?.(next);
    };

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={change}
            data-slot="collapsible-group"
            data-tone={tone}
            className={cn("flex flex-col gap-[var(--surface-gap)]", className)}
        >
            <div className="flex items-center gap-[var(--control-gap-sm)]">
                <CollapsibleTrigger
                    className="flex min-w-0 flex-1 items-center gap-[var(--control-gap-sm)] rounded-[var(--control-radius)] text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <ChevronRight
                        aria-hidden
                        className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            isOpen ? "rotate-90" : "",
                        )}
                    />
                    <span
                        className="min-w-0 truncate text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground"
                        style={{ fontWeight: "var(--ui-font-weight)" }}
                    >
                        {title}
                    </span>
                    {count === undefined
                        ? null
                        : (
                            <span
                                className={cn(
                                    "shrink-0 rounded-full px-[var(--control-padding-x-xs)] text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)] tabular-nums",
                                    TONE_SURFACE[tone],
                                )}
                            >
                                {text.count(count)}
                            </span>
                        )}
                    <span className="ml-auto shrink-0 text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                        {isOpen ? text.collapse : text.expand}
                    </span>
                </CollapsibleTrigger>
                {actions === undefined
                    ? null
                    : <div className="flex shrink-0 items-center gap-[var(--control-gap-sm)]">{actions}</div>}
            </div>

            <CollapsibleContent className="flex flex-col gap-[var(--surface-gap)]">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
}
