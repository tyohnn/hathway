import { Context, type Effect, Schema } from "effect";

import type { Board, BoardChange, BoardTheme, NewBoard } from "../domain/Board.ts";

/**
 * 보드를 읽고 쓰는 포트. 구현은 메모리(`testing/boardStoreMemory.ts`)와 Postgres
 * (`@investment/adapters-postgres/research/BoardStorePostgres`) 둘이고, 계약 테스트 한 벌이 둘을 함께 잰다.
 *
 * ⚠ **읽는 메서드는 행위자를 받지 않는다.** 보드는 로그인하지 않아도 보인다(INV-RESEARCH-01). 읽기에 행위자를
 *    받기 시작하면 그것이 곧 「가려야 할 보드가 있다」는 뜻이므로, 그때는 술어를 `rules/` 에 먼저 세운다.
 * ⚠ **쓰는 메서드는 조건부 쓰기다.** 판정(`editVerdict` · `removeVerdict`)과 쓰기 사이에 다른 요청이 끼어들 수
 *    있으므로, 쓰기가 테넌트와 판을 조건으로 한 번 더 건다. 맞지 않으면 `conflict` · `missing` 으로 답한다.
 */
export class BoardStoreError extends Schema.TaggedError<BoardStoreError>()(
    "BoardStoreError",
    { message: Schema.String },
)
{}

export interface SaveRequest
{
    readonly slug: string;
    /** 이 테넌트의 보드일 때만 쓴다 */
    readonly tenantId: string;
    readonly expectedVersion: number;
    readonly change: BoardChange;
}

export type SaveOutcome =
    | { readonly _tag: "saved"; readonly board: Board }
    | { readonly _tag: "conflict" };

export interface RemoveRequest
{
    readonly slug: string;
    readonly tenantId: string;
}

export type RemoveOutcome = "removed" | "missing";

export class BoardStore extends Context.Service<BoardStore, {
    /** 그 테마의 보드 전부. 최근에 고친 것이 먼저다 */
    readonly listByTheme: (theme: BoardTheme) => Effect.Effect<ReadonlyArray<Board>, BoardStoreError>;
    /** 없으면 `null` 이다 */
    readonly findBySlug: (slug: string) => Effect.Effect<Board | null, BoardStoreError>;
    /** 판정을 지난 새 보드를 적는다. 판은 1 에서 시작한다. 같은 slug 가 있으면 실패한다 */
    readonly create: (board: NewBoard) => Effect.Effect<Board, BoardStoreError>;
    readonly save: (request: SaveRequest) => Effect.Effect<SaveOutcome, BoardStoreError>;
    readonly remove: (request: RemoveRequest) => Effect.Effect<RemoveOutcome, BoardStoreError>;
}>()("@investment/research/ports/BoardStore")
{}
