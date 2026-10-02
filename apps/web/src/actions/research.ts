"use server";

import { revalidatePath } from "next/cache";
import { Effect } from "effect";

import type { BoardTheme } from "@investment/research/domain/Board";

import { appAction } from "@/lib/action";
import { boardStoreLayer } from "@/lib/boardsRuntime";
import { isGateRefusal } from "@/lib/gateRefusal";
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
 * ⚠ **로그인하지 않은 요청은 핸들러에 닿지 않는다.** 화면이 그 거절을 글로 보일 수 있게, 관문이 끊은 요청을
 *    여기서 어휘(`sign-in`)로 바꿔 돌려준다. 거절 자체는 관문이 이미 했고 이 바꿈이 문을 열지는 않는다.
 */
const SIGN_IN = { ok: false, reason: "sign-in", message: "로그인한 뒤에 할 수 있어요." } as const;

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

export async function createBoardAction(raw: unknown): Promise<BoardActionResult>
{
    try
    {
        return await create(raw);
    }
    catch (cause)
    {
        if (isGateRefusal(cause)) return SIGN_IN;
        throw cause;
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
        if (isGateRefusal(cause)) return SIGN_IN;
        throw cause;
    }
}

export async function removeBoardAction(raw: unknown, theme: BoardTheme): Promise<RemoveBoardResult>
{
    try
    {
        const result = await remove(raw);

        if (result.ok)
        {
            revalidatePath(researchBoardsHref(theme));
        }

        return result;
    }
    catch (cause)
    {
        if (isGateRefusal(cause)) return SIGN_IN;
        throw cause;
    }
}
