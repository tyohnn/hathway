import { describe, expect, it } from "vitest";
import { Exit, Schema } from "effect";

import { BoardDocument, BoardSlug } from "./Board.ts";

const decode = Schema.decodeUnknownExit(BoardDocument);

const widget = (over: Record<string, unknown> = {}) => ({
    id: "w1",
    kind: "note",
    title: "메모",
    layout: { i: "w1", x: 0, y: 0, w: 4, h: 3 },
    ...over,
});

const group = (over: Record<string, unknown> = {}) => ({
    id: "g1",
    title: "그룹",
    summary: "",
    layout: { i: "g1", x: 0, y: 0, w: 6, h: 10 },
    widgets: [widget()],
    ...over,
});

describe("보드 문서의 모양", () =>
{
    it("그룹과 칸이 정해진 모양이면 받는다", () =>
    {
        expect(Exit.isSuccess(decode({ groups: [group()] }))).toBe(true);
    });

    it("값이 없는 칸이 undefined 로 실려 와도 받는다. 화면의 격자가 그렇게 보낸다", () =>
    {
        const layout = { i: "g1", x: 0, y: 0, w: 6, h: 10, minW: 4, minH: undefined, maxH: undefined };

        expect(Exit.isSuccess(decode({ groups: [group({ layout, widgets: [widget({ body: undefined })] })] }))).toBe(true);
    });

    it("INV-RESEARCH-05 모양이 맞지 않는 문서는 저장하지 않는다. 칸의 갈래가 정해진 것이어야 한다", () =>
    {
        expect(Exit.isFailure(decode({ groups: [group({ widgets: [widget({ kind: "script" })] })] }))).toBe(true);
    });

    it("INV-RESEARCH-05 그룹이 배열이 아니면 받지 않는다", () =>
    {
        expect(Exit.isFailure(decode({ groups: "없음" }))).toBe(true);
        expect(Exit.isFailure(decode({}))).toBe(true);
    });

    it("INV-RESEARCH-05 자리의 좌표가 수가 아니면 받지 않는다", () =>
    {
        expect(Exit.isFailure(decode({ groups: [group({ layout: { i: "g1", x: "0", y: 0, w: 6, h: 10 } })] }))).toBe(true);
    });

    it("INV-RESEARCH-05 배치 값은 0 이상 10000 이하의 정수다. 1e308 같은 값은 캔버스를 깨뜨린다", () =>
    {
        const withLayout = (patch: Record<string, number>) =>
            Exit.isSuccess(decode({ groups: [group({ layout: { i: "g1", x: 0, y: 0, w: 6, h: 10, ...patch } })] }));

        expect(withLayout({ y: 0 })).toBe(true);
        expect(withLayout({ y: 10000 })).toBe(true);
        expect(withLayout({ y: 10001 })).toBe(false);
        expect(withLayout({ y: -1 })).toBe(false);
        expect(withLayout({ w: 1.5 })).toBe(false);
        expect(withLayout({ h: 1e308 })).toBe(false);
        expect(withLayout({ maxH: 1e308 })).toBe(false);
    });

    it("INV-RESEARCH-05 타입에 없는 키는 저장하지 않는다. 문서 칸은 jsonb 라 무엇이든 들어간다", () =>
    {
        const decoded = decode({ groups: [group({ extra: "x", widgets: [widget({ script: "<script>" })] })], owner: "me" });

        expect(Exit.isSuccess(decoded)).toBe(true);
        expect(JSON.stringify(Exit.isSuccess(decoded) ? decoded.value : null)).not.toMatch(/extra|script|owner/);
    });

    it("INV-RESEARCH-05 id 는 1자에서 64자까지다", () =>
    {
        expect(Exit.isFailure(decode({ groups: [group({ id: "" })] }))).toBe(true);
        expect(Exit.isFailure(decode({ groups: [group({ id: "가".repeat(65) })] }))).toBe(true);
    });
});

describe("보드의 slug", () =>
{
    const slug = Schema.decodeUnknownExit(BoardSlug);

    it("소문자와 숫자와 하이픈 64자까지다. 경로와 지우는 조건에 그대로 들어간다", () =>
    {
        expect(Exit.isSuccess(slug("board-1"))).toBe(true);
        expect(Exit.isSuccess(slug("a".repeat(64)))).toBe(true);
        expect(Exit.isFailure(slug("a/b"))).toBe(true);
        expect(Exit.isFailure(slug("Board"))).toBe(true);
        expect(Exit.isFailure(slug("-board"))).toBe(true);
    });

    it("65자면 받지 않는다", () =>
    {
        expect(Exit.isFailure(slug("a".repeat(65)))).toBe(true);
    });
});
