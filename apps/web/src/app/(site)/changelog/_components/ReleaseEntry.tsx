import type { ComponentType } from "react";
import Link from "next/link";

import type { MDXComponents } from "mdx/types";

import { Badge } from "@hathway/ui/components/badge";

import { koreanDate, releaseTags } from "@/content/collections";
import type { Release } from "@/content/types";
import { paths } from "@/lib/paths";

import { H3, H4 } from "../../_components/prose";

/** 피드에서는 판의 제목이 h2 라서 본문의 제목을 한 칸씩 내린다 */
const FEED_HEADINGS: MDXComponents = { h2: H3, h3: H4 };

/**
 * 새 소식의 판 하나. 왼쪽 칸에 날짜와 판 번호가 서고, 오른쪽 칸에 꼬리표 · 제목 · 큰 그림 · 본문이 차례로 선다.
 * 피드(`/changelog`)와 판 하나의 화면(`/changelog/[version]`)이 같은 모양을 쓴다.
 *
 * ⚠ 피드에서는 제목이 판 화면으로 가는 링크이고 h2 다. 판 화면에서는 제목이 h1 이고, 그 위에 피드로 돌아가는
 *    「새 소식」이 선다.
 */
export function ReleaseEntry({ release, Body, mode }: {
    readonly release: Release;
    readonly Body: ComponentType<{ readonly components?: MDXComponents }>;
    readonly mode: "feed" | "page";
})
{
    const tags = releaseTags(release);

    return (
        <article className="changelog-entry" aria-labelledby={`release-${release.version}`}>
            <div className="changelog-aside">
                <time dateTime={release.date} className="changelog-date">{koreanDate(release.date)}</time>
                <Badge variant="outline">{release.version}</Badge>
            </div>
            <div className="changelog-main">
                <div className="changelog-eyebrow">
                    {mode === "page" ? <Link href={paths.changelog()}>새 소식</Link> : <span>새 소식</span>}
                    {tags.map((tag) => <span key={tag}>· {tag}</span>)}
                </div>
                {mode === "page"
                    ? <h1 id={`release-${release.version}`} className="changelog-title" data-size="page">{release.title}</h1>
                    : (
                        <h2 id={`release-${release.version}`} className="changelog-title">
                            <Link href={paths.release(release.version)}>{release.title}</Link>
                        </h2>
                    )}
                {release.image === undefined ? null : (
                    <figure className="changelog-figure">
                        {/* 크기를 아는 정적 파일이라 최적화 서버를 거치지 않는다 */}
                        <img src={release.image.src} alt={release.image.alt} width={release.image.width} height={release.image.height} loading={mode === "page" ? "eager" : "lazy"} />
                    </figure>
                )}
                <div className="typeset typeset-tool changelog-body">
                    {mode === "feed" ? <Body components={FEED_HEADINGS} /> : <Body />}
                </div>
            </div>
        </article>
    );
}
