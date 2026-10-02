"use client";

import { cn } from "@investment/ui/lib/utils";

import type { ChatPaneProps } from "./types";

/**
 * 대화 기둥. 제 머리를 갖는다.
 *
 * ⚠ **머리를 셸에 맡기지 않는다**(2026-09-21 사용자 확정). 셸이 본문 위에 띠를 하나 그으면 그 띠가
 *    대화와 레일을 함께 덮어서, 그 띠에 적힌 제목이 무엇의 제목인지 읽히지 않는다. 제목은 지금 보고
 *    있는 대화의 것이므로 대화 위에 있어야 하고, 셸은 `layout="full"` 로 그 자리를 비워 준다.
 *
 * 높이는 48px 이다. 셸의 띠가 56px 인데, 그것은 화면 하나에 하나만 서는 띠의 높이이고 대화 위에
 * 앉는 머리는 그보다 얕아야 대화가 먼저 읽힌다.
 *
 * ⚠ **아래에 선을 긋지 않는다**(2026-09-22 사용자 확정). 대화는 이미 제 말풍선으로 자리가 갈리고
 *    오른쪽 카드는 제 테두리를 갖는다. 그 위에 가로줄을 하나 더 그으면 머리가 대화에서 떨어져
 *    나와 셸의 띠처럼 읽힌다.
 */
export function ChatPane({ title, lead, note, actions, scroll = true, children, className }: ChatPaneProps)
{
    return (
        <div data-slot="chat-pane" className={cn("flex min-h-0 flex-col", className)}>
            <div className="flex h-12 shrink-0 items-center gap-[var(--control-gap-sm)] px-4">
                {lead}
                <span
                    className="min-w-0 truncate text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)]"
                    style={{ fontWeight: "var(--ui-font-weight)" }}
                >
                    {title}
                </span>
                {note === undefined
                    ? null
                    : <span className="shrink-0 text-[length:var(--ui-text-xs)] text-muted-foreground">{note}</span>}
                {actions === undefined
                    ? null
                    : <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>}
            </div>

            {scroll
                ? <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                : <div className="flex min-h-0 flex-1 flex-col">{children}</div>}
        </div>
    );
}
