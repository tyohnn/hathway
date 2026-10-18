import type { Node as PmNode } from "@tiptap/pm/model";
import { TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { canJoin, type Transform } from "@tiptap/pm/transform";

/**
 * 목록끼리의 일. 맞닿은 같은 목록을 잇고, 다른 종류의 목록 안에 든 항목을 종류 그대로 내어 쓴다.
 *
 * ⚠ 들여쓰기(`indent.ts`)와 줄 조작(`ops.ts`)이 함께 부르므로 둘 어느 쪽도 부르지 않는다. 들여쓰기 값도 여기서 직접 읽는다.
 */
const LISTS = new Set(["bulletList", "orderedList", "taskList"]);
const ITEMS = new Set(["listItem", "taskItem"]);

const depthOf = (node: PmNode): number =>
{
    const value: unknown = node.attrs["indent"];

    return typeof value === "number" && value > 0 ? value : 0;
};

/**
 * 맞닿은 같은 종류 · 같은 깊이의 목록을 하나로 잇는다. 옮기거나 지운 뒤에 부른다.
 *
 * ⚠ **잇지 않으면 다시 열 때 모양이 바뀐다.** 목록 둘을 따로 두어도 글로는 빈 줄 하나를 사이에 둔 목록이라, 다시 읽으면 하나가
 *    된다(글머리 · 번호). 그사이에는 목록 사이의 넓은 틈이 보여 노션의 한 목록과도 다르다.
 */
export const joinAdjacentLists = (tr: Transform): void =>
{
    const seams: Array<number> = [];

    /** 한 노드의 자식 사이에서 이을 이음매를 찾는다. `start` 는 그 노드의 안쪽이 시작하는 자리다 */
    const collect = (node: PmNode, start: number): void =>
    {
        let previous: PmNode | null = null;
        let offset = start;

        node.forEach((child) =>
        {
            if (previous !== null && LISTS.has(child.type.name) && child.type === previous.type && depthOf(child) === depthOf(previous))
            {
                seams.push(offset);
            }

            previous = child;
            offset += child.nodeSize;
        });
    };

    // 문서 자신(맨 바깥 블록 사이)과 그 안의 모든 노드(목록 항목 안의 안쪽 목록 사이)
    collect(tr.doc, 0);
    tr.doc.descendants((node, pos) =>
    {
        collect(node, pos + 1);

        return !node.isTextblock;
    });

    // 뒤의 이음매부터 이어야 앞의 자리가 어긋나지 않는다
    for (const seam of seams.sort((a, b) => b - a))
    {
        if (canJoin(tr.doc, seam))
        {
            tr.join(seam);
        }
    }
};

/**
 * 커서가 든 목록 항목을 한 단계 내어 쓰되 항목의 종류를 지킨다(글머리 항목 안의 번호 항목은 밖에서도 번호다). 바깥 목록과 종류가
 * 같거나 안쪽 목록이 아니면 `null` 이고, 편집기의 기본 내어쓰기(`liftListItem`)가 맡는다.
 *
 * 항목은 바깥 항목 바로 뒤에 제 종류의 목록으로 선다. 바깥 목록의 가운데면 그 자리에서 바깥 목록을 둘로 가른다. 뒤 항목은 제자리에 남는다.
 * 기본 내어쓰기는 항목을 바깥 목록의 항목으로 바꿔서 번호가 글머리가 되었다(2026-10-09 사용자).
 */
export const liftKeepingKind = (state: EditorState): Transaction | null =>
{
    const { $from } = state.selection;
    let depth = $from.depth;

    while (depth > 0 && !ITEMS.has($from.node(depth).type.name))
    {
        depth--;
    }

    // 항목(depth) · 안쪽 목록(depth-1) · 바깥 항목(depth-2) · 바깥 목록(depth-3)
    if (depth < 4 || !ITEMS.has($from.node(depth - 2).type.name))
    {
        return null;
    }

    const item = $from.node(depth);
    const list = $from.node(depth - 1);
    const outer = $from.node(depth - 3);

    if (list.type === outer.type)
    {
        return null;
    }

    const tr = state.tr;
    const offset = $from.pos - $from.before(depth);
    const alone = list.childCount === 1;
    const outerItemEnd = $from.after(depth - 2);
    const outerIsLast = $from.index(depth - 3) === outer.childCount - 1;

    // 안쪽 목록에 이 항목뿐이면 목록째 뺀다. 빈 목록이 남지 않게 한다
    tr.delete(alone ? $from.before(depth - 1) : $from.before(depth), alone ? $from.after(depth - 1) : $from.after(depth));

    const lifted = list.type.create("indent" in list.attrs ? { ...list.attrs, indent: depthOf(outer) } : list.attrs, item);
    let at: number;

    if (outerIsLast)
    {
        at = tr.mapping.map($from.after(depth - 3));
    }
    else
    {
        // 바깥 항목 뒤에서 바깥 목록을 가르고, 가른 두 목록 사이(닫는 자리 하나 뒤)에 넣는다
        const seam = tr.mapping.map(outerItemEnd);

        tr.split(seam);
        at = seam + 1;
    }

    tr.insert(at, lifted);
    tr.setSelection(TextSelection.create(tr.doc, at + 1 + offset));
    joinAdjacentLists(tr);

    return tr.scrollIntoView();
};

/**
 * 목록의 첫 항목에서 Tab 을 누르면 바로 앞 목록의 마지막 항목 안으로 넣는다. 항목의 종류는 지키고, 그 안에 같은 종류의 안쪽 목록이
 * 끝에 있으면 거기에 이어 붙는다. 첫 항목이 아니거나 앞 블록이 목록이 아니면 `null` 이고 편집기의 기본 들여쓰기가 맡는다.
 *
 * ⚠ 기본 들여쓰기(`sinkListItem`)는 같은 목록 안의 앞 항목으로만 넣는다. 내어 쓴 번호 항목은 제 목록의 첫 항목이라 들어가지 못하고
 *    맨 바깥 블록의 들여쓰기로 섰다(2026-10-09 사용자: 「탭은 반드시 중첩이었으면」).
 */
export const sinkIntoPrevious = (state: EditorState): Transaction | null =>
{
    const { $from } = state.selection;
    let depth = $from.depth;

    while (depth > 0 && !ITEMS.has($from.node(depth).type.name))
    {
        depth--;
    }

    if (depth < 2 || $from.index(depth - 1) !== 0)
    {
        return null;
    }

    const list = $from.node(depth - 1);
    const container = $from.node(depth - 2);
    const at = $from.index(depth - 2);
    const previous = at > 0 ? container.child(at - 1) : null;

    if (previous === null || !LISTS.has(previous.type.name) || previous.lastChild === null || !ITEMS.has(previous.lastChild.type.name))
    {
        return null;
    }

    const item = $from.node(depth);
    const offset = $from.pos - $from.before(depth);
    const listStart = $from.before(depth - 1);
    // 앞 목록의 마지막 항목 안쪽의 끝(항목과 목록의 닫는 자리 둘 앞)
    const into = listStart - 2;
    const tr = state.tr;

    tr.delete(list.childCount === 1 ? listStart : $from.before(depth), list.childCount === 1 ? $from.after(depth - 1) : $from.after(depth));
    tr.insert(into, list.type.create("indent" in list.attrs ? { ...list.attrs, indent: 0 } : list.attrs, item));
    tr.setSelection(TextSelection.create(tr.doc, into + 1 + offset));
    joinAdjacentLists(tr);

    return tr.scrollIntoView();
};
