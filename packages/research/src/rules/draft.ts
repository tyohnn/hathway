import type { Actor } from "@investment/access/domain/Actor";

import type { BoardTheme, NewBoard } from "../domain/Board.ts";
import { titleVerdict } from "./limits.ts";

export const DEFAULT_TITLE = "새 보드";

export interface DraftInput
{
    readonly theme: BoardTheme;
    readonly title?: string;
}

export type DraftVerdict =
    | { readonly _tag: "Drafted"; readonly board: NewBoard }
    | { readonly _tag: "Rejected"; readonly message: string };

/**
 * 새 보드(INV-RESEARCH-04). 테넌트와 만든 사람은 행위자에게서 오고 slug 는 서버가 짓는다.
 *
 * ⚠ **식별자를 스스로 만들지 않는다.** 난수는 받은 `newId` 에서 온다. 검사가 결정적이어야 하고, 순수 함수는
 *    시각과 난수를 스스로 읽지 않는다.
 */
export const draftBoard = (actor: Actor, input: DraftInput, newId: (prefix: string) => string): DraftVerdict =>
{
    const title = input.title ?? DEFAULT_TITLE;
    const verdict = titleVerdict(title);

    if (verdict._tag === "Over")
    {
        return { _tag: "Rejected", message: verdict.message };
    }

    const groupId = newId("group");

    return {
        _tag: "Drafted",
        board: {
            slug: newId("board"),
            tenantId: actor.tenantId,
            createdBy: actor.accountId,
            theme: input.theme,
            title,
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
