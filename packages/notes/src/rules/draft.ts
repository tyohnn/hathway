import type { Actor } from "@hathway/access/domain/Actor";

import type { NewNote, NoteVisibility } from "../domain/Note.ts";

/**
 * 사람이 적은 것을 새 쪽지로 세운다. 서버 액션의 ④(도메인 규칙)에 해당하는 순수 함수다.
 *
 * ⚠ **테넌트와 쓴 사람은 입력에서 받지 않는다.** 행위자가 든 값을 쓴다. 폼에 `tenantId` 칸을 두면
 *    남의 테넌트에 쪽지를 심는 길이 생긴다.
 * ⚠ **입력의 모양(문자열인가)은 관문의 Schema 가 이미 보았다.** 여기서 보는 것은 뜻이다. 앞뒤 공백을
 *    걷은 제목이 비었는가, 길이가 한도를 넘는가.
 */
export const TITLE_MAX = 120;
export const BODY_MAX = 4000;

export interface DraftInput
{
    readonly title: string;
    readonly body: string;
    readonly visibility: NoteVisibility;
}

export type DraftVerdict =
    | { readonly _tag: "Accepted"; readonly note: NewNote }
    | { readonly _tag: "Rejected"; readonly field: "title" | "body"; readonly message: string };

export const draftNote = (actor: Actor, input: DraftInput): DraftVerdict =>
{
    const title = input.title.trim();
    const body = input.body.trim();

    if (title === "")
    {
        return { _tag: "Rejected", field: "title", message: "제목을 적어 주세요." };
    }

    if ([...title].length > TITLE_MAX)
    {
        return { _tag: "Rejected", field: "title", message: `제목은 ${TITLE_MAX}자까지 적을 수 있어요.` };
    }

    if ([...body].length > BODY_MAX)
    {
        return { _tag: "Rejected", field: "body", message: `내용은 ${BODY_MAX}자까지 적을 수 있어요.` };
    }

    return {
        _tag: "Accepted",
        note: {
            tenantId: actor.tenantId,
            authorId: actor.accountId,
            title,
            body,
            visibility: input.visibility,
        },
    };
};
