import Link from "next/link";

import { BLOG_AUTHOR } from "@/content/blog";
import { koreanDate } from "@/content/collections";
import type { BlogPost } from "@/content/types";
import { paths } from "@/lib/paths";

import { PostCover } from "./PostCover";

/** 블로그 목록과 글 끝의 「다른 글」이 함께 쓰는 카드. 표지 → 날짜 · 쓴 사람 → 제목이고, 카드 전체가 글로 가는 링크다. 두 자리 모두 h2 칸 아래라 제목은 h3 다 */
export function PostCard({ post }: { readonly post: BlogPost })
{
    return (
        <Link href={paths.post(post.slug)} className="blog-card">
            <PostCover cover={post.cover} category={post.category} size="card" />
            <PostMeta post={post} />
            <h3 className="blog-card-title">{post.title}</h3>
        </Link>
    );
}

/** 「2026년 10월 17일 · Hathway 팀」. 목록의 카드와 글의 머리가 같은 줄을 쓴다 */
export function PostMeta({ post }: { readonly post: BlogPost })
{
    return (
        <p className="blog-meta">
            <time dateTime={post.date}>{koreanDate(post.date)}</time>
            <span aria-hidden className="blog-meta-dot" />
            <span>{post.author ?? BLOG_AUTHOR}</span>
        </p>
    );
}
