"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTheme, getThemeSection, parseAppPath, sectionHref, themeHref } from "@/lib/nav";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@investment/ui/components/breadcrumb";
import { StockAnalysisCrumbs } from "@/components/stock-analysis-crumbs";

/**
 * 상단 띠의 현재 위치. 셸(`AppShell`)의 `title` 자리에 선다.
 *
 * 블록의 `AppShellTitle` 을 쓰지 않는 것은 종목 분석 화면의 위치가 고르는 칸(종목 · 기업정보/분석 순서 · 페이지)을
 * 함께 갖기 때문이다. 메뉴의 두 겹만으로는 그 위치를 적을 수 없다.
 */
export function AppCrumbs()
{
    const pathname = usePathname();
    const { theme, section, stockCode } = parseAppPath(pathname);
    const themeMeta = getTheme(theme);
    const sectionMeta = section ? getThemeSection(section) : null;

    return (
        <Breadcrumb aria-label="현재 위치" className="min-w-0 flex-1">
            <BreadcrumbList className="flex-nowrap overflow-x-auto">
                <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href={themeHref(theme)} />}>{themeMeta.label}</BreadcrumbLink>
                </BreadcrumbItem>
                {sectionMeta && (
                    <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            {stockCode ? (
                                <BreadcrumbLink render={<Link href={sectionHref(theme, sectionMeta.id)} />}>
                                    {sectionMeta.label}
                                </BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage>{sectionMeta.label}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                    </>
                )}
                {stockCode && <StockAnalysisCrumbs stockCode={stockCode} />}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
