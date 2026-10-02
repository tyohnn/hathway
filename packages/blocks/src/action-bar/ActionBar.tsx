"use client";

import { Button } from "@investment/ui/components/button";
import { X } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { ACTION_BAR_LABELS } from "./labels";
import type { ActionBarProps } from "./types";

/**
 * 선택 수와 일괄 액션을 담은 띠.
 *
 * floating 은 화면 아래에 떠서 목록을 가리지 않고, inline 은 목록 위에 붙는다.
 * 선택이 0 이면 그리지 않는다 — 빈 띠가 자리를 차지하면 목록이 흔들린다.
 */
export function ActionBar({
    count,
    actions,
    placement = "floating",
    onClear,
    busy = false,
    labels,
    className,
}: ActionBarProps)
{
    const text = { ...ACTION_BAR_LABELS, ...labels };

    if (count === 0)
    {
        return null;
    }

    return (
        <div
            data-slot="action-bar"
            data-placement={placement}
            data-busy={busy ? "" : undefined}
            role="toolbar"
            aria-label={text.selected(count)}
            className={cn(
                "flex flex-wrap items-center gap-[var(--control-gap-sm)] border border-border bg-card",
                placement === "floating"
                    ? "fixed inset-x-0 bottom-6 z-50 mx-auto w-fit shadow-float"
                    : "w-full justify-between",
                className,
            )}
            style={{
                borderRadius: "var(--surface-radius)",
                borderWidth: "var(--surface-border-width)",
                padding: "var(--surface-padding-sm)",
            }}
        >
            <span className="px-[var(--menu-item-padding-x)] text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground">
                {text.selected(count)}
            </span>

            <div className="flex flex-wrap items-center gap-[var(--control-gap-sm)]">
                {actions.map((action) => (
                    <Button
                        key={action.id}
                        size="sm"
                        variant={action.tone === "danger" ? "destructive" : "secondary"}
                        disabled={busy || action.disabled === true}
                        onClick={action.onPress}
                    >
                        {action.label}
                    </Button>
                ))}
                {onClear === undefined
                    ? null
                    : (
                        <Button variant="ghost" size="sm" disabled={busy} onClick={onClear}>
                            <X />
                            {text.clear}
                        </Button>
                    )}
            </div>
        </div>
    );
}
