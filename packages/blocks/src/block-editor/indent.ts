import { Extension, type Editor, type JSONContent, type MarkdownToken, type MarkdownTokenizer } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

import { liftKeepingKind, sinkIntoPrevious } from "./lists";

/**
 * 블록의 들여쓰기(노션의 「안쪽 블록」). 문단 · 제목 · 인용 · 코드 · 토글 · 콜아웃 · 목록 밑에도 블록을 들여 넣는다.
 *
 * 노션은 어느 블록이든 안쪽 블록을 가진다. 이 편집기는 그것을 맨 바깥 블록의 `indent` 값(0 부터)으로 적는다. 블록 하나 뒤에
 * 그보다 깊은 블록들이 이어지면 그 블록의 안쪽 블록이다. 그래서 바깥 블록을 옮기거나 들여 쓰면 안쪽 블록이 함께 움직인다
 * (`blockRange`).
 *
 * ⚠ **저장은 노션 enhanced markdown 처럼 탭이다.** 안쪽 블록의 줄마다 깊이만큼 탭을 붙인다(`serializeBody`). 읽을 때는 맨 바깥에서
 *    탭으로 시작하는 줄 묶음을 앞 블록의 안쪽 블록으로 읽는다(`indentedTokenizer`). 목록 · 토글 · 콜아웃 안쪽의 탭 줄은 그
 *    블록이 먼저 가져가므로 여기까지 오지 않는다.
 * ⚠ **목록 항목 안에서는 목록의 들여쓰기를 쓴다.** Tab 은 먼저 목록 항목을 한 단계 안으로 넣고(`sinkListItem`), 그것이 안 될 때만
 *    블록을 들여 쓴다.
 */
export const INDENTABLE = [
    "paragraph",
    "heading",
    "blockquote",
    "codeBlock",
    "horizontalRule",
    "bulletList",
    "orderedList",
    "taskList",
    "details",
    "callout",
] as const;

export const MAX_INDENT = 8;

const indentable = new Set<string>(INDENTABLE);

export const indentOf = (node: PmNode | JSONContent): number =>
{
    const value = (node.attrs as Record<string, unknown> | undefined)?.["indent"];

    return typeof value === "number" && value > 0 ? value : 0;
};

/** 들여 쓴 블록 묶음. 맨 바깥에서 탭으로 시작하는 줄들(사이의 빈 줄 포함)이다 */
const indentedTokenizer: MarkdownTokenizer = {
    name: "indentedBlocks",
    level: "block",
    start: (src) => src.search(/^\t/m),
    tokenize(src, _tokens, lexer)
    {
        const lines = src.split("\n");
        let taken = 0;

        while (taken < lines.length)
        {
            const line = lines[taken] ?? "";

            if (line.startsWith("\t"))
            {
                taken += 1;
                continue;
            }

            // 빈 줄은 다음 줄이 다시 탭이면 묶음 안이다
            if (line.trim() === "" && (lines[taken + 1] ?? "").startsWith("\t"))
            {
                taken += 1;
                continue;
            }

            break;
        }

        if (taken === 0)
        {
            return undefined;
        }

        const block = lines.slice(0, taken);
        const raw = block.join("\n") + (taken < lines.length ? "\n" : "");

        return {
            type: "indentedBlocks",
            raw,
            tokens: lexer.blockTokens(block.map((line) => line.replace(/^\t/, "")).join("\n")),
        } as MarkdownToken;
    },
};

/** 읽은 안쪽 블록을 한 단계 깊게 한다 */
const deeper = (node: JSONContent): JSONContent =>
    node.type !== undefined && indentable.has(node.type) ? { ...node, attrs: { ...node.attrs, indent: Math.min(MAX_INDENT, indentOf(node) + 1) } } : node;

/** 맨 바깥 블록 `index` 와 그 안쪽 블록들(뒤에 이어지는 더 깊은 블록)의 문서 자리 */
export const blockRange = (doc: PmNode, index: number): { readonly from: number; readonly to: number; readonly last: number } =>
{
    let from = 0;

    for (let i = 0; i < index; i++)
    {
        from += doc.child(i).nodeSize;
    }

    const head = doc.child(index);
    let to = from + head.nodeSize;
    let last = index;

    for (let i = index + 1; i < doc.childCount; i++)
    {
        const next = doc.child(i);

        if (indentOf(next) <= indentOf(head))
        {
            break;
        }

        to += next.nodeSize;
        last = i;
    }

    return { from, to, last };
};

/**
 * 고른 맨 바깥 블록들(과 그 안쪽 블록)의 들여쓰기를 `delta` 만큼 바꾼다. 바뀐 것이 없으면 `false` 다.
 *
 * ⚠ **바로 앞 블록보다 두 단계 깊게 들어가지 않는다.** 노션처럼 앞 블록이 있어야 그 안쪽이 된다. 첫 블록은 들여 쓰지 않는다.
 */
