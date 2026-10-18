import type { Node as PmNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

import { blockRange, indentOf } from "./indent";

/**
 * 노션처럼 블록을 줄 단위로 다루기 위한 줄 목록. 손잡이 · 끌어 놓기 · 범위 선택이 모두 이 목록 하나로 판정한다.
 *
 * 줄(row)은 손잡이가 잡는 블록 하나다. 편집기 바로 아래 블록, 목록 항목(글머리 · 번호 · 할 일), 토글 안쪽의 블록이 줄이다.
 * 목록 항목과 콜아웃은 첫 문단이 제 글이고 그 뒤의 블록은 저마다 안쪽 줄이다. 인용 · 코드는 안쪽까지 한 줄이다.
 *
 * ⚠ **부모 줄을 잡으면 안쪽 줄이 함께 오고, 안쪽 줄은 따로 잡힌다**(2026-10-09 사용자). 처음에는 콜아웃 안의 둘째 문단을 잡으면
 *    콜아웃 전체가 잡혔다.
 *
 * ⚠ **줄의 높이는 자기 몫만이다.** 안쪽 항목이 있는 목록 항목의 줄은 그 항목의 첫 줄부터 안쪽 첫 항목의 위까지다. 그래서 안쪽
 *    항목 위에 마우스가 있으면 바깥 항목이 아니라 안쪽 항목이 잡힌다. 처음에는 DOM 의 부모를 따라 올라가서, 항목 사이 여백 위에서는
 *    목록 전체가 잡혔다(2026-10-09 사용자).
 * ⚠ **마우스의 높이(y)로만 고른다.** 줄 사이 여백이나 글머리 기호 위, 블록 왼쪽 여백에 있어도 그 높이의 줄이 잡힌다.
 * ⚠ **맨 바깥 블록의 안쪽 블록은 뒤에 이어지는 더 깊은 블록이다**(`indent.ts`). 그래서 맨 바깥 줄의 범위(`end`)는 제 노드를
 *    넘어 안쪽 블록까지다. 옮기기 · 지우기 · 복사가 이 범위를 통째로 다룬다.
 */
export interface BlockRow
{
    /** 블록 바로 앞의 문서 자리 */
    readonly pos: number;
    /** 이 줄과 그 안쪽 줄 전체의 끝 자리. 맨 바깥 블록은 들여 쓴 안쪽 블록까지다 */
    readonly end: number;
    /** 어디에 선 줄인가. 맨 바깥(`doc`) · 목록 항목(`item`) · 토글 안쪽(`toggle`) */
    readonly level: "doc" | "item" | "toggle";
    /** 맨 바깥 블록의 들여쓰기 깊이. 그 밖의 줄은 0 이다 */
    readonly indent: number;
    readonly node: PmNode;
    readonly element: HTMLElement;
    /** 자기 몫의 위아래(화면 좌표). 안쪽 줄은 빼고 잰다 */
    readonly top: number;
    readonly bottom: number;
    /** 블록 전체(안쪽 줄까지)의 아래 */
    readonly fullBottom: number;
    /** 글이 시작하는 왼쪽 */
    readonly contentLeft: number;
    /** 손잡이가 붙는 왼쪽. 목록 항목은 글머리 기호 앞(목록의 왼쪽 끝)이다 */
    readonly gripLeft: number;
    /** 안쪽 첫 줄의 자리. 없으면 `null` 이다 */
    readonly firstChildPos: number | null;
}

const LIST_ITEMS = new Set(["listItem", "taskItem"]);
const LISTS = new Set(["bulletList", "orderedList", "taskList"]);
const CONTAINERS = new Set(["doc", "detailsContent"]);
/** 첫 자식이 제 글이고 둘째 자식부터 안쪽 줄인 블록 */
const HEADED = new Set([...LIST_ITEMS, "callout"]);
/** 줄을 찾으러 안쪽까지 내려가는 블록 */
const DESCEND = new Set([...LISTS, ...LIST_ITEMS, "details", "detailsContent", "callout"]);

export const collectRows = (view: EditorView): ReadonlyArray<BlockRow> =>
{
    const doc = view.state.doc;
    const found: Array<{ pos: number; end: number; lastPos: number; level: BlockRow["level"]; node: PmNode; element: HTMLElement; rect: DOMRect }> = [];

    doc.descendants((node, pos, parent, index) =>
    {
        // 목록 자체는 줄이 아니다. 노션처럼 항목 하나하나가 줄이고, 목록은 항목을 묶는 그릇일 뿐이다
        const isRow = !LISTS.has(node.type.name)
            && (LIST_ITEMS.has(node.type.name)
                || (parent !== null && CONTAINERS.has(parent.type.name))
                || (parent !== null && HEADED.has(parent.type.name) && index > 0));

        if (isRow)
        {
            const element = view.nodeDOM(pos);

            if (element instanceof HTMLElement)
            {
                const rect = element.getBoundingClientRect();

                // 접힌 토글 안쪽처럼 화면에 없는 블록은 줄이 아니다
                if (rect.height > 0)
                {
                    const level = parent === doc ? "doc" : LIST_ITEMS.has(node.type.name) ? "item" : "toggle";
                    const range = level === "doc" ? blockRange(doc, index) : null;
                    const lastPos = range === null ? pos : range.to - doc.child(range.last).nodeSize;

                    found.push({ pos, end: range?.to ?? pos + node.nodeSize, lastPos, level, node, element, rect });
                }
            }
        }

        return DESCEND.has(node.type.name);
    });

    return found.map((row, index) =>
    {
        const child = found.slice(index + 1).find((other) => other.pos > row.pos && other.pos < row.end) ?? null;
        const list = LIST_ITEMS.has(row.node.type.name) ? row.element.parentElement : null;
        const lastDom = row.lastPos === row.pos ? null : view.nodeDOM(row.lastPos);
        const fullBottom = lastDom instanceof HTMLElement ? lastDom.getBoundingClientRect().bottom : row.rect.bottom;

        return {
            pos: row.pos,
            end: row.end,
            level: row.level,
            indent: row.level === "doc" ? indentOf(row.node) : 0,
            node: row.node,
            element: row.element,
            top: row.rect.top,
            bottom: child === null ? row.rect.bottom : Math.max(row.rect.top + 1, child.rect.top),
            fullBottom: Math.max(fullBottom, row.rect.bottom),
            contentLeft: row.rect.left,
            gripLeft: list === null ? row.rect.left : list.getBoundingClientRect().left,
            firstChildPos: child === null ? null : child.pos,
        };
    });
};

/** 이 높이(y)의 줄. 줄 사이 여백이면 가까운 줄이고, 같으면 위의 줄이다 */
export const rowAt = (rows: ReadonlyArray<BlockRow>, y: number): BlockRow | null =>
{
    let best: BlockRow | null = null;
    let distance = Number.POSITIVE_INFINITY;

    for (const row of rows)
    {
        const gap = y < row.top ? row.top - y : y >= row.bottom ? y - row.bottom + 0.01 : 0;

        if (gap < distance)
        {
            best = row;
            distance = gap;
        }
    }

    return best;
};

/** 줄이 다른 줄(조상)의 안쪽인가 */
export const isInside = (row: BlockRow, ancestor: BlockRow): boolean =>
    row.pos > ancestor.pos && row.pos < ancestor.end;

/** 바깥 줄이 함께 골라졌으면 그 안쪽 줄은 빼고 바깥 줄만 남긴다(안쪽은 바깥과 함께 움직인다) */
export const outermost = (rows: ReadonlyArray<BlockRow>): ReadonlyArray<BlockRow> =>
    rows.filter((row) => !rows.some((other) => other !== row && isInside(row, other)));

/** 키보드로 고른 블록. 처음 고른 줄(`anchor`)과 지금 줄(`focus`)의 자리다 */
export interface KeySelection
{
    readonly anchor: number;
    readonly focus: number;
}

/**
 * 블록을 고른 채 위 · 아래 화살표를 누른 뒤의 선택. 줄은 문서 차례라서 부모 다음이 그 안쪽 첫 줄이다(부모 먼저, 그다음 자식 하나씩).
 * `extend`(Shift)면 `anchor` 에서 옮긴 `focus` 까지 고르고, 아니면 옮긴 줄 하나만 고른다. 맨 앞 · 맨 뒤에서는 머문다.
 */
export const stepSelection = (
    rows: ReadonlyArray<BlockRow>,
    current: KeySelection,
    direction: "up" | "down",
    extend: boolean,
): KeySelection & { readonly selected: ReadonlyArray<number> } =>
{
    const from = rows.findIndex((row) => row.pos === current.focus);
    const anchorIndex = rows.findIndex((row) => row.pos === current.anchor);
    const index = from === -1 ? 0 : Math.max(0, Math.min(rows.length - 1, from + (direction === "down" ? 1 : -1)));
    const focus = rows[index]?.pos ?? current.focus;

    if (!extend || anchorIndex === -1)
    {
        return { anchor: focus, focus, selected: [focus] };
    }

    const span = rows.slice(Math.min(anchorIndex, index), Math.max(anchorIndex, index) + 1);

    return { anchor: current.anchor, focus, selected: outermost(span).map((row) => row.pos) };
};

/**
 * 놓을 자리. 놓는 틈(어느 두 줄 사이)은 마우스의 높이로, 들어갈 깊이는 마우스의 가로 위치로 정한다(노션처럼).
 *
 * - `plain`: `insertAt` 에 블록을 그대로 넣는다. 목록 항목을 목록 밖에 넣으면 ProseMirror 가 목록으로 감싼다.
 * - `doc`: 맨 바깥 자리 `insertAt` 에 `indent` 깊이로 넣는다. 옮기는 블록의 안쪽 블록은 깊이 차이를 지킨 채 따라온다.
 * - `nest`: 목록 항목(`insertAt` 은 그 항목 안의 끝) 안에 안쪽 블록으로 넣는다. 목록 항목은 원래 목록 꼴(글머리 · 번호 · 할 일)로 감싼다.
 *   그래서 글머리 항목 밑에 번호 항목을 넣을 수 있다(2026-10-09 사용자: 「불렛 밑에 1을 넣고 싶은 거지」).
 */
export interface DropTarget
{
    readonly mode: "plain" | "nest" | "doc";
    /** `doc` 일 때 넣을 깊이 */
    readonly indent?: number;
    /** 넣을 문서 자리 */
    readonly insertAt: number;
    /** 놓는 선의 높이(화면 좌표) */
    readonly lineY: number;
    /** 놓는 선이 시작하는 왼쪽. 들어갈 깊이를 보인다 */
    readonly lineLeft: number;
}

/** 안쪽으로 넣을 때 한 단계 들여 쓰는 너비(px). 목록의 들여쓰기(1.5em)와 같다 */
export const NEST_INDENT = 24;

const LIST_ITEM_ROWS = new Set(["listItem", "taskItem"]);

/** 가장 가까운 바깥 줄 */
const parentOf = (rows: ReadonlyArray<BlockRow>, row: BlockRow): BlockRow | null =>
{
    let parent: BlockRow | null = null;

    for (const other of rows)
    {
        if (isInside(row, other) && (parent === null || other.pos > parent.pos))
        {
            parent = other;
        }
    }

    return parent;
};

/** 깊이를 고를 수 있는 놓을 자리 하나. 마우스의 가로 위치와 `lineLeft` 를 견준다 */
const choose = (options: ReadonlyArray<DropTarget>, x: number): DropTarget | null =>
{
    // 마우스가 그 깊이의 글 시작선을 넘어야 그 깊이다. 조금만 오른쪽으로 가도 안쪽으로 빨려 들지 않게 한다
    const reachable = options.filter((option) => option.lineLeft <= x);

    if (reachable.length === 0)
    {
        return options.reduce<DropTarget | null>((best, option) => (best === null || option.lineLeft < best.lineLeft ? option : best), null);
    }

    return reachable.reduce((best, option) => (option.lineLeft > best.lineLeft ? option : best));
};

/**
 * 끄는 블록들(`dragged`, 바깥 줄만)을 놓을 자리.
 *
 * ⚠ **끄는 블록과 그 안쪽 줄에는 놓지 않는다.**
 * ⚠ **안쪽 줄이 있는 줄 바로 아래 틈은 그 첫 안쪽 줄 앞 하나뿐이다.** 그 틈에서 「바깥 줄 뒤」를 고르면 안쪽 줄 전체를 건너뛰어 놓여서
 *    선이 선 자리와 놓인 자리가 다르다.
 */
export const dropAt = (rows: ReadonlyArray<BlockRow>, dragged: ReadonlyArray<BlockRow>, x: number, y: number): DropTarget | null =>
{
    const candidates = rows.filter((row) => !dragged.some((source) => row.pos === source.pos || isInside(row, source)));
    const hit = rowAt(candidates, y);

    if (hit === null)
    {
        return null;
    }

    const index = candidates.indexOf(hit);
    const below = y >= (hit.top + hit.bottom) / 2;
    // 틈의 위(above)와 아래(next). 줄은 문서 차례(앞에서 뒤, 바깥이 먼저)다
    const above = below ? hit : (candidates[index - 1] ?? null);
    const next = below ? (candidates[index + 1] ?? null) : hit;

    /** 이 줄 앞에 넣는 자리 */
    const before = (row: BlockRow, lineY: number): DropTarget =>
        (row.level === "doc"
            ? { mode: "doc", insertAt: row.pos, indent: row.indent, lineY, lineLeft: row.contentLeft }
            : { mode: "plain", insertAt: row.pos, lineY, lineLeft: row.contentLeft });

    /** 이 줄(과 그 안쪽 줄) 뒤에 같은 깊이로 넣는 자리 */
    const after = (row: BlockRow, lineY: number): DropTarget =>
        (row.level === "doc"
            ? { mode: "doc", insertAt: row.end, indent: row.indent, lineY, lineLeft: row.contentLeft }
            : { mode: "plain", insertAt: row.pos + row.node.nodeSize, lineY, lineLeft: row.contentLeft });

    if (above === null)
    {
        return next === null ? null : before(next, next.top - 2);
    }

    const lineY = next !== null && next.top >= above.top ? next.top - 2 : above.fullBottom + 2;
    const firstChild = next !== null && isInside(next, above) ? next : null;

    if (firstChild !== null)
    {
        return before(firstChild, firstChild.top - 2);
    }

    const options: Array<DropTarget> = [];

    // 안쪽으로: 목록 항목이면 그 항목 안에, 맨 바깥 블록이면 한 단계 들여 써서 그 블록의 안쪽 블록으로 넣는다
    if (LIST_ITEM_ROWS.has(above.node.type.name))
    {
        options.push({ mode: "nest", insertAt: above.pos + above.node.nodeSize - 1, lineY, lineLeft: above.contentLeft + NEST_INDENT });
    }
    else if (above.level === "doc")
    {
        options.push({ mode: "doc", insertAt: above.end, indent: above.indent + 1, lineY, lineLeft: above.contentLeft + NEST_INDENT });
    }

    // 같은 깊이: 위 줄 바로 뒤
    options.push(after(above, lineY));

    // 바깥으로: 위 줄이 바깥 줄의 마지막 안쪽 줄이면 그 바깥 줄 뒤에도 놓을 수 있다
    let current = above;
    let parent = parentOf(candidates, current);

    while (parent !== null && (next === null || !isInside(next, parent)))
    {
        options.push(after(parent, lineY));
        current = parent;
        parent = parentOf(candidates, current);
    }

    return choose(options, x);
};
