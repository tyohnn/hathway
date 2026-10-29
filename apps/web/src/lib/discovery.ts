import { newestFirst } from "@/content/collections";
import type { BlogPost, DocPage, Release } from "@/content/types";

import { paths } from "./paths";

/**
 * 검색 엔진과 AI 가 이 서비스를 찾고 읽는 길. `sitemap.xml` · `llms.txt` · 글의 JSON-LD 가 같은 목록을 이 파일에서 받는다.
 *
 * 주소는 모두 공개 주소(`SITE_URL`)를 앞에 붙인 절대 주소다. 상대 주소는 sitemap 과 llms.txt 를 읽는 쪽이 풀지 못한다.
 * ⚠ 공개 화면만 싣는다. 로그인해야 보이는 화면은 크롤러가 열어도 로그인으로 돌아가므로 실어 봐야 헛걸음이다.
 * ⚠ `/docs` 는 첫 글로 넘기는 주소라 싣지 않고 글마다 싣는다. `/changelog` 는 판을 모두 세운 피드라 판들과 함께 싣는다.
 */
export interface SiteIndex
{
    readonly name: string;
    readonly description: string;
    /** llms.txt 의 설명 아래에 한 번 더 싣는 고지. 이 제품은 「투자 자문이 아니다」를 여기 적는다 */
    readonly notice?: string;
    /**
     * 글 모음 밖의 공개 화면(종목 · 산업 지도처럼 로그인 없이 읽는 화면). sitemap 의 맨 앞과 llms.txt 의 「화면」에 실린다.
     * ⚠ `/` 처럼 다른 주소로 넘기는 주소는 싣지 않는다. 넘기는 주소가 sitemap 에 있으면 Search Console 이 오류로 센다.
     */
    readonly pages: ReadonlyArray<SitePage>;
    readonly posts: ReadonlyArray<BlogPost>;
    readonly docs: ReadonlyArray<DocPage>;
    readonly releases: ReadonlyArray<Release>;
    /** 개인정보 처리방침과 이용약관의 시행일(YYYY-MM-DD). 두 글은 이 날에 함께 바뀐다 */
    readonly legalEffectiveOn: string;
}

export interface SitePage
{
    /** 앞이 `/` 인 경로. 한글 마디는 `encodeURIComponent` 를 지난 값이다 */
    readonly path: string;
    readonly title: string;
    readonly note?: string;
}

export interface SitemapEntry
{
    readonly url: string;
    /** 그 화면의 글이 바뀐 날(YYYY-MM-DD). 모르면 비워 둔다 */
    readonly lastModified?: string;
}

export const sitemapEntries = (site: string, index: SiteIndex): ReadonlyArray<SitemapEntry> => [
    ...index.pages.map((page) => ({ url: `${site}${page.path}` })),
    { url: `${site}${paths.blog()}` },
    ...newestFirst(index.posts).map((post) => ({ url: `${site}${paths.post(post.slug)}`, lastModified: post.date })),
    ...index.docs.map((doc) => ({ url: `${site}${paths.docs(doc.slug)}` })),
    { url: `${site}${paths.changelog()}`, lastModified: newestFirst(index.releases)[0]?.date },
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
        ...(index.notice === undefined ? [] : [index.notice, ""]),
        "## 화면",
        "",
        ...index.pages.map((page) => link(page.title, `${site}${page.path}`, page.note)),
        "",
        "## AI 앱 연결",
        "",
        `- MCP 엔드포인트: ${site}/api/mcp (Streamable HTTP, OAuth 2.1 로그인)`,
        `- [연결하는 법](${site}${paths.docs("chatgpt")})`,
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

/** 운영 주체. schema.org `Organization` 에 싣는 값이다 */
export interface Operator
{
    readonly name: string;
    readonly email: string;
}

/**
 * 공개 화면의 schema.org `Organization` 과 `WebApplication`. 검색 결과와 AI 가 서비스 이름 · 운영 주체 · 주소를 묶는 근거다.
 * 값은 무료(`offers.price` 0)로 싣는다. 요금을 받게 되면 이 값을 고친다.
 */
export const siteLd = (
    site: string,
    name: string,
    description: string,
    operator: Operator,
    /** 서비스의 첫 화면. `/` 가 다른 주소로 넘기는 제품은 넘어간 뒤의 주소를 준다 */
    entryPath: string = paths.landing(),
): ReadonlyArray<Readonly<Record<string, unknown>>> => [
    {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: operator.name,
        url: `${site}${paths.landing()}`,
        email: operator.email,
    },
    {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name,
        description,
        url: `${site}${entryPath}`,
        inLanguage: "ko",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: 0, priceCurrency: "KRW" },
        publisher: { "@type": "Organization", name: operator.name },
    },
];

/**
 * JSON-LD 를 `<script type="application/ld+json">` 에 넣을 글로 바꾼다.
 * ⚠ `<` 를 `<` 로 바꾼다. 글의 제목에 `</script>` 가 들어오면 태그가 닫히고 그 뒤가 HTML 로 읽힌다.
 */
export const jsonLdScript = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c");
