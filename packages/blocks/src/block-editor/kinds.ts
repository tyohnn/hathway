import type { Editor } from "@tiptap/core";

import type { BlockEditorLabels } from "./labels";

/**
 * 블록의 종류. `/` 메뉴와 손잡이의 「바꾸기」 메뉴가 같은 목록을 쓴다. 이름은 `labels.kinds` 가 갖는다.
 *
 * ⚠ 찾는 말에는 이름과 영어 · 마크다운 기호를 함께 둔다. 노션에 익은 사람은 `/h1` 이나 `/todo` 를 친다.
 */
export type BlockKind =
    | "paragraph"
    | "heading1"
    | "heading2"
    | "heading3"
    | "bulletList"
    | "orderedList"
    | "taskList"
    | "toggle"
    | "callout"
    | "quote"
    | "code"
    | "divider";

export interface BlockKindItem
{
    readonly kind: BlockKind;
    /** 오른쪽에 흐리게 서는 마크다운 기호. 없으면 빈 글이다 */
    readonly symbol: string;
    /** 이름 말고도 찾히는 말 */
    readonly keywords: string;
}

export const BLOCK_KINDS: ReadonlyArray<BlockKindItem> = [
    { kind: "paragraph", symbol: "", keywords: "text paragraph 문단 본문" },
    { kind: "heading1", symbol: "#", keywords: "h1 heading 제목" },
    { kind: "heading2", symbol: "##", keywords: "h2 heading 제목" },
    { kind: "heading3", symbol: "###", keywords: "h3 heading 제목" },
    { kind: "bulletList", symbol: "-", keywords: "bullet list ul 목록" },
    { kind: "orderedList", symbol: "1.", keywords: "number ordered list ol 목록" },
    { kind: "taskList", symbol: "[]", keywords: "todo task check 할일 체크" },
    { kind: "toggle", symbol: "", keywords: "toggle details 접기" },
    { kind: "callout", symbol: "", keywords: "callout 강조 메모" },
    { kind: "quote", symbol: ">", keywords: "quote blockquote 인용" },
    { kind: "code", symbol: "```", keywords: "code block 코드" },
    { kind: "divider", symbol: "---", keywords: "divider hr line 구분선 선" },
];

/** 메뉴의 줄 오른쪽에 서는 풀이. 토글은 기호가 없어 하는 일을 적는다 */
export const kindHint = (item: BlockKindItem, labels: BlockEditorLabels): string =>
    item.kind === "toggle" ? labels.toggleHint : item.symbol;

/** 「바꾸기」에 서는 종류. 구분선은 글이 없는 블록이라 다른 블록을 구분선으로 바꾸지 않는다 */
export const TURN_INTO_KINDS = BLOCK_KINDS.filter((item) => item.kind !== "divider");

export const kindsMatching = (query: string, labels: BlockEditorLabels): ReadonlyArray<BlockKindItem> =>
{
    const needle = query.trim().toLowerCase();

    return needle === "" ? BLOCK_KINDS : BLOCK_KINDS.filter((item) => `${labels.kinds[item.kind]} ${item.keywords}`.toLowerCase().includes(needle));
};

const LIST_KINDS = new Set<BlockKind>(["bulletList", "orderedList", "taskList"]);

/** 커서가 목록 항목 안이면 목록 밖으로 꺼낸다. 안쪽 항목이면 여러 번 꺼낸다 */
const leaveLists = (editor: Editor): void =>
{
    for (let step = 0; step < 8; step++)
    {
        const item = editor.isActive("taskItem") ? "taskItem" : editor.isActive("listItem") ? "listItem" : null;

        if (item === null || !editor.commands.liftListItem(item))
        {
            return;
        }
    }
};

/** 새로 세운 토글을 펼친다. 펼침은 문서의 값이 아니라 화면의 상태라서(`schema.ts` 의 persist) 그 토글의 펼침 단추를 누른다 */
const openToggleAtCursor = (editor: Editor): void =>
{
    const { $from } = editor.state.selection;

    for (let depth = $from.depth; depth > 0; depth--)
    {
        if ($from.node(depth).type.name === "details")
        {
            const dom = editor.view.nodeDOM($from.before(depth));

            if (dom instanceof HTMLElement && !dom.classList.contains("is-open"))
            {
                dom.querySelector<HTMLButtonElement>(":scope > button")?.click();
            }

            return;
        }
    }
};

/**
 * 지금 고른 자리(커서나 고른 범위)의 블록을 이 종류로 바꾼다. `/` 메뉴는 친 `/…` 를 지운 뒤에, 「바꾸기」는 블록을 고른 뒤에 부른다.
 *
 * ⚠ **목록이 아닌 종류로 바꿀 때는 먼저 목록에서 꺼낸다.** 꺼내지 않으면 목록 항목 안의 문단만 제목이 되어 글머리가 남는다.
 */
export const applyKind = (editor: Editor, kind: BlockKind): void =>
{
    if (!LIST_KINDS.has(kind) && kind !== "divider")
    {
        leaveLists(editor);
    }

    const chain = editor.chain().focus();

    switch (kind)
    {
        case "paragraph":
            chain.setParagraph().run();

            return;
        case "heading1":
            chain.setHeading({ level: 1 }).run();

            return;
        case "heading2":
            chain.setHeading({ level: 2 }).run();

            return;
        case "heading3":
            chain.setHeading({ level: 3 }).run();

            return;
        case "bulletList":
            if (!editor.isActive("bulletList"))
            {
                chain.toggleBulletList().run();
            }

            return;
        case "orderedList":
            if (!editor.isActive("orderedList"))
            {
                chain.toggleOrderedList().run();
            }

            return;
        case "taskList":
            if (!editor.isActive("taskList"))
            {
                chain.toggleTaskList().run();
            }

            return;
        case "toggle":
            chain.setDetails().run();
            openToggleAtCursor(editor);

            return;
        case "callout":
            chain.setCallout().run();

            return;
        case "quote":
            if (!editor.isActive("blockquote"))
            {
                chain.setBlockquote().run();
            }

            return;
        case "code":
            chain.setCodeBlock().run();

            return;
        case "divider":
            chain.setHorizontalRule().run();

            return;
    }
};
