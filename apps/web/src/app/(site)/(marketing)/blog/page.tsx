import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@hathway/ui/components/button";
import { ArrowRight } from "@hathway/ui/icons";

import { BLOG_DESCRIPTION, POSTS } from "@/content/blog";
import { featureFirst } from "@/content/collections";
import { paths } from "@/lib/paths";

import { PostCard, PostMeta } from "../../_components/blog/PostCard";
import { PostCover } from "../../_components/blog/PostCover";

import "./blog.css";

export const metadata: Metadata = { title: "블로그", description: BLOG_DESCRIPTION };

/**
 * 블로그 목록. 위에서부터 추천 글 한 편(큰 표지 · 제목 · 요약 · 읽기 단추) → 나머지 글의 카드 격자다.
 * 두 칸은 가는 선으로 나뉘고, 전체가 양옆 선을 두른 한 장의 판에 선다. 무엇이 추천 글인지는 `featureFirst` 가 정한다.
 */
export default function BlogPage()
{
    const { feature, rest } = featureFirst(POSTS);

    return (
        <div className="blog-frame">
            <header className="blog-section blog-intro">
                <h1 className="blog-heading">블로그</h1>
                <p className="blog-lead">{BLOG_DESCRIPTION}</p>
            </header>
            {feature === null ? null : (
                <section aria-labelledby="blog-feature" className="blog-section">
                    <Link href={paths.post(feature.slug)} className="blog-feature">
                        <PostCover cover={feature.cover} category={feature.category} size="feature" />
                        <div className="blog-feature-body">
                            <p className="blog-eyebrow">추천 글</p>
                            <h2 id="blog-feature" className="blog-feature-title">{feature.title}</h2>
                            {"summary" in feature ? <p className="blog-feature-summary">{feature.summary}</p> : null}
                            <PostMeta post={feature} />
                            <span data-slot="button" className={buttonVariants({ className: "blog-read" })}>읽어 보기<ArrowRight /></span>
                        </div>
                    </Link>
                </section>
            )}
            {rest.length === 0 ? null : (
                <section aria-labelledby="blog-all" className="blog-section">
                    <h2 id="blog-all" className="blog-heading">최근 글</h2>
                    <ul className="blog-grid">
                        {rest.map((post) => (
                            <li key={post.slug}>
                                <PostCard post={post} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
