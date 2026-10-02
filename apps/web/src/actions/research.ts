"use server";

import { revalidatePath } from "next/cache";
import { Effect } from "effect";

import type { BoardTheme } from "@investment/research/domain/Board";

import { appAction } from "@/lib/action";
import { boardStoreLayer } from "@/lib/boardsRuntime";
import { REFUSAL_MESSAGES, refusalOf } from "@/lib/gateRefusal";
import { researchBoardHref, researchBoardsHref } from "@/lib/nav";
import {
    createBoard,
    CreateBoardInput,
    removeBoard,
    RemoveBoardInput,
    saveBoard,
    SaveBoardInput,
    type BoardActionResult,
    type RemoveBoardResult,
} from "@/usecases/research";

/**
 * 리서치 보드의 쓰기 셋. 전부 관문(`appAction`)을 지난다. 관문이 ① 입력 파싱과 ② 행위자 확정을 하고, 조립
 * (`usecases/research.ts`)이 ③ 행 단위 판정부터 잇는다.
 *
 * ⚠ **이 파일의 export 는 전부 공개 엔드포인트다.** 관문을 지나지 않은 함수를 여기서 내보내지 않는다.
 * ⚠ **로그인하지 않은 요청과 꼴이 틀린 입력은 핸들러에 닿지 않는다.** 화면이 그 거절을 글로 보일 수 있게, 끊긴 요청을
 *    여기서 어휘(`sign-in` · `invalid` · `failed`)로 바꿔 돌려준다(`lib/gateRefusal.ts`).
 */

const withBoards = <A, E>(program: Effect.Effect<A, E, import("@investment/research/ports/BoardStore").BoardStore>) =>
    Effect.flatMap(boardStoreLayer, (layer) => program.pipe(Effect.provide(layer)));

const newId = (prefix: string): string => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

const refresh = (theme: BoardTheme, slug?: string) =>
    Effect.sync(() =>
    {
        revalidatePath(researchBoardsHref(theme));

        if (slug !== undefined)
        {
            revalidatePath(researchBoardHref(slug, theme));
        }
    });

const create = appAction({ input: CreateBoardInput }, ({ input, actor }) =>
    withBoards(createBoard(actor, input, newId)).pipe(
        Effect.tap((result) => (result.ok ? refresh(result.board.theme) : Effect.void)),
    ));

const save = appAction({ input: SaveBoardInput }, ({ input, actor }) =>
    withBoards(saveBoard(actor, input)).pipe(
        Effect.tap((result) => (result.ok ? refresh(result.board.theme, result.board.slug) : Effect.void)),
    ));

const RemoveInput = RemoveBoardInput;

const remove = appAction({ input: RemoveInput }, ({ input, actor }) => withBoards(removeBoard(actor, input)));

/**
 * 관문이나 저장에서 끊긴 요청을 화면이 읽을 어휘로 바꾼다. 원문은 기록에만 남긴다.
 * ⚠ 이 바꿈이 문을 열지는 않는다. 끊는 일은 관문과 저장소가 이미 했다.
 */
const refused = (label: string, cause: unknown) =>
{
    const reason = refusalOf(cause);

    if (reason === "failed")
    {
        Effect.runFork(Effect.logError(`보드 ${label} 실패`, { module: "boards", cause: String(cause) }));
    }

    return { ok: false, reason, message: REFUSAL_MESSAGES[reason] } as const;
};

export async function createBoardAction(raw: unknown): Promise<BoardActionResult>
{
    try
    {
        return await create(raw);
    }
    catch (cause)
    {
        return refused("만들기", cause);
    }
}

export async function saveBoardAction(raw: unknown): Promise<BoardActionResult>
{
    try
    {
        return await save(raw);
    }
    catch (cause)
    {
        return refused("저장", cause);
    }
}

export async function removeBoardAction(raw: unknown): Promise<RemoveBoardResult>
{
    try
    {
        const result = await remove(raw);

        if (result.ok)
        {
            // 어느 테마의 보드였는지를 화면에서 받지 않는다. 그 값이 그대로 경로가 되기 때문이다. 목록 둘을 다 무효로 한다
            revalidatePath(researchBoardsHref("stocks"));
            revalidatePath(researchBoardsHref("real-estate"));
        }

        return result;
    }
    catch (cause)
    {
        return refused("지우기", cause);
    }
}
