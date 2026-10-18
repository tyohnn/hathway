import { Effect, Schema } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import { BoardSlug, BoardTheme, Group, type Board } from "@hathway/research/domain/Board";
import { BoardStore } from "@hathway/research/ports/BoardStore";
import { appendNote, type NoteToAppend } from "@hathway/research/rules/append";
import { draftBoard } from "@hathway/research/rules/draft";
import { editVerdict, ownsBoard, removeVerdict } from "@hathway/research/rules/edit";
import { limitVerdict } from "@hathway/research/rules/limits";

/**
 * 리서치 보드 화면과 액션의 조립. 서버 액션의 ③~⑤를 이 파일이 잇는다.
 *
 * ⚠ **`"use server"` 파일에 두지 않는다.** 그 파일의 export 는 전부 공개 엔드포인트가 되므로, 조립을 거기
 *    두고 테스트가 부를 수 있게 내보내는 순간 관문을 지나지 않는 엔드포인트가 하나 더 생긴다. 여기 두면
 *    메모리 저장소(`boardStoreMemory`)로 도커 없이 잰다(`research.test.ts`).
 * ⚠ **판정은 도메인 패키지의 순수 함수가 한다.** 여기서 조건을 다시 적지 않는다.
 * ⚠ **읽는 조립은 행위자를 받지 않는다.** 보드는 로그인하지 않아도 보인다(INV-RESEARCH-01).
 */

/** 액션이 화면에 돌려주는 결과. 오류 객체 대신 어휘로 답해 화면이 그 자리에 글을 세운다 */
export type BoardFailure = "not-found" | "stale" | "limit" | "sign-in" | "invalid" | "failed";

export type BoardActionResult =
    | { readonly ok: true; readonly board: Board }
    | { readonly ok: false; readonly reason: BoardFailure; readonly message: string; readonly current?: number };

export type RemoveBoardResult =
    | { readonly ok: true }
    | { readonly ok: false; readonly reason: BoardFailure; readonly message: string };

export const CreateBoardInput = Schema.Struct({
    theme: BoardTheme,
    title: Schema.optional(Schema.String),
});

export type CreateBoardInput = typeof CreateBoardInput.Type;

/**
 * 저장이 받는 것. 테넌트 · 만든 사람 · 테마를 바꾸는 칸이 없다(INV-RESEARCH-04). 문서의 모양은 여기서 걸러진다
 * (INV-RESEARCH-05).
 */
export const SaveBoardInput = Schema.Struct({
    slug: BoardSlug,
    /** 화면이 이 보드를 열었을 때의 판 */
    version: Schema.Number,
    title: Schema.String,
    tagline: Schema.String,
    groups: Schema.Array(Group),
});

export type SaveBoardInput = typeof SaveBoardInput.Type;

export const RemoveBoardInput = Schema.Struct({
    slug: BoardSlug,
});

export type RemoveBoardInput = typeof RemoveBoardInput.Type;

const MESSAGES = {
    "not-found": "보드를 찾을 수 없어요. 다른 사람이 삭제했을 수 있어요.",
    stale: "그사이 다른 사람이 이 보드를 고쳤어요. 새로고침한 뒤 다시 고쳐 주세요.",
} as const;

/** 그 테마의 보드 전부. 최근에 고친 것이 먼저다 */
export const listBoards = (theme: BoardTheme) =>
    Effect.flatMap(BoardStore, (store) => store.listByTheme(theme));

/** 없으면 `null` 이고 화면은 404 를 그린다 */
export const openBoard = (slug: string) =>
    Effect.flatMap(BoardStore, (store) => store.findBySlug(slug));

/** 새 보드. 테넌트와 만든 사람은 입력이 아니라 행위자에게서 온다 */
export const createBoard = (
    actor: Actor,
    input: CreateBoardInput & { readonly relatedStockCode?: string },
    newId: (prefix: string) => string,
): Effect.Effect<BoardActionResult, unknown, BoardStore> =>
    Effect.gen(function*()
    {
        // ④ 도메인 규칙
        const verdict = draftBoard(actor, input, newId);

        if (verdict._tag === "Rejected")
        {
            return { ok: false, reason: "limit", message: verdict.message } as const;
        }

        // ⑤ 저장
        const board = yield* Effect.flatMap(BoardStore, (store) => store.create(verdict.board));

        return { ok: true, board } as const;
    });

