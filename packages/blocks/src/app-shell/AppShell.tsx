"use client";

import { cloneElement, Suspense } from "react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@investment/ui/components/sidebar";
import { cn } from "@investment/ui/lib/utils";

import { AppShellNav } from "./Nav";
import { AppShellTitle } from "./Title";
import type { AppShellProps } from "./types";

/**
 * 앱 셸 — 사이드바 하나와 상단 띠 하나 (advisor 의 「셸 규격」).
 *
 * 사이드바(폭 256 · 머리 56) · 상단 띠(높이 56) · 본문(최대 1280 중앙) 셋이고, 생김새의 정본은
 * 캔버스의 화면 아트보드다. 값이 다르면 아트보드가 맞다.
 *
 * ⚠ **앱마다 라우트와 메뉴는 달라도 레이아웃은 같아야 한다.** 그래서 이 블록이 생겼다 — 종전에는
 *    advisor 가 이 모양을 갖고 agent 가 손으로 짠 `<aside>` 를 따로 갖고 있어서, 세 번째 앱이 어느
 *    쪽을 베끼느냐에 따라 레이아웃이 갈렸다(2026-09-16 에 admin 이 agent 쪽을 베껴 실제로 갈렸다).
 *
 * ⚠ **상단 띠에는 브레드크럼과 여닫는 단추만 둔다.** 전역 검색 · 알림 벨 · 아바타를 두지 않는다.
 *    앞의 둘은 근거가 되는 스토리가 없고, 아바타는 사이드바 아래의 계정 자리가 같은 것을 이미 보인다.
 *
 * ⚠ **화면의 머리글은 현재 위치를 갖지 않는다.** 위치가 상단 띠로 올라갔으므로 각 화면의 `PageHeader` 는
 *    브레드크럼 칸을 쓰지 않는다. 둘 다 그리면 같은 것이 한 화면에 두 번 나온다.
 *
 * ⚠ **계정 자리는 `user` 로 받는다.** 이름은 요청 시점 데이터라 셸 안에서 읽으면 셸 전체가 요청을
 *    기다린다. 앱이 `<Suspense>` 로 감싼 조각을 넘기고, 셸은 그 자리를 비워 둔 채 먼저 선다.
 *
 * ⚠ **여닫은 상태는 아직 남지 않는다.** 컴포넌트가 쿠키에 적기는 하지만 그것을 읽으려면 레이아웃이
 *    요청 시점 값을 읽어야 하고, `cacheComponents` 아래에서 그러면 셸이 통째로 요청을 기다리게 된다.
 *    남기는 일은 셸 안쪽에 경계를 하나 더 둘 때 함께 한다.
 *
 * ⚠ **지금 주소를 아는 두 조각(`nav`·`title`)은 셸이 `<Suspense>` 로 감싼다.** 주소는 요청 시점 값이라
 *    경계가 없으면 동적 라우트(`/companies/[companyId]`)의 프리렌더가 `CLIENT_HOOK_DYNAMIC` 으로 실패한다
 *    (2026-09-16 실측). 기다리는 동안에는 **아무것도 켜지 않은 같은 목록**과 기본 문구가 서서 폭과 높이가
 *    같다 — 셸이 흔들리지 않는다. 경계를 앱이 아니라 셸이 갖는 까닭은 그 「기다리는 모습」도 셸의 규격이기
 *    때문이다.
 *
 * ⚠ **셸 전체를 Skeleton 으로 두지 않는다.** 셸은 데이터를 기다리지 않고 바로 선다. 기다리는 것은 위 둘과
 *    `user` 뿐이고, 셸을 통째로 `<Suspense>` 에 넣으면 `children` 이 fallback 과 본문에서 두 번 그려진다.
 */