export const shiftIndent = (tr: Transaction, firstIndex: number, lastIndex: number, delta: 1 | -1): boolean =>
{
    const doc = tr.doc;
    const head = doc.maybeChild(firstIndex);

    if (head === null || !indentable.has(head.type.name))
    {
        return false;
    }

    const previous = firstIndex > 0 ? doc.child(firstIndex - 1) : null;
    const ceiling = previous === null ? 0 : Math.min(MAX_INDENT, indentOf(previous) + 1);
    const next = indentOf(head) + delta;

    if (next < 0 || next > ceiling)
    {
        return false;
    }

    const { last } = blockRange(doc, lastIndex);
    let pos = 0;

    for (let i = 0; i < doc.childCount; i++)
    {
        const child = doc.child(i);

        if (i >= firstIndex && i <= last && indentable.has(child.type.name))
        {
            tr.setNodeAttribute(pos, "indent", Math.max(0, Math.min(MAX_INDENT, indentOf(child) + delta)));
        }

        pos += child.nodeSize;
    }

    return true;
};

/** 커서가 있는 맨 바깥 블록들의 차례. 토글 · 콜아웃 안쪽이면 `null` 이다(그 안에서는 들여 쓰지 않는다) */
const selectedBlocks = (editor: Editor): { readonly first: number; readonly last: number } | null =>
{
    const { $from, $to } = editor.state.selection;

    if ($from.depth === 0)
    {
        return null;
    }

    const top = $from.node(1);

    if (["details", "callout"].includes(top.type.name) && $from.depth > 1)
    {
        return null;
    }

    return { first: $from.index(0), last: $to.index(0) };
};

const indentBy = (editor: Editor, delta: 1 | -1): boolean =>
{
    const blocks = selectedBlocks(editor);

    if (blocks === null)
    {
        return false;
    }

    const tr = editor.state.tr;

    if (!shiftIndent(tr, blocks.first, blocks.last, delta))
    {
        return false;
    }

    editor.view.dispatch(tr);

    return true;
};

export const BlockIndent = Extension.create({
    name: "blockIndent",
    // 맨 앞 Backspace(내어 쓰기)가 앞 블록과 합치기보다 먼저 돌아야 한다
    priority: 1000,

    addGlobalAttributes()
    {
        return [{
            types: [...INDENTABLE],
            attributes: {
                indent: {
                    default: 0,
                    keepOnSplit: true,
                    parseHTML: (element) => Number(element.getAttribute("data-indent") ?? 0) || 0,
                    renderHTML: (attributes) =>
                        (typeof attributes["indent"] === "number" && attributes["indent"] > 0 ? { "data-indent": String(attributes["indent"]) } : {}),
                },
            },
        }];
    },

    markdownTokenName: "indentedBlocks",
    markdownTokenizer: indentedTokenizer,

    parseMarkdown(token, helpers)
    {
        return helpers.parseChildren(token.tokens ?? []).map(deeper);
    },

    addKeyboardShortcuts()
    {
        const inItem = (): "listItem" | "taskItem" | null =>
            (this.editor.isActive("taskItem") ? "taskItem" : this.editor.isActive("listItem") ? "listItem" : null);

        return {
            // 목록 항목이면 먼저 항목을 안으로 넣고, 안 되면 블록을 들여 쓴다. 어느 쪽이든 초점이 편집기 밖으로 나가지 않는다
            Tab: () =>
            {
                const item = inItem();

                if (item !== null && this.editor.commands.sinkListItem(item))
                {
                    return true;
                }

                // 목록의 첫 항목이면 앞 목록의 마지막 항목 안으로 넣는다. 맨 바깥 들여쓰기로 홀로 서지 않게 한다
                const nested = item === null ? null : sinkIntoPrevious(this.editor.state);

                if (nested !== null)
                {
                    this.editor.view.dispatch(nested);

                    return true;
                }

                indentBy(this.editor, 1);

                return true;
            },
            "Shift-Tab": () =>
            {
                const item = inItem();
                const keeping = item === null ? null : liftKeepingKind(this.editor.state);

                if (keeping !== null)
                {
                    this.editor.view.dispatch(keeping);

                    return true;
                }

                if (item !== null && this.editor.state.selection.$from.depth > 3 && this.editor.commands.liftListItem(item))
                {
                    return true;
                }

                indentBy(this.editor, -1);

                return true;
            },
            // 들여 쓴 블록의 맨 앞에서 지우기는 노션처럼 먼저 내어 쓴다
            Backspace: () =>
            {
                const { selection } = this.editor.state;

                if (!selection.empty || selection.$from.parentOffset !== 0 || selection.$from.depth !== 1)
                {
                    return false;
                }

                const top = selection.$from.node(1);

                return indentOf(top) > 0 && indentBy(this.editor, -1);
            },
        };
    },
});