export const saveBoard = (
    actor: Actor,
    input: SaveBoardInput,
): Effect.Effect<BoardActionResult, unknown, BoardStore> =>
    Effect.gen(function*()
    {
        const store = yield* BoardStore;

        // ③ 행 단위 판정. 매 요청 다시 한다
        const verdict = editVerdict(actor, yield* store.findBySlug(input.slug), input.version);

        if (verdict._tag === "NotFound")
        {
            return { ok: false, reason: "not-found", message: MESSAGES["not-found"] } as const;
        }

        if (verdict._tag === "Stale")
        {
            return { ok: false, reason: "stale", message: MESSAGES.stale, current: verdict.current } as const;
        }

        // ④ 도메인 규칙. 쓴 사람이 고칠 수 있는 한도는 무엇을 넘었는지 알려 준다
        const change = { title: input.title, tagline: input.tagline, groups: input.groups };
        const limit = limitVerdict(change);

        if (limit._tag === "Over")
        {
            return { ok: false, reason: "limit", message: limit.message } as const;
        }

        // ⑤ 저장. 문장이 테넌트와 판을 한 번 더 건다
        const outcome = yield* store.save({
            slug: input.slug,
            tenantId: actor.tenantId,
            expectedVersion: input.version,
            change,
        });

        return outcome._tag === "saved"
            ? { ok: true, board: outcome.board } as const
            : { ok: false, reason: "stale", message: MESSAGES.stale } as const;
    });

export const removeBoard = (
    actor: Actor,
    input: RemoveBoardInput,
): Effect.Effect<RemoveBoardResult, unknown, BoardStore> =>
    Effect.gen(function*()
    {
        const store = yield* BoardStore;
        const verdict = removeVerdict(actor, yield* store.findBySlug(input.slug));

        if (verdict._tag === "NotFound")
        {
            return { ok: false, reason: "not-found", message: MESSAGES["not-found"] } as const;
        }

        const outcome = yield* store.remove({ slug: input.slug, tenantId: actor.tenantId });

        return outcome === "removed"
            ? { ok: true } as const
            : { ok: false, reason: "not-found", message: MESSAGES["not-found"] } as const;
    });

/**
 * 이 사람의 테넌트가 가진 보드. 플러그인의 홈과 서랍이 「내 보드」로 쓴다. 최근에 고친 것이 먼저다.
 *
 * ⚠ 보드는 누구에게나 보이지만(INV-RESEARCH-01) 「내 것」으로 모으는 술어는 고치는 판정과 같은 `ownsBoard` 다.
 */
export const boardsOf = (actor: Actor, theme: BoardTheme) =>
    Effect.map(listBoards(theme), (boards) => boards.filter((board) => ownsBoard(actor, board)));

export interface NoteToBoardInput
{
    /** 담을 보드. 없으면 `boardTitle` 로 새 보드를 연다 */
    readonly slug: string | null;
    readonly boardTitle: string;
    /** 새 보드를 열 때 다는 종목코드. 이미 있는 보드에는 손대지 않는다 */
    readonly relatedStockCode?: string;
    readonly note: NoteToAppend;
}

/**
 * 대화에서 정리한 노트 한 장을 보드에 담는다. 새 보드면 먼저 만들고, 담는 일은 저장(`saveBoard`)을 지나 같은 판정을 받는다.
 *
 * ⚠ **남의 테넌트 보드는 없는 보드로 답한다**(`editVerdict` 와 같은 까닭).
 */
export const saveNoteToBoard = (
    actor: Actor,
    input: NoteToBoardInput,
    newId: (prefix: string) => string,
): Effect.Effect<BoardActionResult, unknown, BoardStore> =>
    Effect.gen(function*()
    {
        // 새 보드면 노트를 담은 채로 한 번에 만든다. 두 번 쓰면 둘째가 실패할 때 빈 보드가 남는다
        if (input.slug === null)
        {
            const verdict = draftBoard(actor, {
                theme: "stocks",
                title: input.boardTitle,
                ...(input.relatedStockCode === undefined ? {} : { relatedStockCode: input.relatedStockCode }),
            }, newId);

            if (verdict._tag === "Rejected")
            {
                return { ok: false, reason: "limit", message: verdict.message } as const;
            }

            const drafted = { ...verdict.board, groups: appendNote(verdict.board.groups, input.note, newId) };
            // 있는 보드의 저장과 같은 한도를 지난다. 노트 제목과 본문의 길이가 여기서 걸린다
            const limit = limitVerdict(drafted);

            if (limit._tag === "Over")
            {
                return { ok: false, reason: "limit", message: limit.message } as const;
            }

            const board = yield* Effect.flatMap(BoardStore, (store) => store.create(drafted));

            return { ok: true, board } as const;
        }

        // 있는 보드는 저장(`saveBoard`)을 지나 행 단위 판정 · 판 충돌을 그대로 받는다
        const board = yield* openBoard(input.slug);

        if (board === null)
        {
            return { ok: false, reason: "not-found", message: MESSAGES["not-found"] } as const;
        }

        return yield* saveBoard(actor, {
            slug: board.slug,
            version: board.version,
            title: board.title,
            tagline: board.tagline,
            groups: appendNote(board.groups, input.note, newId),
        });
    });