export function AppShell(
    { brand, groups, nav, title, user, children, layout = "well", labels, className }: AppShellProps,
)
{
    return (
        <SidebarProvider
            style={{ "--sidebar-width-icon": "var(--sidebar-collapsed-width)" } as React.CSSProperties}
            // ⚠ **`full` 은 화면 높이에 묶는다**(2026-09-23 사용자 확정). 묶지 않으면 셸이 본문만큼 자라서
            //    문서 전체가 구르고, 대화의 머리와 곁칸이 말과 함께 위로 밀려 올라간다. 구르는 자리는
            //    기둥마다 제 안에 둔다
            className={layout === "full" ? "h-svh overflow-hidden" : undefined}
        >
            {/*
              * ⚠ **떠 있는 사이드바다**(2026-09-28, loam). 사이드바와 본문이 검은 바닥 위의 판 둘로 서고 둘 다
              *    테두리를 갖는다. 본문을 판으로 그리는 규칙은 loam 의 3층이 갖는다(떠 있는 사이드바 옆의 inset) —
              *    여기서 본문에 테두리나 여백을 손으로 달지 않는다. 시스템을 갈아입으면 그쪽이 같이 바뀐다.
              */}
            <Sidebar variant="floating" collapsible="icon">
                <SidebarHeader className="h-14 flex-row items-center border-b border-sidebar-border group-data-[collapsible=icon]:justify-center">
                    {/* ⚠ 링크 요소는 앱이 넘긴다 — 블록은 Next 를 모른다. 안쪽 모양은 블록이 갖는다 */}
                    {cloneElement(
                        brand.render,
                        { className: "flex min-w-0 items-center gap-2" },
                        <span
                            key="mark"
                            aria-hidden
                            className="flex size-5 shrink-0 items-center justify-center rounded-[6px] bg-primary text-[11px] font-bold text-primary-foreground"
                        >
                            {brand.mark}
                        </span>,
                        <span
                            key="name"
                            className="truncate text-[length:var(--ui-text-lg)] leading-[var(--ui-line-height-lg)] font-semibold tracking-[var(--heading-letter-spacing)] group-data-[collapsible=icon]:hidden"
                        >
                            {brand.name}
                        </span>,
                    )}
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        {/* 기다리는 동안에는 같은 목록이 아무것도 켜지지 않은 채로 선다 */}
                        <Suspense fallback={<AppShellNav groups={groups} pathname="" />}>
                            {nav}
                        </Suspense>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="border-t border-sidebar-border">{user}</SidebarFooter>
            </Sidebar>

            {/*
              * ⚠ **`min-w-0` 이 없으면 넓은 본문이 셸을 밀어낸다.** 이 자리는 사이드바와 나란한 flex
              *    항목인데 flex 항목의 기본 최소 너비가 `auto` 라, 안쪽이 제 칸보다 넓어지면 줄어드는
              *    대신 칸을 통째로 늘린다. 그러면 오른쪽이 화면 밖으로 나가 잘린다. `full` 배치에서
              *    기둥 둘을 세울 때 실제로 그렇게 잘렸다(2026-09-22 실측).
              */}
            <SidebarInset className="min-w-0">
                {layout === "full"
                    ? null
                    : (
                        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-sidebar-border bg-background px-6">
                            <SidebarTrigger className="-ml-1 text-muted-foreground" aria-label="메뉴 열고 닫기" />
                            <Suspense fallback={<AppShellTitle groups={groups} pathname="" labels={labels} />}>
                                {title}
                            </Suspense>
                        </header>
                    )}

                {/*
                  * ⚠ **본문 자리는 `<div>` 다.** `SidebarInset` 이 이미 `<main>` 을 그린다. 여기서 또 그리면 본문
                  *    랜드마크가 두 겹이 되어 스크린리더가 본문을 둘로 읽고, `getByRole("main")` 이 둘을 잡는다
                  *    (2026-10-02 실측).
                  */}
                {layout === "full"
                    ? (
                        <div className={cn("flex min-h-0 flex-1 flex-col bg-canvas", className)}>
                            {children}
                        </div>
                    )
                    : (
                        <div className={cn("flex min-h-0 flex-1 flex-col bg-canvas px-8 py-6", className)}>
                            <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6">
                                {children}
                            </div>
                        </div>
                    )}
            </SidebarInset>
        </SidebarProvider>
    );
}
