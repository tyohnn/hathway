"use client";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@investment/ui/components/card";
import { ArrowDown, ArrowUp } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { GLYPH_COLOR, TONE_TEXT } from "../tone";
import type { StatCardProps } from "./types";

/**
 * 지표 하나를 담는 카드.
 *
 * 면과 여백은 Card 그대로이고 블록이 더하는 것은 수치의 크기(2층 heading 축의 lg)와
 * 증감 표시뿐이다. 방향과 tone 을 따로 받는 이유는 types.ts 에 적었다.
 */
export function StatCard({ label, value, description, icon, trend, action, size = "sm", className }: StatCardProps)
{
    const TrendIcon = trend?.direction === "down" ? ArrowDown : ArrowUp;

    return (
        <Card size={size} data-slot="stat-card" className={className}>
            <CardHeader>
                <CardTitle className={icon === undefined ? undefined : "flex items-center gap-[var(--control-gap-sm)]"}>
                    {icon === undefined
                        ? null
                        : (
                            <span
                                data-slot="stat-card-icon"
                                aria-hidden
                                className={cn("flex shrink-0 items-center [&_svg:not([class*='size-'])]:size-[var(--control-icon-size-md)]", GLYPH_COLOR)}
                            >
                                {icon}
                            </span>
                        )}
                    {label}
                </CardTitle>
                {description === undefined ? null : <CardDescription>{description}</CardDescription>}
                {action === undefined ? null : <CardAction>{action}</CardAction>}
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-[var(--control-gap-sm)]">
                    <span
                        className="text-[length:var(--heading-font-size-lg)] leading-[var(--heading-line-height-lg)] tracking-[var(--heading-letter-spacing)] text-foreground"
                        style={{ fontWeight: "var(--ui-font-weight)" }}
                    >
                        {value}
                    </span>
                    {trend === undefined
                        ? null
                        : (
                            <span
                                data-tone={trend.tone ?? "neutral"}
                                className={cn("flex shrink-0 items-center self-center", TONE_TEXT[trend.tone ?? "neutral"])}
                            >
                                <TrendIcon className="size-4" aria-hidden />
                                {trend.label === undefined ? null : <span className="sr-only">{trend.label}</span>}
                            </span>
                        )}
                </div>
            </CardContent>
        </Card>
    );
}
