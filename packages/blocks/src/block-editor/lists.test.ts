import { assert, describe, it } from "@effect/vitest";
import { getSchema, type JSONContent } from "@tiptap/core";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { Transform } from "@tiptap/pm/transform";

import { parseBody, serializeBody } from "./format";
import { joinAdjacentLists, liftKeepingKind, sinkIntoPrevious } from "./lists";
import { blockEditorExtensions } from "./schema";

/**
 * 목록끼리의 일. 줄 조작 · 내어쓰기가 남기는 문서의 모양을 잰다. 조작 자체는 편집기와 화면 위에서 돌아 쓰는 앱의 e2e 가 잰다.
 */
const schema = getSchema(blockEditorExtensions());

/** 본문을 열고 `caret` 글자 안에 커서를 둔 뒤 내어 쓴 결과의 본문. 내어 쓰지 않으면 `null` 이다 */
const lifted = (body: string, caret: string, run: (state: EditorState) => ReturnType<typeof liftKeepingKind> = liftKeepingKind): { readonly body: string; readonly caretText: string } | null =>
{
    const doc = schema.nodeFromJSON(parseBody(body));
    let at = -1;

    doc.descendants((node, pos) =>
    {
        if (at === -1 && node.isText && node.text?.includes(caret) === true)
        {
            at = pos + 1;
        }

        return at === -1;
    });

    const state = EditorState.create({ doc, selection: TextSelection.create(doc, at) });
    const tr = run(state);

    if (tr === null)
    {
        return null;
    }

    return { body: serializeBody(tr.doc.toJSON() as JSONContent), caretText: tr.selection.$from.parent.textContent };
};

describe("종류를 지키는 내어쓰기", () =>
{
    it("글머리 항목 안의 번호 항목을 내어 쓰면 번호 그대로 바깥 목록의 그 자리에 선다", () =>
    {
        const result = lifted("- 가\n  1. 하나\n  2. 둘\n- 나", "둘");

        assert.strictEqual(result?.body, "- 가\n  1. 하나\n\n1. 둘\n\n- 나");
        assert.strictEqual(result?.caretText, "둘");
    });

    it("가운데 항목을 빼면 안쪽 목록이 둘로 갈라지지 않고 뒤 항목은 남는다. 바깥 목록의 마지막이면 그 뒤에 선다", () =>
    {
        assert.strictEqual(lifted("- 가\n  1. 하나\n  2. 둘", "하나")?.body, "- 가\n  1. 둘\n\n1. 하나");
    });

    it("종류가 같으면 맡지 않는다(편집기의 기본 내어쓰기가 한다)", () =>
    {
        assert.strictEqual(lifted("- 가\n  - 하나", "하나"), null);
        assert.strictEqual(lifted("1. 하나", "하나"), null);
    });
});

/** 글을 문서로 읽고, 맨 바깥 블록을 따로 세운 뒤(조작이 남기는 꼴) 잇기를 지나 다시 글로 쓴다 */
const joined = (blocks: ReadonlyArray<JSONContent>): { readonly body: string; readonly top: ReadonlyArray<string> } =>
{
    const tr = new Transform(schema.nodeFromJSON({ type: "doc", content: [...blocks] }));

    joinAdjacentLists(tr);

    const doc = tr.doc.toJSON() as JSONContent;

    return { body: serializeBody(doc), top: (doc.content ?? []).map((node) => `${node.type ?? ""}@${String(node.attrs?.["indent"] ?? 0)}`) };
};

const blocksOf = (body: string): ReadonlyArray<JSONContent> => parseBody(body).content ?? [];

describe("맞닿은 목록 잇기", () =>
{
    it("같은 종류 · 같은 깊이의 목록이 맞닿으면 하나로 잇는다. 다시 열어도 하나라서 연 뒤와 모양이 같다", () =>
    {
        const result = joined([...blocksOf("- 셋"), ...blocksOf("- 하나\n- 둘"), ...blocksOf("- [ ] 가"), ...blocksOf("- [ ] 나")]);

        assert.deepStrictEqual(result.top, ["bulletList@0", "taskList@0"]);
        assert.strictEqual(result.body, "- 셋\n- 하나\n- 둘\n\n- [ ] 가\n- [ ] 나");
    });

    it("종류나 깊이가 다르면 잇지 않는다", () =>
    {
        const result = joined([...blocksOf("- 글머리"), ...blocksOf("1. 번호"), ...blocksOf("\t- 안쪽 글머리")]);

        assert.deepStrictEqual(result.top, ["bulletList@0", "orderedList@0", "bulletList@1"]);
    });

    it("목록 항목 안에서 맞닿은 안쪽 목록도 잇는다", () =>
    {
        const outer = blocksOf("- 바깥\n  - 가")[0] ?? {};
        const item = outer.content?.[0] ?? {};
        const sibling = blocksOf("- 나")[0] ?? {};
        const doubled: JSONContent = { ...outer, content: [{ ...item, content: [...(item.content ?? []), sibling] }] };

        assert.strictEqual(joined([doubled]).body, "- 바깥\n  - 가\n  - 나");
    });
});

describe("앞 목록 안으로 넣는 들여쓰기", () =>
{
    it("글머리 목록 바로 뒤의 번호 항목에서 Tab 을 누르면 그 글머리의 마지막 항목 안으로 번호 그대로 들어간다", () =>
    {
        const result = lifted("- 가\n- 나\n\n1. 하나\n2. 둘", "하나", sinkIntoPrevious);

        assert.strictEqual(result?.body, "- 가\n- 나\n  1. 하나\n\n1. 둘");
        assert.strictEqual(result?.caretText, "하나");
    });

    it("빼냈던 번호 항목을 다시 넣으면 안쪽의 같은 번호 목록에 이어 붙고, 갈라졌던 글머리 목록도 다시 하나가 된다", () =>
    {
        assert.strictEqual(lifted("- 가\n  1. 하나\n\n1. 둘\n\n- 나", "둘", sinkIntoPrevious)?.body, "- 가\n  1. 하나\n  2. 둘\n- 나");
    });

    it("목록의 첫 항목이 아니거나 앞이 목록이 아니면 맡지 않는다", () =>
    {
        assert.strictEqual(lifted("1. 하나\n2. 둘", "둘", sinkIntoPrevious), null);
        assert.strictEqual(lifted("문단\n\n1. 하나", "하나", sinkIntoPrevious), null);
    });
});
