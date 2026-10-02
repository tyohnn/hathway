"use client";

import type React from "react";
import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@investment/ui/components/collapsible";
import { ChevronDown, ShieldCheck } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { TONE_TEXT } from "../tone";
import { CodeBlock } from "./CodeBlock";
import { TOOL_CALLS_LABELS } from "./labels";
import { hasPending, needsGroup, TOOL_CALL_TONE } from "./rules";
import type { ToolCall, ToolCallListProps, ToolCallRowProps, ToolCallsLabels, ToolCallsProps } from "./types";

/*
 * 도구 호출을 대화에 놓는 조각.
 *
 * ⚠ **아주 작게 둔다.** 대화에서 읽을 것은 사람이 한 말과 에이전트가 한 말이고, 도구는 「무엇을
 *    하려 했나」만 훑고 지나가는 자리다. 카드로 세우면 줄마다 72px 을 먹어서 도구가 셋만 있어도 말이
 *    화면 밖으로 밀린다(2026-09-21 실측).
 *
 * ⚠ **흐린 것은 그대로이고 테두리만 돌아왔다**(2026-09-22 사용자 확정). 테두리가 서는 자리는 여럿을
 *    한 덩이로 묶는 상자 하나뿐이고, 줄 자체는 면도 테두리도 없다. 줄마다 두르면 여섯 호출에 테두리가
 *    여섯 벌이 되어 「있는 듯 없는 듯」이 깨진다.
 *
 * ⚠ **처지의 색은 글자만 갖는다.** 한 줄짜리라 배지의 면을 얹으면 그 면이 줄보다 커진다.
 *    `TONE_TEXT` 를 읽는 것이 Alert 의 destructive 규칙을 넓힌 것과 같은 판단이다.
 *
 * ⚠ **좌우 10px 과 상하 8px 은 리터럴이다.** 한 줄짜리 띠의 여백은 2층에 축이 없다. surface 축의
 *    sm 은 16px 이라 이 높이에서는 과하고(3층 Accordion 의 손잡이가 그 16px 을 쓴다), 3층이 말풍선의
 *    상하 여백을 같은 까닭으로 리터럴로 두었다. 상하를 4px 로 두었더니 줄이 눌려 보여서 8px 로 올렸다
 *    (2026-09-22 사용자 지적).
 */

const statusLabel = (call: ToolCall, text: ToolCallsLabels): string =>
{
    if (call.status === "awaiting_approval")
    {
        return text.awaitingApproval;
    }

    return text[call.status];
};

/** 펴야 보이는 것이 하나라도 있는가. 없으면 여는 축을 세우지 않는다 */
const hasDetail = (call: ToolCall): boolean =>
    call.input !== undefined || call.output !== undefined || call.note !== undefined;

/** 줄에 서는 제목. 모델이 적은 의도가 먼저이고, 없으면 이름이 그 자리를 채운다 */
const title = (call: ToolCall): string => call.intent ?? call.label ?? call.name;

/**
 * 펴 둔 줄의 속.
 *
 * 차례가 「무슨 도구였나 · 무엇을 넣었나 · 무엇이 돌아왔나」다. 접힌 줄이 드는 것은 의도 한 줄이므로,
 * 도구의 이름도 넣은 값도 결과도 전부 편 사람만 본다.
 *
 * ⚠ **결과는 세 줄에서 자른다.** 넣은 값은 코드 블록이 제 높이를 막고, 결과는 글이라 그 자리에서
 *    자른다. 자르는 것은 안쪽 상자가 맡는데, 여백을 함께 두면 넷째 줄의 윗머리가 그 여백으로 비친다.
 */
function DetailRow({ label, value }: { readonly label: string; readonly value: React.ReactNode })
{
    return (
        <div className="flex gap-2">
            <span className="w-12 shrink-0 text-muted-foreground/70">{label}</span>
            <span className="line-clamp-3 min-w-0 flex-1 wrap-anywhere">{value}</span>
        </div>
    );
}

function Detail({ call, text }: { readonly call: ToolCall; readonly text: ToolCallsLabels })
{
    const named = call.label === undefined ? call.name : `${call.label} · ${call.name}`;

    return (
        <div className="flex flex-col gap-1.5 px-2.5 pb-2 pl-8 text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)] text-muted-foreground">
            <div className="truncate text-muted-foreground/70">{named}</div>

            {call.input === undefined ? null : <CodeBlock>{call.input}</CodeBlock>}
            {call.output === undefined ? null : <DetailRow label={text.output} value={call.output} />}
            {call.note === undefined ? null : <div>{call.note}</div>}
        </div>
    );
}

