import { mergeAttributes, Node, type JSONContent, type MarkdownToken, type MarkdownTokenizer } from "@tiptap/core";
import { Details } from "@tiptap/extension-details";

/**
 * 노션 enhanced markdown 의 블록 둘(토글 · 콜아웃)을 편집기와 글 사이에서 오가게 한다.
 *
 * 본문의 꼴은 노션 MCP 가 쓰는 것과 같다(https://developers.notion.com/guides/data-apis/enhanced-markdown).
 *
 * ```
 * <details>
 * <summary>요약</summary>
 * 	안쪽 블록
 * </details>
 * <callout icon="💡">첫 문단
 * 	이어지는 블록
 * </callout>
 * ```
 *
 * ⚠ **안쪽 블록은 탭 하나로 들여 쓴다.** 닫는 태그는 들여 쓰지 않은 줄에서만 찾는다. 그래서 안쪽에 같은 블록이 겹쳐도
 *    (탭이 붙은 `</details>`) 바깥 블록이 일찍 닫히지 않는다.
 * ⚠ **tiptap 의 기본 꼴(`:::details`)은 쓰지 않는다.** Claude 와 노션이 읽는 글이 이 꼴이라 저장도 이 꼴로 한다.
 */

/** 한 줄에서 여는 태그의 속성을 읽는다. `icon="💡" color="gray_bg"` 꼴이다 */
const attributesOf = (source: string): Record<string, string> =>
    Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1] ?? "", match[2] ?? ""]));

/** 들여 쓴 안쪽에서 탭 하나(또는 공백 넷까지)를 걷는다 */
const dedent = (lines: ReadonlyArray<string>): string =>
    lines.map((line) => line.replace(/^(\t| {1,4})/, "")).join("\n");

/** 안쪽 블록마다 탭 하나를 붙인다. 빈 줄은 그대로 둔다 */
const indent = (text: string): string =>
    text.split("\n").map((line) => (line === "" ? line : `\t${line}`)).join("\n");

interface Enclosed
{
    /** 이 블록이 차지한 원문(닫는 줄까지) */
    readonly raw: string;
    /** 여는 줄에서 여는 태그 뒤에 남은 글 */
    readonly rest: string;
    readonly attributes: Record<string, string>;
    /** 안쪽 줄. 들여쓰기를 걷기 전이다 */
    readonly inner: ReadonlyArray<string>;
}

/**
 * `<tag …>` 로 시작해 들여 쓰지 않은 `</tag>` 줄에서 끝나는 블록을 떼어 낸다. 맞지 않으면 `null` 이다.
 * 여는 줄 안에서 닫히는 꼴(`<callout icon="💡">글</callout>`)도 받는다.
 */
const enclosed = (src: string, tag: string): Enclosed | null =>
{
    const open = new RegExp(`^<${tag}((?:\\s+[\\w-]+="[^"]*")*)\\s*>([^\\n]*)(?:\\n|$)`).exec(src);

    if (open === null)
    {
        return null;
    }

    const head = open[0];
    const attributes = attributesOf(open[1] ?? "");
    const firstLine = open[2] ?? "";
    const inlineClose = new RegExp(`</${tag}>\\s*$`);

    if (inlineClose.test(firstLine))
    {
        return { raw: head, rest: firstLine.replace(inlineClose, ""), attributes, inner: [] };
    }

    const lines = src.slice(head.length).split("\n");
    const close = new RegExp(`^</${tag}>\\s*$`);
    const end = lines.findIndex((line) => close.test(line));

    if (end === -1)
    {
        return null;
    }

    const consumed = lines.slice(0, end + 1).join("\n");
    const trailing = src.slice(head.length + consumed.length).startsWith("\n") ? "\n" : "";

    return { raw: head + consumed + trailing, rest: firstLine, attributes, inner: lines.slice(0, end) };
};

const blockStart = (tag: string) => (src: string): number =>
{
    const index = src.search(new RegExp(`^<${tag}[\\s>]`, "m"));

    return index;
};

const detailsTokenizer: MarkdownTokenizer = {
    name: "details",
    level: "block",
    start: blockStart("details"),
    tokenize(src, _tokens, lexer)
    {
        const block = enclosed(src, "details");

        if (block === null)
        {
            return undefined;
        }

        // 요약은 여는 줄 뒤나 바로 다음 줄의 <summary> 다
        const lines = [block.rest, ...block.inner];
        const at = lines.findIndex((line) => /<summary>/i.test(line));
        const summary = at === -1 ? "" : (/<summary>(.*?)<\/summary>/i.exec(lines[at] ?? "")?.[1] ?? "");
        const children = at === -1 ? block.inner : lines.slice(at + 1);

        return {
            type: "details",
            raw: block.raw,
            summary: lexer.inlineTokens(summary),
            tokens: lexer.blockTokens(dedent(children)),
        } as MarkdownToken;
    },
};

const paragraph = (content: Array<JSONContent> = []): JSONContent => ({ type: "paragraph", content });

/**
 * 토글. tiptap 의 `Details` 에 노션의 꼴만 입힌다. 열고 닫는 단추와 안쪽 자리는 그 확장의 것을 그대로 쓴다.
 */
