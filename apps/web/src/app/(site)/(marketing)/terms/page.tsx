import type { Metadata } from "next";

import Terms from "@/content/legal/terms.mdx";

import { LegalArticle } from "../../_components/LegalArticle";

export const metadata: Metadata = { title: "이용약관", description: "이 서비스를 쓸 때의 약속이에요." };

/** 이용약관. 글은 `content/legal/terms.mdx` 에 있다 */
export default function TermsPage()
{
    return <LegalArticle title="이용약관" Body={Terms} />;
}
