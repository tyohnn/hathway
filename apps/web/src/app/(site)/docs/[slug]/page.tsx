import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@hathway/ui/components/breadcrumb";
import { Card, CardDescription, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { Separator } from "@hathway/ui/components/separator";
import { SidebarTrigger } from "@hathway/ui/components/sidebar";
import { ArrowLeft, ArrowRight } from "@hathway/ui/icons";

import { docGroups, findDoc, neighbours } from "@/content/collections";
import { DOCS } from "@/content/docs";
import { DOC_BODIES } from "@/content/docs/bodies";
import { paths } from "@/lib/paths";

import { AccountButton } from "../../_components/SiteHeader";
import { TocRail } from "../../_components/Toc";

export function generateStaticParams(): Array<{ slug: string }>
{
    return DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: { readonly params: Promise<{ readonly slug: string }> }): Promise<Metadata>
{
    const doc = findDoc(DOCS, (await params).slug);

    return { title: doc?.title ?? "문서", description: doc?.description };
}

/**
 * 문서 하나. tyohnn 의 docs 템플릿대로 머리에 경로 표시, 본문 머리에 제목과 한 줄 설명, 끝에 앞뒤 문서 카드,
 * 오른쪽에 목차 기둥이 선다.
 *
 * ⚠ 본문은 제 상자 안에서 스크롤한다(`data-toc-scroll`). 목차가 그 상자를 보고 지금 읽는 제목을 켠다.
 */
export default async function DocPage({ params }: { readonly params: Promise<{ readonly slug: string }> })
{
    const { slug } = await params;
    const doc = findDoc(DOCS, slug);

    if (doc === null)
    {
        notFound();
    }

    const Body = DOC_BODIES[doc.slug];
    const { previous, next } = neighbours(DOCS, slug);
    const groupHead = docGroups(DOCS).find((entry) => entry.group === doc.group)?.docs[0] ?? doc;

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink render={<Link href={paths.docs(groupHead.slug)} />}>{doc.group}</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="hidden md:block" />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{doc.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="ml-auto">
                    <AccountButton />
                </div>
            </header>
            {/* [contain:inline-size]: 본문이 SidebarInset 을 화면 너비 밖으로 밀지 않게 한다(템플릿과 같다) */}
            <div data-toc-scroll className="h-[calc(100svh-4rem)] min-h-0 overflow-y-auto [contain:inline-size]">
                <div className="flex gap-10 px-6 pt-8 pb-16 md:px-10">
                    <article data-toc-root className="typeset typeset-tool site-article min-w-0 flex-1">
                        <h1>{doc.title}</h1>
                        <p className="site-lead">{doc.description}</p>
                        <Body />
                        <nav aria-label="앞뒤 문서" className="not-typeset site-block grid gap-3 pt-6 sm:grid-cols-2">
                            {previous === null ? <span /> : (
                                <Link href={paths.docs(previous.slug)} className="site-pager">
                                    <Card size="sm">
                                        <CardHeader>
                                            <CardDescription className="flex items-center gap-1.5"><ArrowLeft />이전</CardDescription>
                                            <CardTitle>{previous.title}</CardTitle>
                                            <CardDescription>{previous.description}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            )}
                            {next === null ? null : (
                                <Link href={paths.docs(next.slug)} className="site-pager site-pager-next">
                                    <Card size="sm">
                                        <CardHeader>
                                            <CardDescription className="flex items-center justify-end gap-1.5">다음<ArrowRight /></CardDescription>
                                            <CardTitle>{next.title}</CardTitle>
                                            <CardDescription>{next.description}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                </Link>
                            )}
                        </nav>
                    </article>
                    <TocRail />
                </div>
            </div>
        </>
    );
}
