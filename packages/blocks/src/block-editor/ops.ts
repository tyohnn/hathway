import type { Editor, JSONContent } from "@tiptap/core";
import { Fragment, Slice, type Node as PmNode, type NodeType } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

import { indentOf, MAX_INDENT } from "./indent";
import { serializeBody } from "./format";
import { joinAdjacentLists } from "./lists";

import { applyKind, type BlockKind } from "./kinds";
import type { BlockRow, DropTarget } from "./rows";

/**
 * 줄(블록) 단위의 조작 다섯. 옮기기 · 지우기 · 복제 · 복사 · 아래에 넣기 · 바꾸기. 손잡이 · 블록 메뉴 · 범위 선택이 같은 함수를 부른다.
 *
 * ⚠ **줄은 범위다.** 맨 바깥 블록은 들여 쓴 안쪽 블록까지(`row.end`), 목록 항목 · 토글 안쪽 블록은 제 노드 하나다.
 * ⚠ **조작마다 거래(transaction) 하나다.** ⌘Z 한 번에 돌아간다.
 */
interface Picked
{
    readonly from: number;
    readonly to: number;
    readonly isItem: boolean;
    /** 목록 항목이면 그 항목이 있던 목록의 종류 */
    readonly list: NodeType;
    readonly nodes: ReadonlyArray<PmNode>;
    /** 맨 바깥 줄의 들여쓰기. 안쪽 블록은 이 깊이와의 차이를 지킨다 */
    readonly headIndent: number;
}

const ITEMS = new Set(["listItem", "taskItem"]);

const pick = (doc: PmNode, rows: ReadonlyArray<BlockRow>): ReadonlyArray<Picked> =>
    [...rows]
        .sort((a, b) => a.pos - b.pos)
        .flatMap((row) =>
        {
            const node = doc.nodeAt(row.pos);

            if (node === null)
            {
                return [];
            }

            const to = row.level === "doc" ? row.end : row.pos + node.nodeSize;
            const nodes: Array<PmNode> = [];

            doc.slice(row.pos, to).content.forEach((child) => nodes.push(child));

            return [{
                from: row.pos,
                to,
                isItem: ITEMS.has(node.type.name),
                list: doc.resolve(row.pos).parent.type,
                nodes,
                headIndent: indentOf(node),
            }];
        });

const withIndent = (node: PmNode, indent: number): PmNode =>
    ("indent" in node.attrs ? node.type.create({ ...node.attrs, indent: Math.max(0, Math.min(MAX_INDENT, indent)) }, node.content, node.marks) : node);

/** 맨 바깥에 놓을 블록들. 목록 항목은 같은 목록에서 잇달아 온 것끼리 그 목록 꼴로 감싸고, 맨 바깥 블록은 깊이 차이를 지킨다 */
const blocksFor = (picked: ReadonlyArray<Picked>, indent: number | null): Array<PmNode> =>
{
    const out: Array<PmNode> = [];
    let items: Array<PmNode> = [];
    let list: NodeType | null = null;

    const flush = (): void =>
    {
        if (list !== null && items.length > 0)
        {
            const wrapped = list.create(null, items);

            out.push(indent === null ? wrapped : withIndent(wrapped, indent));
        }

        items = [];
        list = null;
    };

    for (const entry of picked)
    {
        if (entry.isItem)
        {
            if (list !== entry.list)
            {
                flush();
                list = entry.list;
            }

            items.push(...entry.nodes);
            continue;
        }

        flush();

        for (const node of entry.nodes)
        {
            out.push(withIndent(node, indent === null ? 0 : indent + indentOf(node) - entry.headIndent));
        }
    }

    flush();

    return out;
};

const LISTS = new Set(["bulletList", "orderedList", "taskList"]);

/** 블록들을 놓을 자리로 옮긴다. 먼저 지우고, 지운 만큼 옮겨 잰 자리에 넣는다 */
export const moveBlocks = (editor: Editor, rows: ReadonlyArray<BlockRow>, target: DropTarget): void =>
{
    const { state } = editor.view;
    const picked = pick(state.doc, rows);

    // 끄는 블록 안쪽에는 놓지 않는다
    if (picked.length === 0 || picked.some((entry) => target.insertAt > entry.from && target.insertAt < entry.to))
    {
        return;
    }

    const tr = state.tr;

    for (const entry of [...picked].reverse())
    {
        if (entry.isItem)
        {
            // 목록의 마지막 항목이면 빈 목록이 남지 않도록 목록째 지운다
            tr.deleteRange(entry.from, entry.to);
        }
        else
        {
            tr.delete(entry.from, entry.to);
        }
    }

    const at = tr.mapping.map(target.insertAt);

    if (target.mode === "doc")
    {
        tr.insert(at, Fragment.from(blocksFor(picked, target.indent ?? 0)));
    }
    else if (target.mode === "nest")
    {
        tr.insert(at, Fragment.from(blocksFor(picked, null)));
    }
    else
    {
        const $at = tr.doc.resolve(at);
        const host = $at.parent;

        if (LISTS.has(host.type.name) && picked.some((entry) => entry.isItem && entry.list !== host.type))
        {
            // 다른 종류의 목록 항목(글머리 사이의 번호 항목)은 그 종류 그대로 선다. 놓는 자리에서 목록을 둘로 가르고 그 사이에 넣는다(노션처럼)
            const lists = blocksFor(picked, "indent" in host.attrs ? indentOf(host) : null);
            const index = $at.index();

            if (index === 0)
            {
                tr.insert($at.before(), Fragment.from(lists));
            }
            else if (index === host.childCount)
            {
                tr.insert($at.after(), Fragment.from(lists));
            }
            else
            {
                // 가른 두 목록 사이(닫는 자리 하나 뒤)에 넣는다
                tr.split(at);
                tr.insert(at + 1, Fragment.from(lists));
            }
        }
        else
        {
            const nodes = picked.flatMap((entry) => entry.nodes.map((node) => withIndent(node, 0)));

            tr.replaceRange(at, at, new Slice(Fragment.from(nodes), 0, 0));
        }
    }

    joinAdjacentLists(tr);
    editor.view.dispatch(tr.scrollIntoView());
};

