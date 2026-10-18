import type { BlogPost, DocPage, Release } from "./types";

/**
 * 목록을 화면에 싣기 전에 거치는 순수 함수들. 시각을 읽지 않는다(날짜는 글에 적힌 값이다).
 */

/** 최근 것이 먼저다. 날짜가 같으면 목록에 적힌 차례를 지킨다 */
export const newestFirst = <T extends { readonly date: string }>(items: ReadonlyArray<T>): ReadonlyArray<T> =>
    items
        .map((item, index) => ({ item, index }))
        .sort((left, right) => right.item.date.localeCompare(left.item.date) || left.index - right.index)
        .map(({ item }) => item);

/**
 * 목록 맨 위의 큰 표지에 세울 글. `featured` 를 단 글 가운데 가장 최근 것이고, 단 글이 없으면 가장 최근 글이다.
 * 나머지(`rest`)는 최근 것이 먼저다. 글이 없으면 `feature` 가 null 이다.
 */
export const featureFirst = <T extends BlogPost>(posts: ReadonlyArray<T>): { readonly feature: T | null; readonly rest: ReadonlyArray<T> } =>
{
    const ordered = newestFirst(posts);
    const feature = ordered.find((post) => post.featured === true) ?? ordered[0] ?? null;

    return { feature, rest: ordered.filter((post) => post !== feature) };
};

/** 글 끝의 「다른 글」. 지금 글을 빼고 최근 것부터 `count` 개다 */
export const otherPosts = <T extends BlogPost>(posts: ReadonlyArray<T>, slug: string, count: number): ReadonlyArray<T> =>
    newestFirst(posts).filter((post) => post.slug !== slug).slice(0, count);

// 목록의 원소 타입(슬러그가 리터럴인 것)을 그대로 돌려준다. 본문 표(`bodies.ts`)를 그 슬러그로 찾기 때문이다
export const findPost = <T extends BlogPost>(posts: ReadonlyArray<T>, slug: string): T | null =>
    posts.find((post) => post.slug === slug) ?? null;

export const findDoc = <T extends DocPage>(docs: ReadonlyArray<T>, slug: string): T | null =>
    docs.find((doc) => doc.slug === slug) ?? null;

export const findRelease = <T extends Release>(releases: ReadonlyArray<T>, version: string): T | null =>
    releases.find((release) => release.version === version) ?? null;

/** 사이드바에 세울 묶음. 묶음의 차례와 묶음 안의 차례는 목록 파일에 적힌 차례다 */
export const docGroups = <T extends DocPage>(docs: ReadonlyArray<T>): ReadonlyArray<{ readonly group: string; readonly docs: ReadonlyArray<T> }> =>
{
    const groups: Array<{ group: string; docs: Array<T> }> = [];

    for (const doc of docs)
    {
        const found = groups.find((entry) => entry.group === doc.group);

        if (found === undefined)
        {
            groups.push({ group: doc.group, docs: [doc] });
        }
        else
        {
            found.docs.push(doc);
        }
    }

    return groups;
};

/** 문서 하나의 앞뒤. 문서 끝에서 다음 글로 넘어가는 길이다 */
export const neighbours = <T extends DocPage>(docs: ReadonlyArray<T>, slug: string): { readonly previous: T | null; readonly next: T | null } =>
{
    const index = docs.findIndex((doc) => doc.slug === slug);

    return {
        previous: index > 0 ? docs[index - 1] ?? null : null,
        next: index >= 0 ? docs[index + 1] ?? null : null,
    };
};

/** 「2026년 9월 29일」. 글에 적힌 날짜를 그대로 풀어 쓴다. 시간대를 타지 않도록 `Date` 로 바꾸지 않는다 */
export const koreanDate = (date: string): string =>
{
    const [year, month, day] = date.split("-").map(Number);

    return `${year}년 ${month}월 ${day}일`;
};

/**
 * 본문 제목의 앵커. 목차가 이 값으로 제목을 가리키고, 사람이 주소를 옮겨 붙여도 읽히도록 한글을 그대로 둔다
 * (「Claude 앱」 → `claude-앱`). 글자와 숫자와 밑줄과 하이픈 밖의 것은 지운다(도구 이름 `list_notes` 는 그대로다).
 */
export const headingId = (text: string): string =>
    text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}_-]/gu, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

/** 판의 꼬리표. 없으면 빈 목록이다. 목록이 `as const` 라 판마다 타입이 달라서 한 모양으로 읽는다 */
export const releaseTags = (release: Release): ReadonlyArray<string> => release.tags ?? [];
