import { describe, expect, it } from "vitest";

import type { BlogPost, DocPage, Release } from "@/content/types";

import { blogPostingLd, jsonLdScript, llmsText, siteLd, sitemapEntries, type SiteIndex } from "./discovery";

const SITE = "https://example.test";

const post = (slug: string, date: string, extra: Partial<BlogPost> = {}): BlogPost => ({
    slug,
    title: `${slug} 제목`,
    summary: `${slug} 요약`,
    date,
    category: "소개",
    cover: { lines: ["표지"], tone: "paper", pattern: "rows" },
    ...extra,
});

const doc: DocPage = { slug: "getting-started", title: "시작하기", description: "처음 쓰는 법이에요.", group: "처음 쓸 때" };
const release: Release = { version: "0.1.0", title: "첫 공개", date: "2026-09-29" };

const index: SiteIndex = {
    name: "Hathway",
    description: "쪽지로 팀의 일을 나눠요.",
    pages: [{ path: "/stocks", title: "주식", note: "종목을 찾아요." }, { path: "/stocks/news", title: "뉴스" }],
    posts: [post("old", "2026-09-01"), post("new", "2026-09-20")],
    docs: [doc],
    releases: [release],
    legalEffectiveOn: "2026-10-17",
};

describe("sitemapEntries", () =>
{
    it("공개 화면 · 블로그 · 글 · 문서 · 새 소식 · 약관의 주소를 모두 싣는다. 다른 주소로 넘기는 뿌리는 싣지 않는다", () =>
    {
        const urls = sitemapEntries(SITE, index).map((entry) => entry.url);

        expect(urls).toEqual([
            `${SITE}/stocks`,
            `${SITE}/stocks/news`,
            `${SITE}/blog`,
            `${SITE}/blog/new`,
            `${SITE}/blog/old`,
            `${SITE}/docs/getting-started`,
            `${SITE}/changelog`,
            `${SITE}/changelog/0.1.0`,
            `${SITE}/privacy`,
            `${SITE}/terms`,
        ]);
    });

    it("글과 새 소식은 날짜를 고친 날로 싣는다", () =>
    {
        const entries = sitemapEntries(SITE, index);

        expect(entries.find((entry) => entry.url === `${SITE}/blog/old`)?.lastModified).toBe("2026-09-01");
        expect(entries.find((entry) => entry.url === `${SITE}/changelog/0.1.0`)?.lastModified).toBe("2026-09-29");
    });

    it("새 소식의 피드는 가장 최근 판의 날을 고친 날로 싣는다", () =>
    {
        const entries = sitemapEntries(SITE, { ...index, releases: [release, { version: "0.2.0", title: "둘째 판", date: "2026-10-20" }] });

        expect(entries.find((entry) => entry.url === `${SITE}/changelog`)?.lastModified).toBe("2026-10-20");
    });

    it("개인정보 처리방침과 이용약관은 시행일을 고친 날로 싣는다", () =>
    {
        const entries = sitemapEntries(SITE, index);

        expect(entries.find((entry) => entry.url === `${SITE}/privacy`)?.lastModified).toBe("2026-10-17");
        expect(entries.find((entry) => entry.url === `${SITE}/terms`)?.lastModified).toBe("2026-10-17");
    });
});

describe("llmsText", () =>
{
    it("제품 이름의 제목과 설명 인용으로 시작한다", () =>
    {
        expect(llmsText(SITE, index).startsWith("# Hathway\n\n> 쪽지로 팀의 일을 나눠요.\n")).toBe(true);
    });

    it("글과 문서마다 절대 주소의 링크와 요약을 한 줄로 싣는다", () =>
    {
        const text = llmsText(SITE, index);

        expect(text).toContain(`- [new 제목](${SITE}/blog/new): new 요약`);
        expect(text).toContain(`- [시작하기](${SITE}/docs/getting-started): 처음 쓰는 법이에요.`);
    });

    it("공개 화면과 MCP 엔드포인트를 절대 주소로 싣는다", () =>
    {
        const text = llmsText(SITE, index);

        expect(text).toContain(`- [주식](${SITE}/stocks): 종목을 찾아요.`);
        expect(text).toContain(`- [뉴스](${SITE}/stocks/news)\n`);
        expect(text).toContain(`${SITE}/api/mcp`);
    });

    it("고지가 있으면 설명 바로 아래에 싣는다", () =>
    {
        const text = llmsText(SITE, { ...index, notice: "투자 자문이 아니에요." });

        expect(text.startsWith("# Hathway\n\n> 쪽지로 팀의 일을 나눠요.\n\n투자 자문이 아니에요.\n")).toBe(true);
    });

    it("요약이 없는 글은 링크만 싣는다", () =>
    {
        const text = llmsText(SITE, { ...index, posts: [post("bare", "2026-09-02", { summary: undefined })] });

        expect(text).toContain(`- [bare 제목](${SITE}/blog/bare)\n`);
    });
});

describe("blogPostingLd", () =>
{
    it("BlogPosting 으로 제목 · 날짜 · 주소 · 쓴 사람 · 펴낸 곳을 싣는다", () =>
    {
        const ld = blogPostingLd(SITE, index.name, post("new", "2026-09-20", { author: "김 기자" }), "Hathway 팀");

        expect(ld).toEqual({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: "new 제목",
            description: "new 요약",
            datePublished: "2026-09-20",
            url: `${SITE}/blog/new`,
            mainEntityOfPage: `${SITE}/blog/new`,
            inLanguage: "ko",
            author: { "@type": "Person", name: "김 기자" },
            publisher: { "@type": "Organization", name: "Hathway", url: `${SITE}/` },
        });
    });

    it("쓴 사람이 없는 글은 팀 이름을 조직으로 싣는다", () =>
    {
        const ld = blogPostingLd(SITE, index.name, post("new", "2026-09-20"), "Hathway 팀");

        expect(ld.author).toEqual({ "@type": "Organization", name: "Hathway 팀" });
    });
});

describe("siteLd", () =>
{
    it("운영 주체의 Organization 과 서비스의 WebApplication 을 싣는다", () =>
    {
        const [organization, application] = siteLd(SITE, "Hathway", "설명", { name: "팍스휴마나", email: "a@example.test" });

        expect(organization).toMatchObject({ "@type": "Organization", name: "팍스휴마나", url: `${SITE}/`, email: "a@example.test" });
        expect(application).toMatchObject({
            "@type": "WebApplication",
            name: "Hathway",
            description: "설명",
            url: `${SITE}/`,
            applicationCategory: "FinanceApplication",
            publisher: { "@type": "Organization", name: "팍스휴마나" },
        });
    });

    it("첫 화면이 다른 주소로 넘어가는 제품은 WebApplication 의 주소를 넘어간 뒤의 주소로 싣는다", () =>
    {
        const [organization, application] = siteLd(SITE, "Hathway", "설명", { name: "팍스휴마나", email: "a@example.test" }, "/stocks");

        expect([organization?.["url"], application?.["url"]]).toEqual([`${SITE}/`, `${SITE}/stocks`]);
    });
});

describe("jsonLdScript", () =>
{
    it("< 를 이스케이프해 글 안의 문자열이 script 태그를 닫지 못한다", () =>
    {
        const script = jsonLdScript({ headline: "</script><script>alert(1)</script>" });

        expect(script).not.toContain("</script>");
        expect(JSON.parse(script)).toEqual({ headline: "</script><script>alert(1)</script>" });
    });
});
