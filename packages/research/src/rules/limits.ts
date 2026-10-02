import type { BoardChange } from "../domain/Board.ts";

/**
 * 쓴 사람이 고칠 수 있는 한도(INV-RESEARCH-05). 넘으면 무엇을 넘었는지 알려 준다.
 *
 * 꼴이 틀린 입력(`domain/Board.ts` 의 스키마가 거르는 것)은 화면에서 나올 수 없으므로 까닭을 알려 주지 않는다.
 * 여기 있는 것은 사람이 길게 쓰거나 많이 만들다가 닿는 한도다. 조용히 자르지 않고 통째로 거절한다. 자르면 쓴 사람이
 * 모르는 사이에 내용이 사라진다.
 *
 * ⚠ **제목은 비어 있어도 받는다.** 지우고 다시 쓰는 사이에 자동 저장이 돈다. 거절하면 그 순간마다 화면이 저장 실패를 띄운다.
 * ⚠ **링크의 모양을 여기서 본다.** 화면이 그 값을 그대로 `href` 에 넣는다. `javascript:` 는 눌렀을 때 코드가 돌고,
 *    `//host` 와 `/\host` 는 브라우저가 바깥 주소로 읽는다.
 */
export const BOARD_LIMITS = {
    title: 120,
    tagline: 300,
    body: 20000,
    groups: 50,
    widgets: 50,
} as const;

export type LimitVerdict =
    | { readonly _tag: "Ok" }
    | { readonly _tag: "Over"; readonly message: string };

const over = (message: string): LimitVerdict => ({ _tag: "Over", message });

const MESSAGES = {
    title: `제목은 ${BOARD_LIMITS.title}자까지 쓸 수 있어요.`,
    tagline: `설명은 ${BOARD_LIMITS.tagline}자까지 쓸 수 있어요.`,
    body: `본문은 ${BOARD_LIMITS.body.toLocaleString("ko-KR")}자까지 쓸 수 있어요.`,
    groups: `그룹은 ${BOARD_LIMITS.groups}개까지 만들 수 있어요.`,
    widgets: `한 그룹에는 칸을 ${BOARD_LIMITS.widgets}개까지 둘 수 있어요.`,
    href: "링크는 https:// 나 / 로 시작해야 해요.",
} as const;

/** 글자 수로 센다. `length` 는 UTF-16 단위라 이모지 하나가 둘로 세어진다 */
const longer = (value: string, limit: number): boolean => [...value].length > limit;

export const isSafeHref = (value: string): boolean =>
    /^https?:\/\//i.test(value) || (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\"));

/** 제목 하나의 판정. 새로 만들 때와 저장할 때가 같은 한도를 쓴다 */
export const titleVerdict = (title: string): LimitVerdict =>
    (longer(title, BOARD_LIMITS.title) ? over(MESSAGES.title) : { _tag: "Ok" });

export const limitVerdict = (change: BoardChange): LimitVerdict =>
{
    if (longer(change.title, BOARD_LIMITS.title)) return over(MESSAGES.title);
    if (longer(change.tagline, BOARD_LIMITS.tagline)) return over(MESSAGES.tagline);
    if (change.groups.length > BOARD_LIMITS.groups) return over(MESSAGES.groups);

    for (const group of change.groups)
    {
        if (longer(group.title, BOARD_LIMITS.title)) return over(MESSAGES.title);
        if (group.widgets.length > BOARD_LIMITS.widgets) return over(MESSAGES.widgets);

        for (const widget of group.widgets)
        {
            if (longer(widget.title, BOARD_LIMITS.title)) return over(MESSAGES.title);
            if (widget.body !== undefined && longer(widget.body, BOARD_LIMITS.body)) return over(MESSAGES.body);
            if (widget.href !== undefined && !isSafeHref(widget.href)) return over(MESSAGES.href);

            for (const item of widget.items ?? [])
            {
                if (item.href !== undefined && !isSafeHref(item.href)) return over(MESSAGES.href);
            }
        }
    }

    return { _tag: "Ok" };
};
