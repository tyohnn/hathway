import { describe, expect, it } from "vitest";

import { stageLayout } from "./layout";

describe("stageLayout", () =>
{
    it("트랙이 없으면 한 줄이고 칸마다 열 하나다", () =>
    {
        const layout = stageLayout([{}, {}, {}]);

        expect(layout.columns).toBe(3);
        expect(layout.tracks).toHaveLength(1);
        expect(layout.tracks[0].name).toBeUndefined();
        expect(layout.tracks[0].cells).toEqual([
            { index: 0, column: 1, span: 1 },
            { index: 1, column: 2, span: 1 },
            { index: 2, column: 3, span: 1 },
        ]);
    });

    it("곁가지는 아래 줄로 내려가고 본 줄이 그 열을 먹는다", () =>
    {
        const layout = stageLayout([{}, { track: "외환" }, {}]);

        expect(layout.columns).toBe(3);
        expect(layout.tracks).toHaveLength(2);
        expect(layout.tracks[0].cells).toEqual([
            { index: 0, column: 1, span: 2 },
            { index: 2, column: 3, span: 1 },
        ]);
        expect(layout.tracks[1]).toEqual({
            name: "외환",
            cells: [{ index: 1, column: 2, span: 1 }],
        });
    });

    it("마지막 본 줄 칸은 끝까지 먹는다", () =>
    {
        const layout = stageLayout([{}, { track: "외환" }, { track: "외환" }]);

        expect(layout.tracks[0].cells).toEqual([{ index: 0, column: 1, span: 3 }]);
        expect(layout.tracks[1].cells).toEqual([
            { index: 1, column: 2, span: 1 },
            { index: 2, column: 3, span: 1 },
        ]);
    });

    it("곁가지가 먼저 오면 본 줄의 첫 칸은 자기 열에서 시작한다", () =>
    {
        const layout = stageLayout([{ track: "외환" }, {}]);

        expect(layout.tracks[0].cells).toEqual([{ index: 1, column: 2, span: 1 }]);
        expect(layout.tracks[1].cells).toEqual([{ index: 0, column: 1, span: 1 }]);
    });

    it("곁가지 줄의 순서는 처음 나온 순서다", () =>
    {
        const layout = stageLayout([{}, { track: "외환" }, { track: "인허가" }, { track: "외환" }]);

        expect(layout.tracks.map((track) => track.name)).toEqual([undefined, "외환", "인허가"]);
    });

    it("본 줄이 하나도 없으면 곁가지만 남는다", () =>
    {
        const layout = stageLayout([{ track: "외환" }]);

        expect(layout.tracks).toHaveLength(1);
        expect(layout.tracks[0].name).toBe("외환");
    });

    it("단계가 없으면 열도 줄도 없다", () =>
    {
        expect(stageLayout([])).toEqual({ columns: 0, tracks: [] });
    });
});
