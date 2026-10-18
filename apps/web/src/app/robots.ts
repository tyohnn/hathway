import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * `/robots.txt`. 공개 화면은 검색 엔진과 AI 검색(OAI-SearchBot · PerplexityBot · ClaudeBot 등)에 모두 연다.
 * API 와 인증의 길은 막는다. 앱 화면은 막지 않는다. 크롤러가 열면 로그인으로 돌아가고, 로그인 화면은 `noindex` 라 실리지 않는다.
 * 앱 화면을 하나하나 적으면 화면 모듈이 늘 때마다 이 목록이 낡는다.
 *
 * ⚠ 모델 학습용 크롤러(GPTBot · Google-Extended 등)를 막을지는 제품이 정한다. 막으려면 그 이름으로 규칙을 하나 더한다.
 */
export default function robots(): MetadataRoute.Robots
{
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/api/", "/auth/", "/oauth/"],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
