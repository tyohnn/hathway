import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "@hathway/ui/icons";

import { BLOG_AUTHOR, POSTS } from "@/content/blog";
import { POST_BODIES } from "@/content/blog/bodies";
import { findPost, otherPosts } from "@/content/collections";
import { blogPostingLd } from "@/lib/discovery";
import { paths } from "@/lib/paths";
import { SITE_URL } from "@/lib/site";
import { SITE_INDEX } from "@/lib/siteIndex";

import { PostCard, PostMeta } from "../../../_components/blog/PostCard";
import { JsonLd } from "../../../_components/JsonLd";
import { PostCover } from "../../../_components/blog/PostCover";
import { ShareButton } from "../../../_components/blog/ShareButton";
import { TocRail } from "../../../_components/Toc";

import "../blog.css";

/**
 * 블로그 글 하나. 빌드 때 모두 그려 둔다(`generateStaticParams`). 목록에 없는 주소는 404 다.
 * 넓은 표지 → 왼쪽 기둥(블로그로 · 목차)과 오른쪽 본문(제목 · 날짜와 쓴 사람과 공유 단추 · 요약 · 본문) → 다른 글 두 편이다.
 * 목차는 본문(`data-toc-root`)의 h2 · h3 에서 줍고 넓은 화면에서만 선다.
 */
export function generateStaticParams(): Array<{ slug: string }>
{
    return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { readonly params: Promise<{ readonly slug: string }> }): Promise<Metadata>
{
    const post = findPost(POSTS, (await params).slug);

    if (post === null)
    {
        return { title: "블로그" };
    }

    return {
        title: post.title,
        description: post.summary,
        alternates: { canonical: paths.post(post.slug) },
        openGraph: { type: "article", title: post.title, description: post.summary, url: paths.post(post.slug), publishedTime: post.date },
    };
}

export default async function PostPage({ params }: { readonly params: Promise<{ readonly slug: string }> })
{
    const post = findPost(POSTS, (await params).slug);

    if (post === null)
    {
        notFound();
    }

    const Body = POST_BODIES[post.slug];
    const others = otherPosts(POSTS, post.slug, 2);

    return (
        <div className="blog-frame">
            <JsonLd data={blogPostingLd(SITE_URL, SITE_INDEX.name, post, BLOG_AUTHOR)} />
            <div className="blog-section blog-banner">
                <PostCover cover={post.cover} category={post.category} size="banner" />
            </div>
            <div className="blog-section blog-post">
                <aside className="blog-post-rail">
                    <Link href={paths.blog()} className="blog-back"><ArrowLeft />블로그</Link>
                    <TocRail />
                </aside>
                <article data-toc-root className="typeset site-article blog-article">
                    <h1>{post.title}</h1>
                    <div className="not-typeset blog-post-meta">
                        <PostMeta post={post} />
                        <ShareButton title={post.title} />
                    </div>
                    {"summary" in post ? <p className="site-lead">{post.summary}</p> : null}
                    <Body />
                </article>
            </div>
            {others.length === 0 ? null : (
                <section aria-labelledby="blog-others" className="blog-section">
                    <h2 id="blog-others" className="blog-heading">다른 글</h2>
                    <ul className="blog-grid">
                        {others.map((other) => (
                            <li key={other.slug}>
                                <PostCard post={other} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
