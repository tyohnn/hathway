import { assert, describe, it } from "@effect/vitest";

import { dropAt, isInside, NEST_INDENT, rowAt, stepSelection, type BlockRow } from "./rows";

/** 줄 하나. 화면 좌표와 문서 자리만 쓰므로 노드는 크기만 갖는다 */
const row = (pos: number, size: number, top: number, bottom: number, over: Partial<BlockRow> = {}): BlockRow => ({
    pos,
    end: pos + size,
    level: "doc",
    indent: 0,
    node: { nodeSize: size, type: { name: "paragraph" } } as BlockRow["node"],
    element: {} as HTMLElement,
    top,
    bottom,
    fullBottom: bottom,
    contentLeft: 100,
    gripLeft: 100,
    firstChildPos: null,
    ...over,
});

// 하나(0~10) · 둘(10~40, 안쪽 항목 하나) · 둘의 안쪽(15~25) · 셋(40~50)
const one = row(1, 9, 100, 130);
const two = row(10, 30, 140, 170, { fullBottom: 210, firstChildPos: 15 });
const inner = row(15, 10, 180, 210, { contentLeft: 125 });
const three = row(40, 10, 220, 250);
const rows = [one, two, inner, three];

describe("마우스 높이로 고르는 줄", () =>
{
    it("줄 안의 높이면 그 줄이다. 안쪽 항목 위에서는 바깥 항목이 아니라 안쪽 항목이다", () =>
    {
        assert.strictEqual(rowAt(rows, 110)?.pos, 1);
        assert.strictEqual(rowAt(rows, 190)?.pos, 15);
    });

    it("줄 사이 여백에서는 가까운 줄이다. 손잡이가 사라지지 않는다", () =>
    {
        assert.strictEqual(rowAt(rows, 133)?.pos, 1);
        assert.strictEqual(rowAt(rows, 138)?.pos, 10);
    });

    it("안쪽 항목은 바깥 항목의 안이고 그 반대는 아니다", () =>
    {
        assert.isTrue(isInside(inner, two));
        assert.isFalse(isInside(two, inner));
        assert.isFalse(isInside(three, two));
    });
});

const item = (pos: number, size: number, top: number, bottom: number, over: Partial<BlockRow> = {}): BlockRow =>
    row(pos, size, top, bottom, { node: { nodeSize: size, type: { name: "listItem" } } as BlockRow["node"], level: "item", ...over });

// 문단(0~5) · 글머리 하나(5~15) · 둘(15~45, 안쪽 항목 둘) · 안쪽 가(20~30) · 안쪽 나(30~40) · 셋(45~55) · 끝 문단(57~62)
const para = row(0, 5, 60, 90);
const bOne = item(5, 10, 100, 130, { contentLeft: 125 });
const bTwo = item(15, 30, 140, 170, { contentLeft: 125, fullBottom: 250, firstChildPos: 20 });
const inA = item(20, 10, 180, 210, { contentLeft: 150 });
const inB = item(30, 10, 220, 250, { contentLeft: 150 });
const bThree = item(45, 10, 260, 290, { contentLeft: 125 });
const last = row(57, 5, 300, 330);
const doc = [para, bOne, bTwo, inA, inB, bThree, last];

