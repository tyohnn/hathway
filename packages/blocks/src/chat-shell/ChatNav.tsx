"use client";

import { Fragment } from "react";

import {
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
} from "@investment/ui/components/sidebar";
import { Plus } from "@investment/ui/icons";

import { activeNavItem } from "../app-shell/active";
import { CHAT_SHELL_LABELS } from "./labels";
import type { ChatNavProps } from "./types";

/**
 * 챗의 사이드바. 새 대화 한 줄과 메뉴와 지난 대화가 차례로 선다.
 *
 * ⚠ **켜진 항목을 이 기둥이 다시 재지 않는다.** 주소를 받으면 `activeNavItem` 하나가 정한다. 셸의
 *    여느 기둥과 같은 함수를 지나야 두 자리가 서로 다른 항목을 켜는 날이 오지 않는다.
 *
 * ⚠ **주소를 받지 않으면 아무 항목도 켜지지 않는다.** 대화를 보고 있는 동안 켜져 있어야 하는 것은 그
 *    대화의 줄이고, 위의 메뉴까지 함께 켜면 켜진 줄이 둘이 되어 어느 것이 지금인지가 흐려진다.
 *    그래서 대화 화면은 주소를 넘기지 않는다.
 */
export function ChatNav({ groups, threads, activeThreadId, newThread, labels, pathname }: ChatNavProps)
{
    const active = pathname === undefined ? undefined : activeNavItem(groups, pathname);
    const text = { ...CHAT_SHELL_LABELS, ...labels };

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton render={newThread}>
                        <Plus aria-hidden />
                        <span>{text.newThread}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>

            {groups.map((group, index) => (
                <SidebarMenu key={index} className="mt-1">
                    {group.map((item) => (
                        <SidebarMenuItem key={item.base}>
                            <SidebarMenuButton isActive={item.base === active?.base} tooltip={item.label} render={item.render}>
                                <item.icon aria-hidden />
                                <span>{item.label}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            ))}

            {threads.map((group) => (
                <Fragment key={group.label}>
                    <SidebarGroupLabel className="mt-3">{group.label}</SidebarGroupLabel>
                    <SidebarMenu>
                        {group.threads.map((thread) => (
                            <SidebarMenuItem key={thread.id}>
                                <SidebarMenuButton
                                    isActive={thread.id === activeThreadId}
                                    tooltip={thread.title}
                                    render={thread.render}
                                >
                                    <span className="truncate">{thread.title}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </Fragment>
            ))}
        </>
    );
}

/**
 * 지난 대화를 기다리는 동안의 뼈대.
 *
 * ⚠ **대화 목록만 기다린다.** 새 대화 줄과 메뉴는 데이터를 딛지 않으므로 그대로 선다. 셋을 통째로
 *    회색으로 덮으면 기다리는 동안 갈 곳이 없어 보인다.
 */
export function ChatNavSkeleton({ rows = 6 }: { readonly rows?: number })
{
    return (
        <SidebarMenu aria-busy>
            {Array.from({ length: rows }, (_, index) => (
                <SidebarMenuItem key={index}>
                    <SidebarMenuSkeleton />
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
}
