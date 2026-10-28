import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { POSTS } from "./blog";
import { RELEASES } from "./changelog";
import { docGroups, featureFirst, headingId, koreanDate, neighbours, newestFirst, otherPosts } from "./collections";
import { DOCS } from "./docs";
import type { Release } from "./types";

/**
 * 저장소의 글과 목록 파일이 어긋나지 않는가. 목록에 없는 MDX 는 화면에 서지 않고, 파일이 없는 목록은 빌드에서야 깨진다.
 */
const here = dirname(fileURLToPath(import.meta.url));

const mdxIn = (folder: string): ReadonlyArray<string> =>
    readdirSync(join(here, folder))
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => name.replace(/\.mdx$/, ""))
        .sort();

const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("저장소의 글", () =>
{
    it("블로그의 MDX 는 모두 목록에 있고 목록의 글은 모두 파일이 있다", () =>
    {
        assert.deepStrictEqual(mdxIn("blog"), POSTS.map((post) => post.slug).sort());
    });

    it("새 소식의 MDX 는 모두 목록에 있고 판 번호가 겹치지 않는다", () =>
    {
        assert.deepStrictEqual(mdxIn("changelog"), RELEASES.map((release) => release.version).sort());
        assert.strictEqual(new Set(RELEASES.map((release) => release.version)).size, RELEASES.length);
    });

    it("새 소식의 큰 그림은 public/changelog 에 파일이 있고 무엇을 보여 주는지 적혀 있다", () =>
    {
        for (const release of RELEASES as ReadonlyArray<Release>)
        {
            if (release.image === undefined)
            {
                continue;
            }

            assert.match(release.image.src, /^\/changelog\/[^/]+\.(png|jpg|webp)$/, release.version);
            assert.isTrue(existsSync(join(here, "../../public", release.image.src)), release.image.src);
            assert.isAbove(release.image.alt.trim().length, 0, release.version);
        }
    });

    it("문서의 MDX 는 모두 목록에 있다. 코드로 그리는 문서는 MDX 가 없어도 된다", () =>
    {
        const slugs = DOCS.map((doc) => doc.slug);

        for (const slug of mdxIn("docs"))
        {
            assert.include(slugs, slug);
        }

        assert.strictEqual(new Set(slugs).size, slugs.length);
    });

    it("날짜는 YYYY-MM-DD 로 적는다. 목록은 날짜로 줄을 세운다", () =>
    {
        for (const item of [...POSTS, ...RELEASES])
        {
            assert.match(item.date, DATE, "title" in item ? item.title : "");
        }
    });

    it("주소에 쓰는 이름은 소문자와 숫자와 하이픈과 점이다", () =>
    {
        for (const slug of [...POSTS.map((post) => post.slug), ...DOCS.map((doc) => doc.slug), ...RELEASES.map((release) => release.version)])
        {
            assert.match(slug, /^[a-z0-9][a-z0-9.-]*$/);
        }
    });
});

describe("목록을 세우는 규칙", () =>
{
    it("최근 것이 먼저이고 날짜가 같으면 적힌 차례를 지킨다", () =>
    {
        const sorted = newestFirst([
            { id: "a", date: "2026-01-01" },
            { id: "b", date: "2026-03-01" },
            { id: "c", date: "2026-03-01" },
        ]);

        assert.deepStrictEqual(sorted.map((item) => item.id), ["b", "c", "a"]);
    });

    it("문서의 묶음은 처음 나온 차례대로 서고 앞뒤 문서를 알려 준다", () =>
    {
        const docs = [
            { slug: "a", title: "A", description: "", group: "처음" },
            { slug: "b", title: "B", description: "", group: "연결" },
            { slug: "c", title: "C", description: "", group: "처음" },
        ];

        assert.deepStrictEqual(docGroups(docs).map((group) => [group.group, group.docs.map((doc) => doc.slug)]), [
            ["처음", ["a", "c"]],
            ["연결", ["b"]],
        ]);
        assert.deepStrictEqual(neighbours(docs, "b"), { previous: docs[0], next: docs[2] });
        assert.deepStrictEqual(neighbours(docs, "a").previous, null);
    });

    it("블로그 맨 위에는 추천 글 가운데 가장 최근 것이 서고, 추천 글이 없으면 가장 최근 글이 선다", () =>
    {
        const cover = { lines: ["표지"], tone: "paper", pattern: "rows" } as const;
        const post = (slug: string, date: string, featured?: boolean) => ({ slug, title: slug, date, category: "소개", cover, featured });
        const posts = [post("a", "2026-01-01", true), post("b", "2026-03-01"), post("c", "2026-02-01", true)];

        assert.deepStrictEqual(featureFirst(posts).feature?.slug, "c");
        assert.deepStrictEqual(featureFirst(posts).rest.map((each) => each.slug), ["b", "a"]);
        assert.deepStrictEqual(featureFirst([post("a", "2026-01-01"), post("b", "2026-03-01")]).feature?.slug, "b");
        assert.deepStrictEqual(featureFirst([]), { feature: null, rest: [] });
    });

    it("글 끝의 다른 글은 지금 글을 빼고 최근 것부터 정한 수만큼이다", () =>
    {
        const cover = { lines: ["표지"], tone: "paper", pattern: "rows" } as const;
        const post = (slug: string, date: string) => ({ slug, title: slug, date, category: "소개", cover });
        const posts = [post("a", "2026-01-01"), post("b", "2026-03-01"), post("c", "2026-02-01")];

        assert.deepStrictEqual(otherPosts(posts, "b", 2).map((each) => each.slug), ["c", "a"]);
        assert.deepStrictEqual(otherPosts(posts, "c", 1).map((each) => each.slug), ["b"]);
    });

    it("날짜는 글에 적힌 그대로 풀어 쓴다. 시간대 때문에 하루가 밀리지 않는다", () =>
    {
        assert.strictEqual(koreanDate("2026-09-29"), "2026년 9월 29일");
        assert.strictEqual(koreanDate("2026-01-01"), "2026년 1월 1일");
    });

    it("제목의 앵커는 한글을 남기고 띄어쓰기를 하이픈으로, 문장부호는 지운다", () =>
    {
        assert.strictEqual(headingId("Claude 앱"), "claude-앱");
        assert.strictEqual(headingId("  연결 끊기  "), "연결-끊기");
        assert.strictEqual(headingId("list_notes"), "list_notes");
        assert.strictEqual(headingId("무엇이 바뀌나요?"), "무엇이-바뀌나요");
    });
});