describe("놓을 자리", () =>
{
    it("줄의 위쪽 절반이면 그 줄 앞이다", () =>
    {
        assert.strictEqual(dropAt(doc, [last], 130, 105)?.insertAt, 5);
    });

    it("가로 위치로 깊이를 고른다. 항목의 글 시작보다 한 단계 오른쪽이면 그 항목 안쪽으로 들어간다", () =>
    {
        const same = dropAt(doc, [last], 130, 125);
        const nested = dropAt(doc, [last], 125 + NEST_INDENT + 4, 125);

        assert.deepStrictEqual([same?.mode, same?.insertAt], ["plain", 15]);
        assert.deepStrictEqual([nested?.mode, nested?.insertAt], ["nest", 14]);
    });

    it("마지막 안쪽 항목 뒤는 안쪽 깊이와 바깥 깊이 둘 다 고를 수 있다", () =>
    {
        const inner = dropAt(doc, [last], 151, 245);
        const outer = dropAt(doc, [last], 126, 245);

        assert.strictEqual(inner?.insertAt, 40);
        assert.strictEqual(outer?.insertAt, 45);
    });

    it("가로 위치가 어느 깊이에도 닿지 않으면 가장 바깥 깊이다", () =>
    {
        assert.strictEqual(dropAt(doc, [last], 0, 245)?.lineLeft, 125);
    });

    it("안쪽 줄이 있는 줄 바로 아래 틈은 그 첫 안쪽 줄 앞이다", () =>
    {
        const target = dropAt(doc, [last], 300, 165);

        assert.deepStrictEqual([target?.insertAt, target?.lineLeft], [20, 150]);
    });

    it("끄는 블록 자신과 그 안쪽 줄에는 놓지 않는다", () =>
    {
        const target = dropAt(doc, [bTwo], 150, 200);

        assert.isTrue(target === null || ![20, 30].includes(target.insertAt));
    });

    it("마우스가 첫 줄 위에 있으면 첫 줄 앞이다", () =>
    {
        assert.strictEqual(dropAt(doc, [last], 130, 50)?.insertAt, 0);
    });

    it("맨 바깥 문단 뒤에서 한 단계 오른쪽이면 그 문단의 안쪽 블록(들여쓰기 1)이 된다", () =>
    {
        const nested = dropAt(doc, [last], 100 + NEST_INDENT + 2, 85);
        const same = dropAt(doc, [last], 100, 85);

        assert.deepStrictEqual([nested?.mode, nested?.insertAt, nested?.indent], ["doc", 5, 1]);
        assert.deepStrictEqual([same?.mode, same?.insertAt, same?.indent], ["doc", 5, 0]);
    });

    it("안쪽 블록이 있는 맨 바깥 문단은 그 안쪽 블록까지가 한 범위다. 범위 뒤에 놓으면 안쪽 블록을 건너뛴다", () =>
    {
        const head = row(0, 5, 60, 90, { end: 12 });
        const child = row(5, 7, 100, 130, { indent: 1, contentLeft: 124 });
        const tail = row(12, 5, 140, 170);
        const target = dropAt([head, child, tail], [tail], 100, 125);

        assert.isTrue(isInside(child, head));
        assert.deepStrictEqual([target?.mode, target?.insertAt, target?.indent], ["doc", 12, 0]);
    });
});

describe("키보드로 옮기는 블록 선택", () =>
{
    const start = { anchor: 1, focus: 1 };

    it("아래 화살표는 다음 줄 하나를 고른다. 부모 다음은 그 안쪽 첫 줄이다", () =>
    {
        assert.deepStrictEqual(stepSelection(rows, start, "down", false), { anchor: 10, focus: 10, selected: [10] });
        assert.deepStrictEqual(stepSelection(rows, { anchor: 10, focus: 10 }, "down", false), { anchor: 15, focus: 15, selected: [15] });
    });

    it("위 화살표는 앞 줄 하나를 고른다. 맨 앞 · 맨 뒤에서는 그 자리에 머문다", () =>
    {
        assert.deepStrictEqual(stepSelection(rows, { anchor: 40, focus: 40 }, "up", false).selected, [15]);
        assert.deepStrictEqual(stepSelection(rows, start, "up", false).selected, [1]);
        assert.deepStrictEqual(stepSelection(rows, { anchor: 40, focus: 40 }, "down", false).selected, [40]);
    });

    it("Shift 를 누르면 처음 고른 줄에서 지금 줄까지 여럿을 고른다. 부모가 들면 그 안쪽 줄은 부모에 묻힌다", () =>
    {
        const first = stepSelection(rows, start, "down", true);

        assert.deepStrictEqual(first, { anchor: 1, focus: 10, selected: [1, 10] });
        assert.deepStrictEqual(stepSelection(rows, first, "down", true).selected, [1, 10]);
        assert.deepStrictEqual(stepSelection(rows, { anchor: 15, focus: 15 }, "up", true).selected, [10]);
    });

    it("여럿을 고른 채 Shift 없이 누르면 지금 줄에서 한 칸 옮긴 줄 하나만 남는다", () =>
    {
        assert.deepStrictEqual(stepSelection(rows, { anchor: 1, focus: 10 }, "down", false).selected, [15]);
    });
});