/** 블록들을 지운다. 뒤에서부터 지워 앞의 자리가 어긋나지 않게 한다 */
export const deleteBlocks = (editor: Editor, rows: ReadonlyArray<BlockRow>): void =>
{
    const tr = editor.view.state.tr;

    for (const entry of [...pick(tr.doc, rows)].reverse())
    {
        tr.deleteRange(entry.from, entry.to);
    }

    joinAdjacentLists(tr);
    editor.view.dispatch(tr);
};

/** 블록들을 바로 아래에 하나씩 복제한다 */
export const duplicateBlocks = (editor: Editor, rows: ReadonlyArray<BlockRow>): void =>
{
    const tr = editor.view.state.tr;

    for (const entry of [...pick(tr.doc, rows)].reverse())
    {
        tr.insert(entry.to, Fragment.from(entry.nodes));
    }

    editor.view.dispatch(tr);
};

/** 블록들을 노션 꼴 글로 복사한다. 가장 얕은 블록이 맨 바깥이 되도록 깊이를 맞춘다 */
export const copyBlocks = async (editor: Editor, rows: ReadonlyArray<BlockRow>): Promise<void> =>
{
    const content = blocksFor(pick(editor.view.state.doc, rows), 0).map((node) => node.toJSON() as JSONContent);

    try
    {
        await navigator.clipboard.writeText(serializeBody({ type: "doc", content }));
    }
    catch
    {
        // 클립보드를 쓸 수 없는 창이면 복사하지 않는다. 지우기 · 옮기기는 그대로 된다
    }
};

/**
 * 줄 바로 아래에 빈 블록을 넣고 `/` 메뉴를 연다(손잡이 옆 「+」). 목록 항목이면 같은 목록의 새 항목, 맨 바깥 블록이면 같은 깊이의
 * 새 문단이 그 줄과 안쪽 블록 뒤에 선다.
 */
export const insertBelow = (editor: Editor, row: BlockRow): void =>
{
    const { state } = editor.view;
    const node = state.doc.nodeAt(row.pos);

    if (node === null)
    {
        return;
    }

    const paragraph = state.schema.nodes["paragraph"];

    if (paragraph === undefined)
    {
        return;
    }

    const tr = state.tr;
    let cursor: number;

    if (ITEMS.has(node.type.name))
    {
        const at = row.pos + node.nodeSize;

        tr.insert(at, node.type.create(null, paragraph.create()));
        cursor = at + 2;
    }
    else
    {
        const at = row.level === "doc" ? row.end : row.pos + node.nodeSize;

        tr.insert(at, paragraph.create(row.level === "doc" ? { indent: row.indent } : null));
        cursor = at + 1;
    }

    tr.setSelection(TextSelection.create(tr.doc, cursor));
    editor.view.dispatch(tr);
    editor.chain().focus().insertContent("/").run();
};

/** 고른 블록들을 이 종류로 바꾼다. 첫 블록의 글 처음부터 마지막 블록의 글 끝까지 고른 뒤 `/` 메뉴와 같은 명령을 부른다 */
export const turnInto = (editor: Editor, rows: ReadonlyArray<BlockRow>, kind: BlockKind): void =>
{
    const sorted = [...rows].sort((a, b) => a.pos - b.pos);
    const first = sorted[0];
    const last = sorted.at(-1);

    if (first === undefined || last === undefined)
    {
        return;
    }

    const { doc } = editor.view.state;
    const lastNode = doc.nodeAt(last.pos);
    const from = TextSelection.near(doc.resolve(first.pos + 1), 1);
    const to = TextSelection.near(doc.resolve(last.pos + (lastNode?.nodeSize ?? 2) - 1), -1);

    editor.view.dispatch(editor.view.state.tr.setSelection(TextSelection.create(doc, from.from, Math.max(from.from, to.to))));
    applyKind(editor, kind);
};
