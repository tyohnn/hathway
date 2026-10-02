"use client";

import { Badge } from "@investment/ui/components/badge";
import { cn } from "@investment/ui/lib/utils";

import { TONE_SURFACE } from "../tone";
import type { StatusBadgeProps } from "./types";

/**
 * 상태 값을 tone 으로 받아 그리는 배지.
 *
 * 상태 색 대응표가 화면마다 흩어져 같은 상태가 다른 색이던 것을 한 자리로 모은 블록이다.
 * Badge 에 tone 변형이 없어 secondary 인스턴스에 바탕과 글자만 덮는다.
 * `data-tone` 은 호출부가 CSS 로 더 잡을 자리로 남겨 둔다.
 */
export function StatusBadge({ tone = "neutral", label, dot = false, className }: StatusBadgeProps)
{
    return (
        <Badge
            variant="secondary"
            data-slot="status-badge"
            data-tone={tone}
            className={cn(TONE_SURFACE[tone], className)}
        >
            {dot
                ? (
                    <span
                        aria-hidden
                        className="shrink-0 rounded-full bg-current"
                        style={{ width: "var(--control-indicator-dot-size)", height: "var(--control-indicator-dot-size)" }}
                    />
                )
                : null}
            {label}
        </Badge>
    );
}
