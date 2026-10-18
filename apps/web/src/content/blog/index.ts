import type { BlogPost } from "../types";

/**
 * 블로그 글 목록. 글을 더할 때는 이 폴더에 `<slug>.mdx` 를 두고 여기에 한 줄, `bodies.ts` 에 한 줄을 더한다.
 * 표지(`cover`)는 그림이 아니라 글이다. 줄을 짧게 끊어 두면 카드에서도 한눈에 읽힌다.
 * 추천 글(`featured`)이 없으면 가장 새 글이 목록 맨 위의 큰 표지로 선다(`featureFirst`).
 *
 * ⚠ 스캐폴드의 예시 글이다. 새 제품에서 지우거나 바꾼다.
 */
export const POSTS = [
    {
        slug: "hello",
        title: "Hathway를 소개해요",
        summary: "쪽지로 팀의 일을 나누는 방법",
        date: "2026-09-29",
        category: "소개",
        featured: true,
        cover: { lines: ["흩어진 팀의 일을", "쪽지 한 장으로"], tone: "ink", pattern: "cells" },
    },
    {
        slug: "note-visibility",
        title: "쪽지를 누구에게 보일지 골라요",
        summary: "조직 전체에 보일 쪽지와 나만 볼 쪽지를 나누는 법이에요.",
        date: "2026-09-28",
        category: "쓰는 법",
        cover: { lines: ["쪽지의 공개 범위", "고르는 법"], tone: "paper", pattern: "rows" },
    },
    {
        slug: "invite-team",
        title: "팀에 사람을 들이고 내보내요",
        summary: "새 사람을 초대하고, 떠난 사람을 팀에서 내보내는 순서예요.",
        date: "2026-09-27",
        category: "쓰는 법",
        cover: { lines: ["팀에 사람을", "들이고 내보내요"], tone: "paper", pattern: "columns" },
    },
] as const satisfies ReadonlyArray<BlogPost>;

export type PostSlug = (typeof POSTS)[number]["slug"];

/** 화면에 쓰는 브랜드 이름. 표지와 쓴 사람이 이 값을 읽는다 */
export const BRAND = "Hathway";

/** 글에 쓴 사람을 적지 않았을 때 서는 이름 */
export const BLOG_AUTHOR = `${BRAND} 팀`;

/** 블로그가 무엇을 적는 곳인지. 목록의 머리와 검색 결과의 설명이 함께 쓴다 */
export const BLOG_DESCRIPTION = "Hathway를 쓰는 법과 만들며 알게 된 것을 적어요.";
