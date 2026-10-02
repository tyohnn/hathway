"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@investment/ui/components/resizable";
import { cn } from "@investment/ui/lib/utils";

import { CHAT_SHELL_LABELS } from "./labels";
import type { ChatSplitProps } from "./types";

/**
 * 대화와 곁칸을 나란히 세우고 그 사이에 너비 손잡이를 둔다.
 *
 * ⚠ **너비를 사람이 정한다**(2026-09-22 사용자 확정). 오른쪽에 서는 것이 레일일 때와 파일일 때가
 *    다르고, 문서를 펴 든 동안 얼마나 넓게 볼지는 그때그때 다르다. 고정값을 고르는 대신 손잡이를 준다.
 *
 * ⚠ **끄는 자리는 카드의 왼쪽 테두리다**(2026-09-22 사용자 확정). 손잡이가 제 선과 알갱이를 들고
 *    카드에서 떨어져 서면 화면에 세로줄이 둘이 된다. 그래서 선을 지우고 오른쪽 칸의 왼쪽 여백을
 *    없애 카드의 테두리가 그 자리에 오게 했다. 끄는 너비는 선이 아니라 그 테두리를 감싸는 4px 이고,
 *    그것은 `ResizableHandle` 의 `after` 가 이미 갖고 있다.
 */
const MIN_PANE = 560;
const MIN_SIDE = 300;
const MAX_SIDE = 880;
const DEFAULT_SIDE = 420;

/*
 * 칸이 제 안을 잘라 내지 않게 한다.
 *
 * ⚠ **카드의 그림자가 칸 밖으로 나간다.** `react-resizable-panels` 는 안쪽 상자에 `overflow: auto`
 *    를 걸어 두는데, 카드가 칸의 왼쪽 끝에 붙어 서므로 그 선에서 그림자가 잘린다. 스크롤은 카드가
 *    제 안에서 맡으므로 이 칸이 자를 일이 없다. `style` 이 안쪽 상자에 닿는 유일한 길이다
 *    (2026-09-22 실측).
 */
const OPEN_SHADOW = { overflow: "visible" } as const;

export function ChatSplit({ pane, side, defaultWidth, labels, className }: ChatSplitProps)
{
    const text = { ...CHAT_SHELL_LABELS, ...labels };

    if (side === undefined)
    {
        return <div data-slot="chat-split" className={cn("flex min-h-0 flex-1 flex-col", className)}>{pane}</div>;
    }

    /*
     * ⚠ **수는 픽셀이다.** `react-resizable-panels` 4 판은 수를 픽셀로, 문자열을 백분율로 읽는다.
     *    백분율인 줄 알고 26 을 넘겼다가 오른쪽 칸이 26px 로 섰다(2026-09-22 실측).
     */
    return (
        <ResizablePanelGroup data-slot="chat-split" orientation="horizontal" className={cn("min-h-0 flex-1", className)}>
            <ResizablePanel minSize={MIN_PANE}>{pane}</ResizablePanel>
            <ResizableHandle aria-label={text.resize} className="bg-transparent" />
            <ResizablePanel
                defaultSize={defaultWidth ?? DEFAULT_SIDE}
                minSize={MIN_SIDE}
                maxSize={MAX_SIDE}
                style={OPEN_SHADOW}
            >
                {side}
            </ResizablePanel>
        </ResizablePanelGroup>
    );
}
