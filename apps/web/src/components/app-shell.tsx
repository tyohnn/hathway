"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell, AppShellNav, type AppShellNavItem } from "@investment/blocks/app-shell";
import { BookOpen, Building, ChartLine, FileText, Globe, LayoutGrid, TrendingUp } from "@investment/ui/icons";
import type { IconComponent } from "@investment/ui/icons/names";
import { appName } from "@/lib/shared";
import {
    THEME_SECTIONS,
    THEMES,
    parseAppPath,
    sectionHref,
    themeHref,
    type ThemeId,
    type ThemeSectionId,
} from "@/lib/nav";
import { AppCrumbs } from "@/components/app-crumbs";
import { ThemeToggle } from "@/components/theme-toggle";

const THEME_ICON: Record<ThemeId, IconComponent> = {
    stocks: TrendingUp,
    "real-estate": Building,
};

const SECTION_ICON: Record<ThemeSectionId, IconComponent> = {
    analysis: LayoutGrid,
    macro: Globe,
    news: FileText,
    boards: ChartLine,
};

/**
 * 메뉴. 테마(주식 · 부동산)가 첫 겹이고 그 안의 섹션이 둘째 겹이다. 지금 서 있는 테마만 펴진다.
 *
 * ⚠ 종목을 보고 있을 때 「종목 분석」은 목록이 아니라 그 종목으로 돌아간다. 다른 섹션에 다녀와도 보던 종목을 잃지 않는다.
 *    `base` 는 섹션의 주소 그대로라 어느 항목이 켜지는지는 달라지지 않는다.
 */
function navGroups(stockCode: string | null): ReadonlyArray<ReadonlyArray<AppShellNavItem>>
{
    const themes = THEMES.map((theme): AppShellNavItem => ({
        label: theme.label,
        base: themeHref(theme.id),
        icon: THEME_ICON[theme.id],
        render: <Link href={themeHref(theme.id)} />,
        children: THEME_SECTIONS.map((section): AppShellNavItem =>
        {
            const base = sectionHref(theme.id, section.id);
            const href = theme.id === "stocks" && section.id === "analysis" && stockCode
                ? `${base}/${stockCode}`
                : base;

            return { label: section.label, base, icon: SECTION_ICON[section.id], render: <Link href={href} /> };
        }),
    }));

    return [
        themes,
        [{ label: "교재", base: "/book", icon: BookOpen, render: <Link href="/book" /> }],
    ];
}

/** 보드 하나를 연 화면은 캔버스가 남은 자리를 통째로 쓴다. 띠와 우물을 세우지 않는다 */
const isCanvas = (pathname: string): boolean => /^\/[^/]+\/boards\/[^/]+/.test(pathname);

/**
 * 앱 셸. 사이드바와 상단 띠와 본문 우물은 블록(`AppShell`)이 갖고, 이 파일은 메뉴와 현재 위치만 넘긴다.
 */
export function Shell({ children }: { children: ReactNode })
{
    const pathname = usePathname();
    const { stockCode } = parseAppPath(pathname);
    const groups = navGroups(stockCode ?? null);

    return (
        <AppShell
            brand={{ mark: appName.slice(0, 1), name: appName, render: <Link href="/" /> }}
            groups={groups}
            nav={<AppShellNav groups={groups} pathname={pathname} />}
            title={<AppCrumbs />}
            user={(
                <div className="flex items-center justify-end group-data-[collapsible=icon]:justify-center">
                    <ThemeToggle />
                </div>
            )}
            layout={isCanvas(pathname) ? "full" : "well"}
        >
            {children}
        </AppShell>
    );
}
