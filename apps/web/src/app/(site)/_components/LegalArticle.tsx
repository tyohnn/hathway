import type { ComponentType } from "react";

import { koreanDate } from "@/content/collections";
import { LEGAL } from "@/content/legal";

/**
 * 개인정보 처리방침과 이용약관이 함께 쓰는 틀. 시행일과 제목을 위에 두고 본문(MDX)을 그 아래에 그린다.
 *
 * 시행일은 두 글이 같은 날을 쓰므로 `content/legal/index.ts` 하나에서 읽는다.
 */
export function LegalArticle({ title, Body }: { readonly title: string; readonly Body: ComponentType })
{
    return (
        <article className="typeset site-article-centered px-6 pt-12 pb-24">
            <p className="not-typeset site-small"><time dateTime={LEGAL.effectiveOn}>{koreanDate(LEGAL.effectiveOn)}</time> 시행</p>
            <h1>{title}</h1>
            <Body />
        </article>
    );
}
