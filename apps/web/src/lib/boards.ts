import "server-only";

import { Effect, Exit } from "effect";
import { connection } from "next/server";

import type { Actor } from "@hathway/access/domain/Actor";
import type { Board, BoardTheme } from "@hathway/research/domain/Board";
import type { BoardStore } from "@hathway/research/ports/BoardStore";
import { ownsBoard } from "@hathway/research/rules/edit";

import { parseBoardDocument } from "@/lib/research/document";
import type { ResearchBoard } from "@/lib/research/types";
import { listBoards, openBoard } from "@/usecases/research";

import { boardStoreLayer } from "./boardsRuntime";
import { runtime } from "./runtime";

/**
 * 보드 화면이 읽는 길. 읽기는 공개라 행위자 없이 읽는다(INV-RESEARCH-01).
 *
 * ⚠ **읽지 못하면 목록은 비고 보드는 없는 것으로 답한다.** 접속 문자열이 없는 배포나 DB 가 내려간 때에도 셸과
 *    다른 화면은 서야 한다. 실패는 로그로 남긴다.
 * ⚠ 요청마다 읽는다. `connection()` 을 먼저 기다려서 빌드가 보드를 미리 굽지 않게 한다.
 */
const read = async <A>(program: Effect.Effect<A, unknown, BoardStore>, fallback: A, what: string): Promise<A> =>
{
    await connection();
    const exit = await runtime.runPromiseExit(
        Effect.flatMap(boardStoreLayer, (layer) => program.pipe(Effect.provide(layer))),
    );

    if (Exit.isSuccess(exit))
    {
        return exit.value;
    }

    Effect.runFork(Effect.logWarning(`보드 ${what} 실패`, { module: "boards", cause: String(exit.cause) }));

    return fallback;
};

export const readBoards = (theme: BoardTheme): Promise<ReadonlyArray<Board>> =>
    read(listBoards(theme), [], "목록");

export const readBoard = (slug: string): Promise<Board | null> =>
    read(openBoard(slug), null, "찾기");

/**
 * 화면의 편집기가 다루는 모양으로 옮긴다. 편집기는 그룹과 칸을 제자리에서 고치는 보통의 객체를 쓴다.
 * 판 · 테넌트 · 만든 사람은 여기 싣지 않는다. 판은 편집기가 따로 받고 나머지는 화면이 알 일이 아니다.
 */
export const toResearchBoard = (board: Board): ResearchBoard => ({
    slug: board.slug,
    title: board.title,
    tagline: board.tagline,
    theme: board.theme,
    ...(board.relatedStockCode === undefined ? {} : { relatedStockCode: board.relatedStockCode }),
    ...(board.relatedIndustrySlug === undefined ? {} : { relatedIndustrySlug: board.relatedIndustrySlug }),
    groups: parseBoardDocument({ groups: board.groups }),
});

/** 이 보드를 화면에서 고칠 수 있게 열 것인가. 표시를 위한 값이고 쓰기는 관문이 다시 판정한다 */
export type BoardAccess = "editable" | "sign-in" | "read-only";

export const boardAccess = (actor: Actor | null, board: Board): BoardAccess =>
{
    if (actor === null)
    {
        return "sign-in";
    }

    return ownsBoard(actor, board) ? "editable" : "read-only";
};
