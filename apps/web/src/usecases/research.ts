import { Effect, Schema } from "effect";

import type { Actor } from "@investment/access/domain/Actor";
import { BoardTheme, Group, type Board } from "@investment/research/domain/Board";
import { BoardStore } from "@investment/research/ports/BoardStore";
import { draftBoard, titleVerdict } from "@investment/research/rules/draft";
import { editVerdict, removeVerdict } from "@investment/research/rules/edit";

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
export type BoardFailure = "not-found" | "stale" | "title" | "sign-in";

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
    slug: Schema.NonEmptyString,
    /** 화면이 이 보드를 열었을 때의 판 */
    version: Schema.Number,
    title: Schema.String,
    tagline: Schema.String,
    groups: Schema.Array(Group),
});

export type SaveBoardInput = typeof SaveBoardInput.Type;

export const RemoveBoardInput = Schema.Struct({
    slug: Schema.NonEmptyString,
});

export type RemoveBoardInput = typeof RemoveBoardInput.Type;

const MESSAGES = {
    "not-found": "보드를 찾을 수 없어요.",
    stale: "그사이 다른 사람이 이 보드를 고쳤어요. 새로고침한 뒤 다시 고쳐 주세요.",
    title: "제목을 적어 주세요.",
    titleTooLong: (limit: number) => `제목은 ${limit}자까지 적을 수 있어요.`,
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
    input: CreateBoardInput,
    newId: (prefix: string) => string,
): Effect.Effect<BoardActionResult, unknown, BoardStore> =>
    Effect.gen(function*()
    {
        // ④ 도메인 규칙
        const verdict = draftBoard(actor, input, newId);

        if (verdict._tag === "BlankTitle")
        {
            return { ok: false, reason: "title", message: MESSAGES.title } as const;
        }

        if (verdict._tag === "TitleTooLong")
        {
            return { ok: false, reason: "title", message: MESSAGES.titleTooLong(verdict.limit) } as const;
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

        // ④ 도메인 규칙
        const title = titleVerdict(input.title);

        if (title._tag !== "Ok")
        {
            return {
                ok: false,
                reason: "title",
                message: title._tag === "Blank" ? MESSAGES.title : MESSAGES.titleTooLong(title.limit),
            } as const;
        }

        // ⑤ 저장. 문장이 테넌트와 판을 한 번 더 건다
        const outcome = yield* store.save({
            slug: input.slug,
            tenantId: actor.tenantId,
            expectedVersion: input.version,
            change: { title: title.title, tagline: input.tagline, groups: input.groups },
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
