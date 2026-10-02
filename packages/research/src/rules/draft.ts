import type { Actor } from "@investment/access/domain/Actor";

import type { BoardTheme, NewBoard } from "../domain/Board.ts";

/** 제목의 한도. 목록의 한 줄과 탭 제목에 들어가는 길이다 */
export const TITLE_LIMIT = 80;

export const DEFAULT_TITLE = "새 보드";

export type TitleVerdict =
    | { readonly _tag: "Ok"; readonly title: string }
    | { readonly _tag: "Blank" }
    | { readonly _tag: "TooLong"; readonly limit: number };

/**
 * 제목을 받아들일 수 있는가. 새로 만들 때와 저장할 때가 같은 판정을 지난다.
 *
 * ⚠ **글자 수로 센다.** `length` 는 UTF-16 단위라 이모지 하나가 둘로 세어진다. 사람이 세는 글자 수로 맞춘다.
 */
export const titleVerdict = (raw: string): TitleVerdict =>
{
    const title = raw.trim();

    if (title === "")
    {
        return { _tag: "Blank" };
    }

    if ([...title].length > TITLE_LIMIT)
    {
        return { _tag: "TooLong", limit: TITLE_LIMIT };
    }

    return { _tag: "Ok", title };
};

export interface DraftInput
{
    readonly theme: BoardTheme;
    readonly title?: string;
}

export type DraftVerdict =
    | { readonly _tag: "Drafted"; readonly board: NewBoard }
    | { readonly _tag: "BlankTitle" }
    | { readonly _tag: "TitleTooLong"; readonly limit: number };

/**
 * 새 보드(INV-RESEARCH-04). 테넌트와 만든 사람은 행위자에게서 오고 slug 는 서버가 짓는다.
 *
 * ⚠ **식별자를 스스로 만들지 않는다.** 난수는 받은 `newId` 에서 온다. 검사가 결정적이어야 하고, 순수 함수는
 *    시각과 난수를 스스로 읽지 않는다.
 */
export const draftBoard = (actor: Actor, input: DraftInput, newId: (prefix: string) => string): DraftVerdict =>
{
    const title = titleVerdict(input.title ?? DEFAULT_TITLE);

    if (title._tag === "Blank")
    {
        return { _tag: "BlankTitle" };
    }

    if (title._tag === "TooLong")
    {
        return { _tag: "TitleTooLong", limit: title.limit };
    }

    const groupId = newId("group");

    return {
        _tag: "Drafted",
        board: {
            slug: newId("board"),
            tenantId: actor.tenantId,
            createdBy: actor.accountId,
            theme: input.theme,
            title: title.title,
            tagline: "",
            groups: [
                {
                    id: groupId,
                    title: "새 그룹",
                    summary: "",
                    layout: { i: groupId, x: 0, y: 0, w: 6, h: 10, minW: 4 },
                    widgets: [],
                },
            ],
        },
    };
};
