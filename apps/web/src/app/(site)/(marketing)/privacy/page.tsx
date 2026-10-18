import type { Metadata } from "next";

import Privacy from "@/content/legal/privacy.mdx";

import { LegalArticle } from "../../_components/LegalArticle";

export const metadata: Metadata = { title: "개인정보 처리방침", description: "어떤 개인정보를 모으고 어디에 쓰는지 적었어요." };

/** 개인정보 처리방침. 글은 `content/legal/privacy.mdx` 에 있다 */
export default function PrivacyPage()
{
    return <LegalArticle title="개인정보 처리방침" Body={Privacy} />;
}
