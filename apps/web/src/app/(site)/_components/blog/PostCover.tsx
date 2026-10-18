import { BRAND } from "@/content/blog";
import type { PostCover as Cover } from "@/content/types";

/**
 * 글의 표지. 그림 파일 대신 표지의 글을 칸을 닮은 괘선 위에 세운다. 첫 줄은 굵게, 나머지 줄은 가늘게 선다.
 * 크기는 놓인 자리가 정한다(`size`). 글자 크기는 표지의 폭을 따라가므로 카드와 머리에서 같은 비율로 읽힌다(`blog.css`).
 *
 * ⚠ 표지의 글은 제목을 되풀이하므로 읽는 사람에게는 감춘다(`aria-hidden`). 제목은 표지 밖의 `h1` · `h2` · `h3` 가 말한다.
 */
export function PostCover({ cover, category, size }: { readonly cover: Cover; readonly category: string; readonly size: "feature" | "card" | "banner" })
{
    const [first, ...rest] = cover.lines;

    return (
        <div aria-hidden className="blog-cover" data-size={size} data-tone={cover.tone} data-pattern={cover.pattern}>
            <div className="blog-cover-head">
                <span>{category}</span>
                <span className="blog-cover-brand">{BRAND}</span>
            </div>
            <p className="blog-cover-title">
                <span className="blog-cover-strong">{first}</span>
                {rest.map((line, index) => <span key={`${index}-${line}`}>{line}</span>)}
            </p>
        </div>
    );
}
