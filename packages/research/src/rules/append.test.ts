import { describe, expect, it } from "vitest";

import type { Group } from "../domain/Board.ts";
import { appendNote } from "./append.ts";

const group = (id: string, title: string, widgets: Group["widgets"] = []): Group => ({
    id, title, summary: "", layout: { i: id, x: 0, y: 0, w: 6, h: 10 }, widgets,
});

const NOTE = { groupTitle: "크래프톤", title: "적정가", body: "적정가 3,000원" };

describe("보드에 노트 담기", () =>
{
    it("같은 제목의 그룹이 있으면 그 그룹의 맨 아래에 노트를 더한다", () =>
    {
        const existing = group("g1", "크래프톤", [{ id: "w1", kind: "note", title: "요약", body: "", layout: { i: "w1", x: 0, y: 0, w: 6, h: 4 } }]);
        const groups = appendNote([existing], NOTE, (prefix) => `${prefix}-new`);

        expect(groups).toHaveLength(1);
        expect(groups[0]?.widgets.map((widget) => [widget.id, widget.title, widget.layout.y])).toEqual([["w1", "요약", 0], ["note-new", "적정가", 4]]);
    });

    it("그 제목의 그룹이 없으면 그룹을 새로 세우고, 비어 있는 첫 그룹은 그 자리를 넘겨받는다", () =>
    {
        expect(appendNote([group("g1", "새 그룹")], NOTE, (prefix) => `${prefix}-new`).map((each) => [each.id, each.title, each.widgets.length]))
            .toEqual([["g1", "크래프톤", 1]]);
        expect(appendNote([group("g1", "에코프로비엠", [{ id: "w1", kind: "note", title: "", layout: { i: "w1", x: 0, y: 0, w: 6, h: 4 } }])], NOTE, (prefix) => `${prefix}-new`)
            .map((each) => each.title)).toEqual(["에코프로비엠", "크래프톤"]);
    });

    it("그룹의 높이가 더한 노트를 덮도록 늘어난다", () =>
    {
        const groups = appendNote([group("g1", "크래프톤")], NOTE, (prefix) => `${prefix}-new`);
        const added = groups[0]?.widgets[0];

        expect((groups[0]?.layout.h ?? 0) >= (added?.layout.y ?? 0) + (added?.layout.h ?? 0)).toBe(true);
    });
});
