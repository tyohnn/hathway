import { describe, expect, it } from "vitest";
import { Effect, Exit, Schema } from "effect";

import { customerActor, otherCustomerActor } from "@investment/access/testing/actor";
import type { Board } from "@investment/research/domain/Board";
import { BoardStore } from "@investment/research/ports/BoardStore";
import { boardStoreMemory } from "@investment/research/testing/boardStoreMemory";

import { createBoard, listBoards, openBoard, removeBoard, saveBoard, SaveBoardInput } from "./research";

const seeded: Board = {
    slug: "board-1",
    tenantId: "2",
    createdBy: "2",
    theme: "stocks",
    title: "양극재",
    tagline: "",
    groups: [],
    version: 1,
};

const run = <A, E>(program: Effect.Effect<A, E, BoardStore>, seed: ReadonlyArray<Board> = [seeded]) =>
    Effect.runPromise(Effect.flatMap(boardStoreMemory(seed), (layer) => program.pipe(Effect.provide(layer))));

const titleOf = Effect.flatMap(BoardStore, (store) => store.findBySlug("board-1")).pipe(Effect.map((board) => board?.title));

describe("리서치 보드의 조립", () =>
{
    it("INV-RESEARCH-01 보드는 로그인하지 않아도 보인다. 읽는 조립이 행위자를 받지 않는다", async () =>
    {
        const [listed, opened] = await run(Effect.all([listBoards("stocks"), openBoard("board-1")]));

        expect(listed.map((board) => board.slug)).toEqual(["board-1"]);
        expect(opened?.title).toBe("양극재");
    });

    it("INV-RESEARCH-04 만든 보드는 행위자의 테넌트에 서고 판 1 로 돌아온다", async () =>
    {
        const result = await run(createBoard(customerActor("3"), { theme: "stocks" }, () => "new-id"));

        expect(result).toMatchObject({ ok: true, board: { slug: "new-id", tenantId: "2", createdBy: "3", version: 1 } });
    });

    it("INV-RESEARCH-02 같은 테넌트의 구성원이 저장하면 판이 하나 는다", async () =>
    {
        const result = await run(saveBoard(customerActor("3"), {
            slug: "board-1", version: 1, title: "음극재", tagline: "설명", groups: [],
        }));

        expect(result).toMatchObject({ ok: true, board: { title: "음극재", version: 2 } });
    });

    it("INV-RESEARCH-02 다른 테넌트의 사람이 저장하면 찾을 수 없다고 답하고 쓰지 않는다", async () =>
    {
        const [result, title] = await run(Effect.all([
            saveBoard(otherCustomerActor("4"), { slug: "board-1", version: 1, title: "남의 보드", tagline: "", groups: [] }),
            titleOf,
        ], { concurrency: 1 }));

        expect(result).toMatchObject({ ok: false, reason: "not-found" });
        expect(title).toBe("양극재");
    });

    it("INV-RESEARCH-03 연 뒤에 판이 바뀌었으면 덮어쓰지 않고 지금의 판을 알려 준다", async () =>
    {
        const result = await run(
            saveBoard(customerActor("3"), { slug: "board-1", version: 1, title: "늦은 저장", tagline: "", groups: [] }),
            [{ ...seeded, version: 4 }],
        );

        expect(result).toMatchObject({ ok: false, reason: "stale", current: 4 });
    });

    it("공백만 적은 제목으로는 저장하지 않는다", async () =>
    {
        const [result, title] = await run(Effect.all([
            saveBoard(customerActor("3"), { slug: "board-1", version: 1, title: "   ", tagline: "", groups: [] }),
            titleOf,
        ], { concurrency: 1 }));

        expect(result).toMatchObject({ ok: false, reason: "title" });
        expect(title).toBe("양극재");
    });

    it("INV-RESEARCH-02 구성원이 지우면 보드가 사라진다", async () =>
    {
        const [result, opened] = await run(Effect.all([
            removeBoard(customerActor("3", { role: "member" }), { slug: "board-1" }),
            openBoard("board-1"),
        ], { concurrency: 1 }));

        expect(result).toEqual({ ok: true });
        expect(opened).toBeNull();
    });

    it("INV-RESEARCH-02 다른 테넌트의 사람이 지우면 보드가 남아 있다", async () =>
    {
        const [result, opened] = await run(Effect.all([
            removeBoard(otherCustomerActor("4"), { slug: "board-1" }),
            openBoard("board-1"),
        ], { concurrency: 1 }));

        expect(result).toMatchObject({ ok: false, reason: "not-found" });
        expect(opened?.slug).toBe("board-1");
    });

    it("INV-RESEARCH-05 모양이 맞지 않는 문서는 입력에서 떨어진다. 조립에 닿지 않는다", () =>
    {
        const decoded = Schema.decodeUnknownExit(SaveBoardInput)({
            slug: "board-1", version: 1, title: "제목", tagline: "", groups: [{ id: "g", title: "그룹", widgets: "없음" }],
        });

        expect(Exit.isFailure(decoded)).toBe(true);
    });

    it("INV-RESEARCH-04 저장의 입력에는 테넌트와 slug 를 바꾸는 칸이 없다", () =>
    {
        const decoded = Schema.decodeUnknownExit(SaveBoardInput)({
            slug: "board-1", version: 1, title: "제목", tagline: "", groups: [], tenantId: "9", theme: "real-estate",
        });

        expect(Exit.isSuccess(decoded) ? Object.keys(decoded.value).sort() : []).toEqual(["groups", "slug", "tagline", "title", "version"]);
    });
});
