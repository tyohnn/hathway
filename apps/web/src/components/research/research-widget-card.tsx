"use client";

import type { Tone } from "@investment/blocks/tone";
import { StatusBadge } from "@investment/blocks/status-badge";
import Link from "next/link";
import { DotsSixVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import type { ResearchBoard, ResearchWidget } from "@/lib/research";
import { moveWidget, removeWidget, renameWidget } from "@/lib/research/document";
import { cn } from "@/lib/cn";
import { Button } from "@investment/ui/components/button";
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@investment/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@investment/ui/components/popover";

export const WIDGET_MIME = "text/research-widget";

export function ResearchWidgetCard({
    board,
    groupId,
    widget,
    onChange,
    showGridHandle,
    readOnly,
}: {
    board: ResearchBoard;
    groupId: string;
    widget: ResearchWidget;
    onChange: (next: ResearchBoard) => void;
    showGridHandle: boolean;
    /** 고칠 수 없는 사람의 화면. 옮기고 지우는 단추를 세우지 않고 글은 읽기만 한다 */
    readOnly: boolean;
})
{
    const otherGroups = board.groups.filter((group) => group.id !== groupId);

    return (
        <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background">
            <header className="flex items-start gap-2 border-b border-border px-2.5 py-1.5">
                {showGridHandle && (
                    <button
                        type="button"
                        className="research-widget-drag mt-0.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                        aria-label="카드 옮기기"
                    >
                        <DotsSixVerticalIcon className="size-4" />
                    </button>
                )}
                {!readOnly && (
                    <button
                        type="button"
                        draggable
                        className="mt-0.5 cursor-grab text-[10px] text-muted-foreground hover:text-foreground"
                        aria-label="끌어서 다른 그룹으로 옮기기"
                        title="끌어서 다른 그룹으로 옮기기"
                        onDragStart={(event) =>
                        {
                            event.dataTransfer.setData(WIDGET_MIME, widget.id);
                            event.dataTransfer.effectAllowed = "move";
                        }}
                    >
                        ⇄
                    </button>
                )}
                <div className="min-w-0 flex-1">
                    <input
                        className="w-full truncate bg-transparent text-sm font-semibold outline-none"
                        value={widget.title}
                        aria-label="카드 제목"
                        readOnly={readOnly}
                        onChange={(event) => onChange(renameWidget(board, widget.id, { title: event.target.value }))}
                    />
                    {widget.source && (
                        <p className="truncate text-[11px] text-muted-foreground">{widget.source}</p>
                    )}
                </div>
                {!readOnly && otherGroups.length > 0 && (
                    <Popover>
                        <PopoverTrigger render={<Button type="button" variant="ghost" size="xs" />}>그룹 옮기기</PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="end">
                            <Command>
                                <CommandList>
                                    <CommandGroup heading="옮길 그룹">
                                        {otherGroups.map((group) => (
                                            <CommandItem
                                                key={group.id}
                                                value={group.title}
                                                onSelect={() => onChange(moveWidget(board, widget.id, group.id))}
                                            >
                                                {group.title || "이름 없는 그룹"}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}
                {!readOnly && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="카드 삭제하기"
                        onClick={() => onChange(removeWidget(board, widget.id))}
                    >
                        <TrashIcon className="size-3.5" />
                    </Button>
                )}
                <StatusBadge tone={KIND_TONE[widget.kind]} label={kindLabel(widget.kind)} className="shrink-0" />
            </header>
            <div className="min-h-0 flex-1 overflow-auto px-2.5 py-2 text-sm">
                {widget.kind === "metric" && widget.metric && (
                    <div>
                        <p className="text-2xl font-semibold tracking-tight">{widget.metric.value}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {widget.metric.caption}
                        </p>
                    </div>
                )}
                {widget.kind === "note" ? (
                    <textarea
                        className="min-h-16 w-full resize-none bg-transparent text-xs leading-relaxed text-muted-foreground outline-none"
                        value={widget.body ?? ""}
                        placeholder={readOnly ? undefined : "노트 내용"}
                        readOnly={readOnly}
                        onChange={(event) => onChange(renameWidget(board, widget.id, { body: event.target.value }))}
                    />
                ) : (
                    widget.body && <p className="text-xs leading-relaxed text-muted-foreground">{widget.body}</p>
                )}
                {widget.items && widget.items.length > 0 && (
                    <ul className="space-y-2">
                        {widget.items.map((item) => (
                            <li key={item.title} className="rounded-lg bg-muted/50 px-2.5 py-2">
                                {item.href ? (
                                    <Link href={item.href} className="text-xs font-medium text-primary hover:underline">
                                        {item.title}
                                    </Link>
                                ) : (
                                    <p className="text-xs font-medium">{item.title}</p>
                                )}
                                {item.note && (
                                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{item.note}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {widget.href && (
                    <Link
                        href={widget.href}
                        aria-label={widget.hrefLabel ? undefined : `${widget.title} 열기`}
                        className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                        {widget.hrefLabel ?? "열기"}
                    </Link>
                )}
            </div>
        </article>
    );
}

/** 칸의 갈래를 가르는 색. 뉴스와 링크만 색을 갖고 나머지는 조용히 선다 */
const KIND_TONE: Record<ResearchWidget["kind"], Tone> = {
    news: "info",
    note: "neutral",
    metric: "neutral",
    link: "success",
    chart: "neutral",
};

export function kindLabel(kind: ResearchWidget["kind"]): string
{
    switch (kind)
    {
        case "chart":
            return "차트";
        case "news":
            return "뉴스";
        case "note":
            return "노트";
        case "metric":
            return "지표";
        case "link":
            return "링크";
    }
}