export const NotionDetails = Details.extend({
    markdownTokenizer: detailsTokenizer,

    parseMarkdown(token, helpers)
    {
        const summary = helpers.parseInline((token["summary"] as Array<MarkdownToken> | undefined) ?? []);
        const children = helpers.parseChildren(token.tokens ?? []);

        return helpers.createNode("details", {}, [
            helpers.createNode("detailsSummary", {}, summary),
            helpers.createNode("detailsContent", {}, children.length === 0 ? [paragraph()] : children),
        ]);
    },

    renderMarkdown(node, helpers)
    {
        const summary = node.content?.find((child) => child.type === "detailsSummary");
        const content = node.content?.find((child) => child.type === "detailsContent");
        const title = summary?.content === undefined ? "" : helpers.renderChildren(summary.content);
        const inner = content?.content === undefined ? "" : helpers.renderChildren(content.content, "\n\n");
        const body = inner.trim() === "" ? "" : `\n${indent(inner.replace(/\n+$/, ""))}`;

        return `<details>\n<summary>${title}</summary>${body}\n</details>`;
    },
});

const calloutTokenizer: MarkdownTokenizer = {
    name: "callout",
    level: "block",
    start: blockStart("callout"),
    tokenize(src, _tokens, lexer)
    {
        const block = enclosed(src, "callout");

        if (block === null)
        {
            return undefined;
        }

        const first = block.rest.trim();
        const rest = dedent(block.inner);

        return {
            type: "callout",
            raw: block.raw,
            icon: block.attributes["icon"] ?? "",
            color: block.attributes["color"] ?? "",
            tokens: lexer.blockTokens(first === "" ? rest : `${first}\n\n${rest}`),
        } as MarkdownToken;
    },
};

export const DEFAULT_CALLOUT_ICON = "💡";

/**
 * 콜아웃. 아이콘 하나와 안쪽 블록들이다. 노션처럼 첫 문단은 여는 태그와 같은 줄에 쓰고, 이어지는 블록은 탭으로 들여 쓴다.
 *
 * ⚠ **색은 보관만 한다.** 노션에서 가져온 `color` 를 잃지 않도록 속성으로 두고 다시 쓸 때 그대로 적는다. 화면은 loam 의 한 색으로 그린다.
 */
export const Callout = Node.create({
    name: "callout",
    group: "block",
    content: "block+",
    defining: true,

    addAttributes()
    {
        return {
            // 그리는 것은 `renderHTML` 이 `data-*` 로 한 번만 한다
            icon: { default: DEFAULT_CALLOUT_ICON, parseHTML: (element) => element.getAttribute("data-icon") ?? DEFAULT_CALLOUT_ICON, renderHTML: () => ({}) },
            color: { default: "", parseHTML: (element) => element.getAttribute("data-color") ?? "", renderHTML: () => ({}) },
        };
    },

    parseHTML()
    {
        return [{ tag: "div[data-type=\"callout\"]", contentElement: "[data-callout-body]" }];
    },

    renderHTML({ node, HTMLAttributes })
    {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-type": "callout",
                "data-icon": node.attrs["icon"],
                "data-color": node.attrs["color"],
                class: "block-editor-callout",
            }),
            ["span", { class: "block-editor-callout-icon", contenteditable: "false", "aria-hidden": "true" }, String(node.attrs["icon"] ?? "")],
            ["div", { class: "block-editor-callout-body", "data-callout-body": "" }, 0],
        ];
    },

    markdownTokenizer: calloutTokenizer,

    parseMarkdown(token, helpers)
    {
        const children = helpers.parseChildren(token.tokens ?? []);
        const icon = typeof token["icon"] === "string" && token["icon"] !== "" ? token["icon"] : DEFAULT_CALLOUT_ICON;
        const color = typeof token["color"] === "string" ? token["color"] : "";

        return helpers.createNode("callout", { icon, color }, children.length === 0 ? [paragraph()] : children);
    },

    renderMarkdown(node, helpers)
    {
        const icon = String(node.attrs?.["icon"] ?? DEFAULT_CALLOUT_ICON);
        const color = String(node.attrs?.["color"] ?? "");
        const open = `<callout icon="${icon.replace(/"/g, "")}"${color === "" ? "" : ` color="${color.replace(/"/g, "")}"`}>`;
        const blocks = node.content ?? [];
        const [first, ...rest] = blocks;
        // 첫 블록이 문단이면 여는 태그와 같은 줄에 선다(노션의 꼴)
        const lead = first?.type === "paragraph" ? helpers.renderChildren(first.content ?? []) : "";
        const tail = first?.type === "paragraph" ? rest : blocks;
        const inner = tail.length === 0 ? "" : helpers.renderChildren(tail, "\n\n").replace(/\n+$/, "");

        // 문단 하나뿐이면 한 줄로 닫는다
        return inner === "" ? `${open}${lead}</callout>` : `${open}${lead}\n${indent(inner)}\n</callout>`;
    },

    addCommands()
    {
        return {
            setCallout: () => ({ commands }) => commands.wrapIn(this.name),
        };
    },
});

declare module "@tiptap/core"
{
    interface Commands<ReturnType>
    {
        callout: {
            /** 고른 블록을 콜아웃으로 감싼다 */
            setCallout: () => ReturnType;
        };
    }
}
