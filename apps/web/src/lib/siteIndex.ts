import { BRAND, POSTS } from "@/content/blog";
import { RELEASES } from "@/content/changelog";
import { DOCS } from "@/content/docs";
import { LANDING } from "@/content/landing";
import { LEGAL } from "@/content/legal";

import type { SiteIndex } from "./discovery";

/**
 * 이 서비스의 공개 글 목록. `sitemap.xml` · `llms.txt` · JSON-LD 가 함께 읽는다.
 * 설명은 첫 화면의 첫 문장이다. 첫 화면의 글을 제품에 맞게 다시 쓰면(`content/landing.ts`) 여기도 따라간다.
 */
export const SITE_INDEX: SiteIndex = {
    name: BRAND,
    description: LANDING.hero.lead,
    posts: POSTS,
    docs: DOCS,
    releases: RELEASES,
    legalEffectiveOn: LEGAL.effectiveOn,
};
