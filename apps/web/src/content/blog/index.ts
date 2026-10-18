import type { BlogPost } from "../types";

/**
 * 블로그 글 목록. 글을 더할 때는 이 폴더에 `<slug>.mdx` 를 두고 여기에 한 줄, `bodies.ts` 에 한 줄을 더한다.
 * 표지(`cover`)는 그림이 아니라 글이다. 줄을 짧게 끊어 두면 카드에서도 한눈에 읽힌다.
 * 추천 글(`featured`)이 없으면 가장 새 글이 목록 맨 위의 큰 표지로 선다(`featureFirst`).

 */
export const POSTS = [
    {
        slug: "hello",
        title: "Hathway 기업분석을 소개해요",
        summary: "공시와 재무 숫자로 기업을 읽고 적정가를 계산해 봐요.",
        date: "2026-10-18",
        category: "소개",
        featured: true,
        cover: { lines: ["공시와 재무 숫자로", "기업을 읽어요"], tone: "ink", pattern: "cells" },
    },
] as const satisfies ReadonlyArray<BlogPost>;

export type PostSlug = (typeof POSTS)[number]["slug"];

/** 화면에 쓰는 브랜드 이름. 표지와 쓴 사람이 이 값을 읽는다 */
export const BRAND = "Hathway";

/** 글에 쓴 사람을 적지 않았을 때 서는 이름 */
export const BLOG_AUTHOR = `${BRAND} 팀`;

/** 블로그가 무엇을 적는 곳인지. 목록의 머리와 검색 결과의 설명이 함께 쓴다 */
export const BLOG_DESCRIPTION = "Hathway 기업분석으로 기업을 읽는 법과 만들며 알게 된 것을 적어요.";
