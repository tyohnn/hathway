"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Label } from "@hathway/ui/components/label";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@hathway/ui/components/sidebar";
import { LogoGallery, Search } from "@hathway/ui/icons";

/**
 * 문서의 왼쪽 사이드바. tyohnn 의 docs 템플릿(shadcn sidebar-01)을 옮겼다. 머리에 제품 이름과 찾기 칸, 몸에 묶음별 문서,
 * 발에 공개 화면의 다른 자리가 선다.
 *
 * 찾기는 제목만 거른다. 문서가 몇 장 안 되는 동안은 본문까지 뒤질 까닭이 없다.
 * ⚠ 지금 보는 문서는 주소(`usePathname`)로 켠다. 브라우저에서 읽으므로 틀(`layout.tsx`)은 요청마다 그려지지 않는다.
 */
export interface DocsNavGroup
{
    readonly group: string;
    readonly docs: ReadonlyArray<{ readonly title: string; readonly href: string }>;
}

export function DocsSidebar({ groups, home, links }: {
    readonly groups: ReadonlyArray<DocsNavGroup>;
    readonly home: string;
    readonly links: ReadonlyArray<{ readonly label: string; readonly href: string }>;
})
{
    const pathname = usePathname();
    const [query, setQuery] = useState("");

    const needle = query.trim().toLowerCase();
    const shown = groups
        .map((group) => ({ ...group, docs: group.docs.filter((doc) => doc.title.toLowerCase().includes(needle)) }))
        .filter((group) => group.docs.length > 0);

    return (
        <Sidebar>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" render={<Link href={home} />}>
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <LogoGallery className="size-4" />
                            </div>
                            <span className="font-medium">Hathway</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <form role="search" onSubmit={(event) => event.preventDefault()}>
                    <SidebarGroup className="py-0">
                        <SidebarGroupContent className="relative">
                            <Label htmlFor="docs-search" className="sr-only">문서 찾기</Label>
                            <SidebarInput
                                id="docs-search"
                                placeholder="문서 찾기"
                                className="pl-8"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                            <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
                        </SidebarGroupContent>
                    </SidebarGroup>
                </form>
            </SidebarHeader>
            <SidebarContent>
                <nav aria-label="문서">
                    {shown.map((group) => (
                        <SidebarGroup key={group.group}>
                            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.docs.map((doc) => (
                                        <SidebarMenuItem key={doc.href}>
                                            <SidebarMenuButton isActive={pathname === doc.href} render={<Link href={doc.href} />}>
                                                {doc.title}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </nav>
                {shown.length === 0 ? <p className="text-muted-foreground px-4 py-2 text-sm">찾는 문서가 없어요</p> : null}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    {links.map((link) => (
                        <SidebarMenuItem key={link.href}>
                            <SidebarMenuButton render={<Link href={link.href} />}>{link.label}</SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
