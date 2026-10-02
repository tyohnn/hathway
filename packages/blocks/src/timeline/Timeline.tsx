"use client";

import { Empty, EmptyDescription, EmptyHeader } from "@investment/ui/components/empty";
import { Circle, CircleCheck, Clock } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { TONE_TEXT } from "../tone";
import { TIMELINE_LABELS } from "./labels";
import type { TimelineEvent, TimelineProps } from "./types";

function defaultMarker(event: TimelineEvent)
{
    if (event.pending === true)
    {
        return <Clock className="size-4" aria-hidden />;
    }

    return event.tone === undefined || event.tone === "neutral"
        ? <Circle className="size-4" aria-hidden />
        : <CircleCheck className="size-4" aria-hidden />;
}

/**
 * 시간순 사건 목록.
 *
 * 사건의 제목·설명·시각은 글자 축을 그대로 읽고, 블록은 표식 열과 연결선만 맡는다.
 * 연결선은 프리미티브에 선 조각이 없어 직접 그린 사각형이고 두께는 surface/border-width 다.
 */
export function Timeline({ events, density = "default", empty, labels, className }: TimelineProps)
{
    const text = { ...TIMELINE_LABELS, ...labels };

    if (events.length === 0)
    {
        return (
            <div data-slot="timeline" data-empty className={className}>
                {empty ?? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyDescription>{text.empty}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        );
    }

    return (
        <ol data-slot="timeline" data-density={density} className={cn("flex flex-col", className)}>
            {events.map((event, index) => (
                <li key={event.id} className="flex gap-[var(--surface-icon-gap)]">
                    <div className="flex shrink-0 flex-col items-center">
                        <span
                            data-tone={event.tone ?? "neutral"}
                            className={cn(
                                "flex items-center justify-center",
                                TONE_TEXT[event.tone ?? "neutral"],
                                event.pending === true ? "text-muted-foreground" : "",
                            )}
                            style={{ width: "var(--control-indicator-size)", height: "var(--control-indicator-size)" }}
                        >
                            {event.marker ?? defaultMarker(event)}
                        </span>
                        {index < events.length - 1
                            ? (
                                <span
                                    aria-hidden
                                    className="flex-1 bg-border"
                                    style={{ width: "var(--surface-border-width)" }}
                                />
                            )
                            : null}
                    </div>
                    <div
                        className={cn(
                            "flex min-w-0 flex-col gap-[var(--surface-gap)]",
                            index < events.length - 1 ? "" : "pb-0",
                            density === "compact" ? "pb-[var(--surface-padding-sm)]" : "pb-[var(--surface-padding-md)]",
                            event.pending === true ? "opacity-70" : "",
                        )}
                    >
                        <span
                            className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground"
                            style={{ fontWeight: "var(--ui-font-weight)" }}
                        >
                            {event.title}
                        </span>
                        {event.at === undefined && event.description === undefined
                            ? null
                            : (
                                <span className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                                    {[event.at, event.description].filter((part) => part !== undefined).join(" — ")}
                                </span>
                            )}
                    </div>
                </li>
            ))}
        </ol>
    );
}
