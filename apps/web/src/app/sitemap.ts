import type { MetadataRoute } from "next";

import { sitemapEntries } from "@/lib/discovery";
import { SITE_URL } from "@/lib/site";
import { SITE_INDEX } from "@/lib/siteIndex";

/** `/sitemap.xml`. 공개 화면의 주소를 검색 엔진에 알린다. 목록은 `lib/discovery.ts` 가 짠다 */
export default function sitemap(): MetadataRoute.Sitemap
{
    return sitemapEntries(SITE_URL, SITE_INDEX).map((entry) => ({ url: entry.url, lastModified: entry.lastModified }));
}