/** 줄에 늘 서는 알맹이. 접힌 줄에도 서고 여는 줄의 손잡이에도 선다 */
function Line({ call, text, open }: {
    readonly call: ToolCall;
    readonly text: ToolCallsLabels;
    readonly open?: boolean;
})
{
    return (
        <>
            {call.icon === undefined
                ? null
                : <span aria-hidden className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground/70">{call.icon}</span>}

            {/*
              * ⚠ **제목은 의도 한 줄이다**(2026-09-22). 종전에는 이름과 받은 값이 섰는데, 둘 다
              *    기계의 값이라 「왜 그것을 불렀나」를 말하지 못했다. 이름과 값은 펴야 보인다.
              */}
            <span className="min-w-0 truncate text-foreground/80">{title(call)}</span>

            {call.gated === true && call.status === "succeeded"
                ? <ShieldCheck aria-label={text.gated} className="size-3 shrink-0 text-muted-foreground/60" />
                : null}

            <span className={cn("shrink-0", TONE_TEXT[TOOL_CALL_TONE[call.status]])}>
                {statusLabel(call, text)}
            </span>

            {/*
              * ⚠ **처지와 셰브런이 글자 바로 뒤에 붙는다**(2026-09-22 사용자 확정). 줄 끝으로 밀면
              *    짧은 의도와 그 값 사이가 통째로 비어 한 줄이 둘로 갈라져 읽힌다. 남는 자리는
              *    그 뒤에 둔다
              */}
            {open === undefined
                ? null
                : (
                    <ChevronDown
                        aria-hidden
                        className={cn("size-3 shrink-0 text-muted-foreground/60 transition-transform", open ? "" : "-rotate-90")}
                    />
                )}

            <span className="flex-1" />
        </>
    );
}

/**
 * 말과 왼쪽 기준선을 맞추는 음수 여백.
 *
 * ⚠ **줄의 좌우 여백은 누르는 자리를 위한 것이다**(2026-09-22 사용자 지적). 그 10px 때문에 도구가
 *    대화의 말보다 안쪽으로 들어가 두 기둥처럼 보였다. 여백을 걷으면 hover 면이 글자에 달라붙으므로
 *    바깥에서 같은 만큼 당겨 글자만 제자리로 돌린다.
 *
 * ⚠ **당기는 것은 줄 하나뿐이다**(2026-09-22 사용자 지적). 묶음까지 당기면 그 상자의 테두리가
 *    대화의 폭 밖으로 나가 좌우가 잘린 것처럼 보인다. 상자는 제 자리에 두고 그 머리글만 당긴다.
 */
const ALIGN = "-mx-2.5";

const LINE = "flex w-full items-center gap-2 px-2.5 py-2 text-left text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)]";

/**
 * 한 줄짜리 도구 호출. 대화의 묶음 안에도 서고 레일의 목록에도 선다.
 *
 * `detail` 이 세 눈금이다. 감추거나(`hidden`) 늘 펴 두거나(`shown`) 줄마다 여닫는다(`foldable`).
 */
export function ToolCallRow({ call, detail = "hidden", labels, className }: ToolCallRowProps)
{
    const text = { ...TOOL_CALLS_LABELS, ...labels };
    const [open, setOpen] = useState(false);

    if (detail === "foldable" && hasDetail(call))
    {
        return (
            <Collapsible
                open={open}
                onOpenChange={setOpen}
                data-slot="tool-call-row"
                className={cn("flex flex-col", className)}
            >
                <CollapsibleTrigger
                    aria-label={open ? text.collapse : text.expand}
                    className={cn(LINE, "rounded-[var(--surface-radius-sm)] outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50")}
                >
                    <Line call={call} text={text} open={open} />
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <Detail call={call} text={text} />
                </CollapsibleContent>
            </Collapsible>
        );
    }

    return (
        <div data-slot="tool-call-row" className={cn("flex flex-col", className)}>
            <div className={LINE}>
                <Line call={call} text={text} />
            </div>

            {detail === "shown" ? <Detail call={call} text={text} /> : null}
        </div>
    );
}

/**
 * 접지 않고 줄만 세운 목록. 레일처럼 이미 접히는 묶음 안에 들어가는 자리가 쓴다.
 *
 * 묶음 안에 또 접는 것을 두면 사람이 두 번 펴야 한 줄을 본다.
 */
export function ToolCallList({ calls, detail = "hidden", labels, className }: ToolCallListProps)
{
    return (
        <div
            data-slot="tool-call-list"
            className={cn(
                "divide-y divide-border overflow-hidden rounded-[var(--surface-radius-sm)] border border-border bg-card",
                className,
            )}
        >
            {calls.map((call) => (
                <ToolCallRow key={call.id} call={call} detail={detail} labels={labels} />
            ))}
        </div>
    );
}

/**
 * 잇달아 부른 도구를 한 덩이로 접는다.
 *
 * ⚠ **겹의 수가 호출의 수를 따른다**(`rules.ts` 의 `needsGroup`). 하나만 불렀으면 묶음을 세우지
 *    않고 그 줄 하나가 곧 호출이다. 둘부터 「도구 n번」 한 줄이 서고, 펴면 상자 안에 줄이 선다.
 *
 * ⚠ **멈춰 선 것이 섞여 있으면 펴 둔다**(`rules.ts` 의 `hasPending`). 사람이 답해야 하는 자리를
 *    접어 두면 그 답을 기다리는 줄 모른다. `defaultOpen` 을 주면 그 값이 이긴다.
 */
export function ToolCalls({
    calls,
    open,
    defaultOpen,
    onOpenChange,
    labels,
    className,
}: ToolCallsProps)
{
    const text = { ...TOOL_CALLS_LABELS, ...labels };

    // 비제어 모드의 상태를 블록이 갖는다. 머리글의 꼬리말을 펴진 동안 감춰야 해서 지금 어느 쪽인지를
    // 여기서도 읽는다.
    const [innerOpen, setInnerOpen] = useState(defaultOpen ?? hasPending(calls));
    const isOpen = open ?? innerOpen;
    const only = calls[0];

    const change = (next: boolean) =>
    {
        if (open === undefined)
        {
            setInnerOpen(next);
        }

        onOpenChange?.(next);
    };

    if (!needsGroup(calls))
    {
        return only === undefined
            ? null
            : <ToolCallRow call={only} detail="foldable" labels={labels} className={cn(ALIGN, className)} />;
    }

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={change}
            data-slot="tool-calls"
            className={cn("flex flex-col gap-1", className)}
        >
            <CollapsibleTrigger
                aria-label={isOpen ? text.collapse : text.expand}
                className="-mx-2.5 flex w-[calc(100%+20px)] items-center gap-2 rounded-[var(--surface-radius-sm)] px-2.5 py-2 text-left text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)] text-muted-foreground outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                {/*
                  * ⚠ **수만 적는다**(2026-09-22 사용자 확정). 종전에는 마지막 호출이 받은 값을 꼬리에
                  *    달았는데, 그 값이 묶음 전체의 이름인 것처럼 읽혔다. 무엇을 했는지는 펴면 줄마다
                  *    제 의도로 말하므로 접힌 줄이 들 것은 몇 번 불렀나 하나다
                  */}
                <span className="shrink-0">{text.count(calls.length)}</span>

                {/* ⚠ 줄과 같이 글자 바로 뒤에 붙는다(2026-09-22 사용자 확정). 끝으로 밀면 짧은 말과
                    셰브런 사이가 통째로 비어 그 둘이 다른 것으로 읽힌다 */}
                <ChevronDown
                    aria-hidden
                    className={cn("size-3 shrink-0 transition-transform", isOpen ? "" : "-rotate-90")}
                />

                <span className="flex-1" />
            </CollapsibleTrigger>

            <CollapsibleContent>
                {/*
                  * ⚠ **묶음 상자는 `Card` 가 아니다.** 테두리 1px 에 sm 반지름이고, 줄 사이는
                  *    `divide-y` 가 가른다. `Card` 는 20px 반지름에 24px 여백이고 유리 면이라
                  *    대화에서 가장 무거운 덩어리가 된다.
                  */}
                <div className="divide-y divide-border overflow-hidden rounded-[var(--surface-radius-sm)] border border-border">
                    {calls.map((call) => (
                        <ToolCallRow key={call.id} call={call} detail="foldable" labels={labels} />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
