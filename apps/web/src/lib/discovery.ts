import { newestFirst } from "@/content/collections";
import type { BlogPost, DocPage, Release } from "@/content/types";

import { paths } from "./paths";

/**
 * 검색 엔진과 AI 가 이 서비스를 찾고 읽는 길. `sitemap.xml` · `llms.txt` · 글의 JSON-LD 가 같은 목록을 이 파일에서 받는다.
 *
 * 주소는 모두 공개 주소(`SITE_URL`)를 앞에 붙인 절대 주소다. 상대 주소는 sitemap 과 llms.txt 를 읽는 쪽이 풀지 못한다.
 * ⚠ 공개 화면만 싣는다. 로그인해야 보이는 화면은 크롤러가 열어도 로그인으로 돌아가므로 실어 봐야 헛걸음이다.
 * ⚠ `/docs` · `/changelog` 는 첫 글로 넘기는 주소라 싣지 않고 글마다 싣는다.
 */
export interface SiteIndex
{
    readonly name: string;
    readonly description: string;
    readonly posts: ReadonlyArray<BlogPost>;
    readonly docs: ReadonlyArray<DocPage>;
    readonly releases: ReadonlyArray<Release>;
    /** 개인정보 처리방침과 이용약관의 시행일(YYYY-MM-DD). 두 글은 이 날에 함께 바뀐다 */
    readonly legalEffectiveOn: string;
}

export interface SitemapEntry
{
    readonly url: string;
    /** 그 화면의 글이 바뀐 날(YYYY-MM-DD). 모르면 비워 둔다 */
    readonly lastModified?: string;
}

export const sitemapEntries = (site: string, index: SiteIndex): ReadonlyArray<SitemapEntry> => [
    { url: `${site}${paths.landing()}` },
    { url: `${site}${paths.blog()}` },
    ...newestFirst(index.posts).map((post) => ({ url: `${site}${paths.post(post.slug)}`, lastModified: post.date })),
    ...index.docs.map((doc) => ({ url: `${site}${paths.docs(doc.slug)}` })),
    ...newestFirst(index.releases).map((release) => ({ url: `${site}${paths.release(release.version)}`, lastModified: release.date })),
    { url: `${site}${paths.privacy()}`, lastModified: index.legalEffectiveOn },
    { url: `${site}${paths.terms()}`, lastModified: index.legalEffectiveOn },
];

const link = (title: string, url: string, note?: string): string => (note === undefined ? `- [${title}](${url})` : `- [${title}](${url}): ${note}`);

/**
 * `llms.txt`(https://llmstxt.org). AI 가 이 서비스를 한 번에 파악하도록 제목 · 한 줄 설명 · 읽을 글의 목록만 마크다운으로 적는다.
 * 화면의 메뉴나 꾸밈은 싣지 않는다.
 */
export const llmsText = (site: string, index: SiteIndex): string =>
    [
        `# ${index.name}`,
        "",
        `> ${index.description}`,
        "",
        "## 문서",
        "",
        ...index.docs.map((doc) => link(doc.title, `${site}${paths.docs(doc.slug)}`, doc.description)),
        "",
        "## 블로그",
        "",
        ...newestFirst(index.posts).map((post) => link(post.title, `${site}${paths.post(post.slug)}`, post.summary)),
        "",
        "## 새 소식",
        "",
        ...newestFirst(index.releases).map((release) => link(`${release.version} ${release.title}`, `${site}${paths.release(release.version)}`)),
        "",
    ].join("\n");

/** 글 하나의 schema.org `BlogPosting`. 쓴 사람이 없으면 팀 이름을 조직으로 싣는다 */
export const blogPostingLd = (site: string, name: string, post: BlogPost, team: string): Readonly<Record<string, unknown>> =>
{
    const url = `${site}${paths.post(post.slug)}`;

    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        ...(post.summary === undefined ? {} : { description: post.summary }),
        datePublished: post.date,
        url,
        mainEntityOfPage: url,
        inLanguage: "ko",
        author: post.author === undefined ? { "@type": "Organization", name: team } : { "@type": "Person", name: post.author },
        publisher: { "@type": "Organization", name, url: `${site}${paths.landing()}` },
    };
};

/** 첫 화면의 schema.org `Organization` 과 `WebSite`. 검색 결과와 AI 가 서비스 이름과 주소를 묶는 근거다 */
export const siteLd = (site: string, name: string, description: string): ReadonlyArray<Readonly<Record<string, unknown>>> => [
    { "@context": "https://schema.org", "@type": "Organization", name, url: `${site}${paths.landing()}` },
    { "@context": "https://schema.org", "@type": "WebSite", name, description, url: `${site}${paths.landing()}`, inLanguage: "ko" },
];

/**
 * JSON-LD 를 `<script type="application/ld+json">` 에 넣을 글로 바꾼다.
 * ⚠ `<` 를 `<` 로 바꾼다. 글의 제목에 `</script>` 가 들어오면 태그가 닫히고 그 뒤가 HTML 로 읽힌다.
 */
export const jsonLdScript = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c");
