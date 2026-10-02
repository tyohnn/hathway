"use client";

import type React from "react";

import { cn } from "@investment/ui/lib/utils";

import type { WorkbenchProps } from "./types";

/*
 * 왼쪽 기둥의 기본 폭은 2층 토큰(`--workbench-aside-width`)이 갖는다. 목록 한 줄에 제목과
 * 보조 정보가 함께 들어가는 너비이고, 화면마다 달라지는 값이 아니라 이 짜임의 성질이다.
 * 호출부가 `asideWidth` 를 주면 그때만 인라인으로 덮는다.
 */

/** 오른쪽에 아직 고른 것이 없는가. React 가 아무것도 그리지 않는 값 셋을 본다 */
function isBlank(node: React.ReactNode): boolean
{
    return node === undefined || node === null || node === false;
}

/**
 * 왼쪽 목록과 오른쪽 상세로 나뉜 2단 작업 화면.
 *
 * 수행 보드와 검토함과 고객사와 회의가 같은 짜임을 되풀이해서 블록으로 굳혔다.
 * 블록은 두 기둥의 자리와 스크롤만 정하고 안쪽은 호출부가 넣는다.
 *
 * 높이를 100vh 로 잡지 않고 부모가 준 만큼 채운다. 셸에 머리띠가 붙는 화면에서 100vh 는
 * 그 띠 높이만큼 넘쳐서 창 전체에 세로 스크롤이 생기는데, 그러면 두 기둥이 각자 스크롤하는
 * 뜻이 사라진다.
 *
 * ⚠ 좁은 화면에서는 한 열로 접혀 목록이 위, 본문이 아래가 된다. 두 기둥이 각각 min-h-0 과
 *    minmax(0, …) 를 갖는 것은 격자 칸의 기본 최소 크기가 자식의 내용 크기라서, 그것을
 *    풀지 않으면 긴 목록이 칸을 밀어내고 화면 전체가 옆으로도 아래로도 늘어나기 때문이다.
 */
export function Workbench({
    aside,
    children,
    asideWidth,
    asideHeader,
    empty,
    className,
}: WorkbenchProps)
{
    const blank = isBlank(children);

    return (
        <div
            data-slot="workbench"
            style={asideWidth === undefined
                ? undefined
                : ({ "--workbench-aside-width": `${asideWidth}px` } as React.CSSProperties)}
            className={cn(
                "grid h-full min-h-0 w-full gap-[var(--surface-gap-lg)]",
                "grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,2fr)]",
                "md:grid-cols-[var(--workbench-aside-width)_minmax(0,1fr)] md:grid-rows-1",
                className,
            )}
        >
            <aside
                data-slot="workbench-aside"
                className="flex min-h-0 min-w-0 flex-col gap-[var(--surface-gap)]"
            >
                {asideHeader === undefined
                    ? null
                    : <div className="shrink-0">{asideHeader}</div>}
                <div className="min-h-0 flex-1 overflow-y-auto">{aside}</div>
            </aside>

            <div
                data-slot="workbench-main"
                data-empty={blank ? "" : undefined}
                className="min-h-0 min-w-0 overflow-y-auto"
            >
                {blank ? empty : children}
            </div>
        </div>
    );
}
