"use client";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@investment/ui/components/alert";
import { Button } from "@investment/ui/components/button";
import { CircleCheck, Info, TriangleAlert, X } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { TONE_TEXT, type Tone } from "../tone";
import { CALLOUT_LABELS } from "./labels";
import type { CalloutProps } from "./types";

/** tone 마다 아이콘이 다르다. 색만으로 구분되지 않아야 하기 때문이다 */
const TONE_ICON: Record<Tone, typeof Info> = {
    neutral: Info,
    info: Info,
    success: CircleCheck,
    warning: TriangleAlert,
    danger: TriangleAlert,
};

/**
 * 액션이 달린 배너.
 *
 * 면은 Alert 그대로이고 블록이 더하는 것은 tone 과 아이콘의 대응뿐이다.
 * 바탕을 옅은 색으로 채우지 않는 것은 Alert 의 destructive 규칙(바탕은 card, 글자만 색)을
 * 나머지 tone 으로 넓힌 것이다. 설명은 Alert 이 muted 로 낮춘다.
 */
export function Callout({ tone = "info", title, description, action, onDismiss, labels, className }: CalloutProps)
{
    const text = { ...CALLOUT_LABELS, ...labels };
    const Icon = TONE_ICON[tone];

    return (
        <Alert
            variant={tone === "danger" ? "destructive" : "default"}
            data-slot="callout"
            data-tone={tone}
            className={cn(TONE_TEXT[tone], className)}
        >
            <Icon />
            <AlertTitle>{title}</AlertTitle>
            {description === undefined ? null : <AlertDescription>{description}</AlertDescription>}
            {action === undefined && onDismiss === undefined
                ? null
                : (
                    <AlertAction className="flex items-center gap-[var(--control-gap-sm)]">
                        {action === undefined
                            ? null
                            : (
                                <Button variant="outline" size="xs" onClick={action.onPress}>
                                    {action.label}
                                </Button>
                            )}
                        {onDismiss === undefined
                            ? null
                            : (
                                <Button variant="ghost" size="icon-xs" aria-label={text.dismiss} onClick={onDismiss}>
                                    <X />
                                </Button>
                            )}
                    </AlertAction>
                )}
        </Alert>
    );
}
