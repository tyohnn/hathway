import { Effect, Layer, Ref } from "effect";

import type { Board } from "../domain/Board.ts";
import { BoardStore, BoardStoreError, type RemoveOutcome, type SaveOutcome } from "../ports/BoardStore.ts";

/**
 * 보드 저장소의 메모리 구현. 계약이 도커 없이 도는 자리이고, 앱의 유스케이스 검사가 이것을 쓴다.
 *
 * ⚠ 최근에 고친 것이 먼저라는 차례를 배열의 자리로 흉내 낸다. 고친 보드는 맨 앞으로 간다.
 */
export const boardStoreMemory = (seed: ReadonlyArray<Board> = []): Effect.Effect<Layer.Layer<BoardStore>> =>
    Effect.gen(function*()
    {
        const boards = yield* Ref.make<ReadonlyArray<Board>>(seed);

        return Layer.succeed(BoardStore, BoardStore.of({
            listByTheme: (theme) =>
                Ref.get(boards).pipe(Effect.map((rows) => rows.filter((board) => board.theme === theme))),

            findBySlug: (slug) =>
                Ref.get(boards).pipe(Effect.map((rows) => rows.find((board) => board.slug === slug) ?? null)),

            create: (draft) =>
                Effect.gen(function*()
                {
                    const rows = yield* Ref.get(boards);

                    if (rows.some((board) => board.slug === draft.slug))
                    {
                        return yield* new BoardStoreError({ message: `보드 쓰기 실패: slug ${draft.slug} 가 이미 있다` });
                    }

                    const board: Board = { ...draft, version: 1 };

                    yield* Ref.set(boards, [board, ...rows]);

                    return board;
                }),

            save: ({ slug, tenantId, expectedVersion, change }) =>
                Ref.modify(boards, (rows): [SaveOutcome, ReadonlyArray<Board>] =>
                {
                    const target = rows.find((board) => board.slug === slug);

                    if (target === undefined || target.tenantId !== tenantId || target.version !== expectedVersion)
                    {
                        return [{ _tag: "conflict" }, rows];
                    }

                    const saved: Board = { ...target, ...change, version: target.version + 1 };

                    return [{ _tag: "saved", board: saved }, [saved, ...rows.filter((board) => board !== target)]];
                }),

            remove: ({ slug, tenantId }) =>
                Ref.modify(boards, (rows): [RemoveOutcome, ReadonlyArray<Board>] =>
                {
                    const target = rows.find((board) => board.slug === slug);

                    return target === undefined || target.tenantId !== tenantId
                        ? ["missing", rows]
                        : ["removed", rows.filter((board) => board !== target)];
                }),
        }));
    });
