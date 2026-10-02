'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getTheme, getThemeSection, parseAppPath, sectionHref, themeHref } from '@/lib/nav';
import { SidebarTrigger } from '@investment/ui/components/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@investment/ui/components/breadcrumb';
import { StockAnalysisCrumbs } from '@/components/stock-analysis-crumbs';

export function AppTopbar() {
  const pathname = usePathname();
  const { theme, section, stockCode } = parseAppPath(pathname);
  const themeMeta = getTheme(theme);
  const sectionMeta = section ? getThemeSection(section) : null;

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <span aria-hidden className="inline-block h-4 w-px shrink-0 self-center bg-border" />
      <Breadcrumb className="min-w-0 flex-1">
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
                  <BreadcrumbPage className="font-medium">{sectionMeta.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          )}
          {stockCode && <StockAnalysisCrumbs stockCode={stockCode} />}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
