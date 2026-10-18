import { POSTS } from "@/content/blog";
import { RELEASES } from "@/content/changelog";
import { DOCS } from "@/content/docs";
import { LEGAL } from "@/content/legal";
import { INDUSTRIES } from "@/lib/industry";

import type { SiteIndex, SitePage } from "./discovery";

/**
 * 이 서비스의 공개 글과 화면 목록. `sitemap.xml` · `llms.txt` · JSON-LD 가 함께 읽는다.
 *
 * ⚠ **설명은 첫 화면의 글(`content/landing.ts`)이 아니라 여기 적는다.** 소개 첫 화면을 두지 않아(`/` 는 `/stocks` 로 간다)
 *    그 파일은 스캐폴드의 쪽지 소개 그대로이기 때문이다. 첫 화면을 세우면 그 첫 문장과 이 설명을 맞춘다.
 * ⚠ 종목 하나하나의 화면(`/stocks/analysis/<종목 코드>`)은 싣지 않았다. 상장사 2천여 곳을 실으려면 sitemap 이 DB 를 읽어야 해서,
 *    색인을 넓힐 때 `generateSitemaps` 로 따로 세운다. 부동산 화면은 아직 내용이 없어 싣지 않는다.
 */
const PAGES: ReadonlyArray<SitePage> = [
    { path: "/stocks", title: "주식", note: "국내 상장 기업의 공시와 재무 숫자를 찾아보는 첫 화면이에요." },
    { path: "/stocks/analysis", title: "종목 분석", note: "종목을 골라 기업정보와 재무 추이, 8단계 분석을 봐요." },
    { path: "/stocks/macro", title: "거시경제" },
    { path: "/stocks/macro/industries", title: "산업 지도", note: "산업마다 밸류체인과 단계별 기업을 봐요." },
    ...INDUSTRIES.map((industry) => ({
        path: `/stocks/macro/industries/${encodeURIComponent(industry.slug)}`,
        title: `${industry.name} 밸류체인`,
        note: industry.tagline,
    })),
    { path: "/stocks/news", title: "전체 뉴스" },
    { path: "/stocks/boards", title: "리서치 보드", note: "분석한 것을 주제마다 모아 둔 보드예요." },
];

export const SITE_INDEX: SiteIndex = {
    name: LEGAL.service,
    description: "DART 공시와 재무 숫자로 국내 상장 기업을 읽고, 내가 세운 가정으로 적정가와 매수가를 계산해 보는 가치투자 연습 도구예요. ChatGPT 안에서도 쓸 수 있어요.",
    notice: "투자 자문이 아니에요. 계산은 이용자가 넣은 가정으로 낸 연습의 결과이고, 특정 종목을 사거나 팔라고 권하지 않아요. 공시와 재무 숫자의 정본은 DART(https://dart.fss.or.kr)예요.",
    pages: PAGES,
    posts: POSTS,
    docs: DOCS,
    releases: RELEASES,
    legalEffectiveOn: LEGAL.effectiveOn,
};
