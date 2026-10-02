"use client";

import { Fragment } from "react";

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarSeparator,
} from "@investment/ui/components/sidebar";

import { activeNavItem } from "./active";
import type { AppShellNavProps } from "./types";

/**
 * 사이드바의 항목 목록.
 *
 * ⚠ **이 조각만 지금 주소를 안다.** 주소는 요청 시점 값이라 `usePathname()` 을 경계 없이 두면
 *    동적 라우트(`/companies/[companyId]`)의 프리렌더가 `CLIENT_HOOK_DYNAMIC` 으로 실패한다
 *    (2026-09-16 실측). 그래서 셸이 이 조각을 `<Suspense>` 안쪽에 두고, 기다리는 동안 같은 목록을
 *    **아무것도 켜지 않은 채로** 그린다 — 폭과 줄 수가 같아 셸이 흔들리지 않는다.
 *
 * `pathname` 이 빈 문자열이면 아무 항목도 켜지지 않는다. 그것이 곧 기다리는 동안의 모습이다.
 *
 * ⚠ **아래 항목은 그 묶음에 서 있을 때만 펴진다.** 늘 펴 두면 사이드바가 항목 수만큼 길어지고, 사람이
 *    지금 쓰지 않는 자리를 매번 지나쳐 읽는다. 접었다 폈다 하는 단추를 두지 않은 것은 그 상태를 어디에
 *    두느냐가 또 하나의 결정이 되기 때문이다 - 서 있는 자리가 곧 펴진 자리다.
 */
export function AppShellNav({ groups, pathname }: AppShellNavProps)
{
    const active = activeNavItem(groups, pathname);

    return (
        <SidebarMenu>
            {groups.map((group, index) => (
                <Fragment key={group[0]?.base ?? index}>
                    {index === 0 ? null : <SidebarSeparator />}
                    {group.map((item) =>
                    {
                        const children = item.children ?? [];
                        const inside = active?.base === item.base
                            || children.some((child) => child.base === active?.base);

                        return (
                            <SidebarMenuItem key={item.base}>
                                <SidebarMenuButton
                                    isActive={active?.base === item.base}
                                    tooltip={item.label}
                                    render={item.render}
                                >
                                    <item.icon aria-hidden />
                                    <span>{item.label}</span>
                                </SidebarMenuButton>

                                {children.length === 0 || !inside
                                    ? null
                                    : (
                                        <SidebarMenuSub>
                                            {children.map((child) => (
                                                <SidebarMenuSubItem key={child.base}>
                                                    <SidebarMenuSubButton
                                                        isActive={active?.base === child.base}
                                                        render={child.render}
                                                    >
                                                        <child.icon aria-hidden />
                                                        <span>{child.label}</span>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    )}
                            </SidebarMenuItem>
                        );
                    })}
                </Fragment>
            ))}
        </SidebarMenu>
    );
}
