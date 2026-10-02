import type { Actor } from "@investment/access/domain/Actor";

import type { Board } from "../domain/Board.ts";

/**
 * 이 사람이 이 보드를 고치거나 지울 수 있는가(INV-RESEARCH-02).
 *
 * 보드는 로그인하지 않아도 보인다(INV-RESEARCH-01). 그래서 보이는 것과 고칠 수 있는 것이 다른 물음이고,
 * 고치는 쪽의 답이 이 파일 하나에 있다. 화면과 서버 액션이 함께 이 함수를 지난다.
 *
 * ⚠ **보드는 사람이 아니라 테넌트의 것이다.** 만든 사람이 아니어도 같은 테넌트면 고치고 지운다.
 *    역할을 가리지 않는다(2026-10-02 사용자 결정: 구성원도 지운다).
 * ⚠ **다른 테넌트의 보드는 `NotFound` 다.** 누구에게나 보이는 보드라 있다는 사실이 비밀은 아니지만,
 *    「남의 것이라 안 된다」와 「없다」를 가르면 부르는 쪽이 갈래를 둘 다 다뤄야 한다. 답을 하나로 둔다.
 * ⚠ **운영팀의 우회를 두지 않는다.** 필요해지면 이 함수 안에 술어로 더한다. 바깥에서 건너뛰지 않는다.
 */
export const ownsBoard = (actor: Actor, board: Pick<Board, "tenantId">): boolean =>
    actor.tenantId === board.tenantId;

export type EditVerdict =
    | { readonly _tag: "Allowed" }
    | { readonly _tag: "NotFound" }
    | { readonly _tag: "Stale"; readonly current: number };

/** 열었을 때의 판(`openedVersion`)이 지금의 판과 같아야 덮어쓴다(INV-RESEARCH-03) */
export const editVerdict = (actor: Actor, board: Board | null, openedVersion: number): EditVerdict =>
{
    if (board === null || !ownsBoard(actor, board))
    {
        return { _tag: "NotFound" };
    }

    if (board.version !== openedVersion)
    {
        return { _tag: "Stale", current: board.version };
    }

    return { _tag: "Allowed" };
};

export type RemoveVerdict =
    | { readonly _tag: "Allowed" }
    | { readonly _tag: "NotFound" };

/**
 * 지우기는 판을 대조하지 않는다. 지우려는 사람은 그 보드를 통째로 없애려는 것이라, 그사이 누가 고쳤는지가
 * 답을 바꾸지 않는다. 화면이 확인 창으로 한 번 묻는다.
 */
export const removeVerdict = (actor: Actor, board: Board | null): RemoveVerdict =>
    (board === null || !ownsBoard(actor, board) ? { _tag: "NotFound" } : { _tag: "Allowed" });
