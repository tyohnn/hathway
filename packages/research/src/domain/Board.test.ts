import { describe, expect, it } from "vitest";
import { Exit, Schema } from "effect";

import { BoardDocument } from "./Board.ts";

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
});
