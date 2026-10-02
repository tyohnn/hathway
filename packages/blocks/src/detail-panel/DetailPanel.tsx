"use client";

import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@investment/ui/components/card";
import { Empty, EmptyDescription, EmptyHeader } from "@investment/ui/components/empty";
import { Skeleton } from "@investment/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@investment/ui/components/tabs";
import { cn } from "@investment/ui/lib/utils";

import type { DetailPanelProps } from "./types";

/**
 * URL 로 여닫는 상세 패널의 안쪽.
 *
 * 여닫는 일(오버레이 라우트)은 런타임 몫이고 블록은 안쪽만 갖는다.
 * 면은 Card 그대로다. Figma 에서는 Card 에 그릇이 없어 직접 그렸던 자리인데,
 * 코드에는 조각이 있으므로 조합으로 만든다.
 * 폭은 surface/panel-width 를 읽어 FormSheet 와 어긋나지 않는다.
 *
 * ⚠ 푸터 위에 Separator 를 두지 말 것. card.css 의 .cn-card-footer 가
 *    border-block-start 를 이미 갖고 있어 선이 두 겹으로 나간다.
 *
 * ⚠ **치수가 축이다.** 폭을 늘 인라인 스타일로 박아 두었더니, 제 칸을 채워야 하는 자리에서
 *    호출부가 `w-full!` 로 그것을 이겨야 했다(캔버스 `AgentRunPreview`). 인라인 스타일은
 *    클래스로 덮을 수 없어서 `!` 없이는 지지 않는다. 폭이 `fill` 이면 스타일을 아예 걸지 않고,
 *    높이도 같은 축으로 받는다. 문서는 제 칸을 채워야 하고(테두리가 파일마다 춤추면 안 된다)
 *    곁눈으로 보는 레일은 담은 것만큼만 선다.
 */
export function DetailPanel({
    title,
    description,
    tabs,
    activeTab,
    onTabChange,
    actions,
    footer,
    width,
    height = "fill",
    status = "ready",
    message,
    children,
    className,
}: DetailPanelProps)
{
    return (
        <Card
            data-slot="detail-panel"
            data-status={status}
            className={cn(height === "hug" ? "h-auto max-h-full" : "h-full", width === "fill" ? "w-full" : "", className)}
            style={width === "fill"
                ? undefined
                : { width: width === undefined ? "var(--surface-panel-width)" : `${width}px` }}
        >
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description === undefined ? null : <CardDescription>{description}</CardDescription>}
                {actions === undefined ? null : <CardAction>{actions}</CardAction>}
            </CardHeader>

            {tabs === undefined || tabs.length === 0
                ? null
                : (
                    <CardContent>
                        <Tabs value={activeTab ?? tabs[0].id} onValueChange={(next) => onTabChange?.(String(next))}>
                            <TabsList>
                                {tabs.map((tab) => (
                                    <TabsTrigger key={tab.id} value={tab.id}>
                                        {tab.label}
                                        {tab.badge === undefined
                                            ? null
                                            : <span className="ml-1 text-muted-foreground">{tab.badge}</span>}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </CardContent>
                )}

            {/* ⚠ `min-h-0` 이 없으면 플렉스 항목이 내용보다 작아지지 못해, 긴 본문이 칸 안에서 스크롤하지 않고 패널째 화면 밖으로 자란다 */}
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
                {status === "loading"
                    ? (
                        <div aria-busy className="flex flex-col gap-[var(--surface-gap-lg)]">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-5 w-56" />
                            <Skeleton className="h-5 w-48" />
                        </div>
                    )
                    : null}
                {status === "empty" || status === "error"
                    ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyDescription>{message ?? ""}</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )
                    : null}
                {status === "ready" ? children : null}
            </CardContent>

            {footer === undefined
                ? null
                : <CardFooter className="gap-[var(--control-gap-sm)]">{footer}</CardFooter>}
        </Card>
    );
}
