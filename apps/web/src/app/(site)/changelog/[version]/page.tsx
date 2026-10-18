import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@hathway/ui/components/badge";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@hathway/ui/components/breadcrumb";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@hathway/ui/components/item";
import { Separator } from "@hathway/ui/components/separator";
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from "@hathway/ui/components/sidebar";
import { ArrowRight, Calendar } from "@hathway/ui/icons";

import { RELEASES } from "@/content/changelog";
import { RELEASE_BODIES } from "@/content/changelog/bodies";
import { findRelease, koreanDate, newestFirst, releaseTags } from "@/content/collections";
import { paths } from "@/lib/paths";
import { SITE_URL } from "@/lib/site";

import { CopyButton } from "../../_components/CopyButton";
import { TocSidebar } from "../../_components/Toc";
import "../../site.css";

export function generateStaticParams(): Array<{ version: string }>
{
    return RELEASES.map((release) => ({ version: release.version }));
}

export async function generateMetadata({ params }: { readonly params: Promise<{ readonly version: string }> }): Promise<Metadata>
{
    return { title: findRelease(RELEASES, (await params).version)?.title ?? "새 소식" };
}

/**
 * 새 소식의 한 판. tyohnn 의 changelog 템플릿(shadcn sidebar-14)이다. 머리에 경로 표시와 오른쪽 사이드바를 여닫는 단추,
 * 본문 머리에 판 번호 · 날짜 · 꼬리표 · 링크 복사와 제목, 오른쪽 사이드바에 목차가 선다. 끝에 지난 판이 줄을 선다.
 */
export default async function ReleasePage({ params }: { readonly params: Promise<{ readonly version: string }> })
{
    const { version } = await params;
    const release = findRelease(RELEASES, version);

    if (release === null)
    {
        notFound();
    }

    const Body = RELEASE_BODIES[release.version];
    const tags = releaseTags(release);
    const earlier = newestFirst(RELEASES).filter((entry) => entry.version !== release.version);

    return (
        <SidebarProvider>
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink render={<Link href={paths.landing()} />}>Hathway 기업분석</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink render={<Link href={paths.changelog()} />}>새 소식</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{release.title}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <SidebarTrigger className="-mr-1 ml-auto rotate-180" aria-label="목차 열고 닫기" />
                </header>
                <div data-toc-scroll className="h-[calc(100svh-4rem)] min-h-0 overflow-y-auto [contain:inline-size]">
                    <article data-toc-root className="typeset typeset-tool site-article-centered px-6 pt-8 pb-16 md:px-10">
                        <div className="not-typeset flex flex-wrap items-center gap-2">
                            <Badge>{release.version}</Badge>
                            <time dateTime={release.date} className="site-small flex items-center gap-1.5"><Calendar />{koreanDate(release.date)}</time>
                            {tags.length === 0 ? null : (
                                <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-auto" />
                            )}
                            {tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                            <span className="ml-auto">
                                <CopyButton value={`${SITE_URL}${paths.release(release.version)}`} label="링크 복사하기" variant="outline" size="sm" />
                            </span>
                        </div>
                        <h1>{release.title}</h1>
                        <Body />
                        {earlier.length === 0 ? null : (
                            <>
                                <Separator className="not-typeset site-block" />
                                <section className="not-typeset site-block flex flex-col gap-3">
                                    <span className="site-row-name">지난 소식</span>
                                    <ItemGroup className="gap-2">
                                        {earlier.map((entry) => (
                                            <div key={entry.version} role="listitem">
                                                <Item variant="outline" size="sm" render={<Link href={paths.release(entry.version)} />}>
                                                    <ItemContent>
                                                        <ItemTitle>{entry.title}</ItemTitle>
                                                        <ItemDescription>{entry.version} · {koreanDate(entry.date)}</ItemDescription>
                                                    </ItemContent>
                                                    <ItemActions><ArrowRight className="site-title-icon" /></ItemActions>
                                                </Item>
                                            </div>
                                        ))}
                                    </ItemGroup>
                                </section>
                            </>
                        )}
                    </article>
                </div>
            </SidebarInset>
            <Sidebar side="right">
                <SidebarContent>
                    <TocSidebar />
                </SidebarContent>
                <SidebarRail aria-label="목차 열고 닫기" title="목차 열고 닫기" />
            </Sidebar>
        </SidebarProvider>
    );
}
