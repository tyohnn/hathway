"use client";

import { Bubble, BubbleContent } from "@investment/ui/components/bubble";
import { Button } from "@investment/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@investment/ui/components/card";
import {
    Message,
    MessageContent,
    MessageFooter,
} from "@investment/ui/components/message";
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from "@investment/ui/components/message-scroller";
import { ArrowDown, Check, ShieldCheck, X } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { PropertyList } from "../property-list/PropertyList";
import { ToolCalls } from "../tool-calls/ToolCalls";

import { CONVERSATION_LABELS, type ConversationLabels } from "./labels";
import type { ConversationProps, ConversationTurn } from "./types";

/*
 * 사람이 한 말과 에이전트가 한 말과 쓴 도구가 한 줄에 차례로 서는 대화.
 *
 * 생김새는 전부 3층이 갖는다(`message.css` · `bubble.css`). 블록이 더하는 것은 하나뿐이다.
 * 어느 쪽에 서는가.
 *
 * ⚠ **아바타도 들여쓰기도 없다**(2026-09-22 사람이 정함). 말하는 쪽이 둘뿐이고 한쪽은 이미 오른쪽에
 *    서 있어서, 아바타는 같은 말을 줄마다 되풀이하는 그림이었다. 그것이 빠지면서 도구 묶음을 40px
 *    들여쓰던 상수도 함께 없앴다. 맞출 폭이 사라졌다.
 *
 * ⚠ **에이전트의 말에는 말풍선이 없다.** 그 글이 이 화면의 본문이고, 본문에 면을 두르면 읽는 사람이
 *    그것을 하나의 덩어리로 훑는다. 사람이 적은 말만 풍선으로 남는데, 짧고 드물어서 대화에서 눈이
 *    걸릴 자리가 되어야 하기 때문이다.
 */

function Turn({ turn, text }: {
    readonly turn: ConversationTurn;
    readonly text: ConversationLabels;
})
{
    if (turn.kind === "said")
    {
        return (
            <Message align="end">
                <MessageContent>
                    <Bubble variant="default"><BubbleContent>{turn.body}</BubbleContent></Bubble>
                </MessageContent>
            </Message>
        );
    }

    if (turn.kind === "replied")
    {
        return (
            <Message align="start">
                <MessageContent data-slot="conversation-reply">
                    {turn.body}
                    {turn.note === undefined ? null : <MessageFooter>{turn.note}</MessageFooter>}
                </MessageContent>
            </Message>
        );
    }

    if (turn.kind === "calls")
    {
        return <ToolCalls calls={turn.calls} defaultOpen={turn.open} />;
    }

    return (
        <div>
            <Card data-slot="conversation-approval" className="border-warning">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="size-4" aria-hidden />
                        {turn.title}
                    </CardTitle>
                    {turn.description === undefined ? null : <CardDescription>{turn.description}</CardDescription>}
                </CardHeader>

                {turn.items === undefined || turn.items.length === 0
                    ? null
                    : (
                        <CardContent>
                            <PropertyList items={turn.items} orientation="horizontal" labelWidth={84} divider="line" />
                        </CardContent>
                    )}

                <CardFooter className="flex items-center gap-[var(--control-gap-sm)]">
                    <Button disabled={turn.pending === true} onClick={turn.onApprove}>
                        <Check data-icon="inline-start" />
                        {text.approve}
                    </Button>
                    <Button variant="outline" disabled={turn.pending === true} onClick={turn.onReject}>
                        <X data-icon="inline-start" />
                        {text.reject}
                    </Button>
                    <span className="ml-auto text-[length:var(--ui-text-xs)] text-muted-foreground">
                        {text.rejectNote}
                    </span>
                </CardFooter>
            </Card>
        </div>
    );
}

/*
 * ⚠ **대화는 제 안에서 구른다**(2026-09-23 사용자 확정). 구르는 것은 말이 쌓이는 칸 하나뿐이고, 머리와
 *    곁칸과 말을 싣는 칸은 제자리에 서 있어야 한다. 그래서 이 블록이 스크롤러를 통째로 들고, 부르는
 *    쪽은 높이가 정해진 칸 안에 두기만 한다.
 *
 * ⚠ **사람이 한 말이 한 차례의 닻이다.** 새로 보낸 말이 위로 올라가 서고 그 아래로 답이 차오르며,
 *    지난 대화를 열면 마지막으로 건 말에서 선다. 맨 끝에서 열면 무엇을 물었는지부터 거슬러 올라가야
 *    한다.
 *
 * ⚠ **끝에 서 있을 때만 따라간다**(`autoScroll`). 위로 올려 읽는 동안 말이 흘러와도 화면이 끌려
 *    내려가지 않고, 아래로 가는 단추가 그 자리로 돌아오는 길이다.
 */
export function Conversation({ turns, labels, className, contentClassName }: ConversationProps)
{
    const text = { ...CONVERSATION_LABELS, ...labels };

    return (
        <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
            <MessageScroller data-slot="conversation" className={cn("flex-1", className)}>
                <MessageScrollerViewport aria-label={text.transcript}>
                    <MessageScrollerContent className={cn("gap-5", contentClassName)}>
                        {turns.map((turn) => (
                            <MessageScrollerItem key={turn.id} messageId={turn.id} scrollAnchor={turn.kind === "said"}>
                                <Turn turn={turn} text={text} />
                            </MessageScrollerItem>
                        ))}
                    </MessageScrollerContent>
                </MessageScrollerViewport>

                <MessageScrollerButton>
                    <ArrowDown aria-hidden />
                    <span className="sr-only">{text.scrollToEnd}</span>
                </MessageScrollerButton>
            </MessageScroller>
        </MessageScrollerProvider>
    );
}
