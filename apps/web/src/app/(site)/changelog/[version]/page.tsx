import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@hathway/ui/components/item";
import { ArrowRight } from "@hathway/ui/icons";

import { RELEASES } from "@/content/changelog";
import { RELEASE_BODIES } from "@/content/changelog/bodies";
import { findRelease, koreanDate, newestFirst } from "@/content/collections";
import { paths } from "@/lib/paths";

import { ReleaseEntry } from "../_components/ReleaseEntry";

export function generateStaticParams(): Array<{ version: string }>
{
    return RELEASES.map((release) => ({ version: release.version }));
}

export async function generateMetadata({ params }: { readonly params: Promise<{ readonly version: string }> }): Promise<Metadata>
{
    return { title: findRelease(RELEASES, (await params).version)?.title ?? "새 소식" };
}

/**
 * 새 소식의 한 판. 피드와 같은 짜임(`ReleaseEntry`)에 제목이 h1 으로 서고, 끝에 지난 판이 줄을 선다.
 * 링크를 나누거나 검색에서 들어오는 자리라 판마다 주소를 둔다.
 */
export default async function ReleasePage({ params }: { readonly params: Promise<{ readonly version: string }> })
{
    const { version } = await params;
    const release = findRelease(RELEASES, version);

    if (release === null)
    {
        notFound();
    }

    const earlier = newestFirst(RELEASES).filter((entry) => entry.version !== release.version);

    return (
        <>
            <ReleaseEntry release={release} Body={RELEASE_BODIES[release.version]} mode="page" />
            {earlier.length === 0 ? null : (
                <section aria-labelledby="earlier-releases" className="changelog-earlier">
                    <h2 id="earlier-releases" className="site-row-name">지난 소식</h2>
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
            )}
        </>
    );
}
