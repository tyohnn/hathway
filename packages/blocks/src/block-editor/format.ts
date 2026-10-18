import { resolveExtensions, type JSONContent } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";

import { indentOf } from "./indent";
import { blockEditorExtensions } from "./schema";

/**
 * 편집기 없이 본문과 편집기의 문서 사이를 오간다. 편집기가 쓰는 확장 목록을 그대로 쓰므로 둘의 꼴이 같다.
 *
 * ⚠ **검사와 서버 쪽 변환에 쓴다.** 화면의 편집기는 제 안의 `Markdown` 확장으로 같은 일을 한다.
 */
let manager: MarkdownManager | null = null;

const blockMarkdown = (): MarkdownManager =>
{
    manager ??= new MarkdownManager({ extensions: resolveExtensions(blockEditorExtensions()), indentation: { style: "space", size: 2 } });

    return manager;
};

export const parseBody = (body: string) => blockMarkdown().parse(body);

/**
 * 문서를 본문 글로 쓴다. 맨 바깥 블록마다 따로 쓰고, 들여 쓴 블록은 줄마다 깊이만큼 탭을 붙인다(노션 enhanced markdown 의 안쪽 블록).
 *
 * ⚠ **편집기의 저장도 이 함수를 지난다**(`BlockEditor` 의 `getBody`). 들여쓰기는 tiptap 의 마크다운 확장이 모르는 값이라서
 *    편집기 안의 `getMarkdown()` 으로 쓰면 탭이 빠진다.
 */
export const serializeBody = (doc: JSONContent): string =>
    (doc.content ?? [])
        .map((block) =>
        {
            const depth = indentOf(block);
            const flat = depth === 0 ? block : { ...block, attrs: { ...block.attrs, indent: 0 } };
            const text = blockMarkdown().serialize({ type: "doc", content: [flat] });

            return depth === 0 ? text : text.split("\n").map((line) => (line === "" ? line : `${"\t".repeat(depth)}${line}`)).join("\n");
        })
        .join("\n\n");

/** 줄 머리의 블록 기호(제목 · 목록 · 할 일 · 인용 · 코드 · 구분선)나 노션의 태그가 있는 줄 */
const BLOCK_MARK = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|```|~~~|-{3,}\s*$|<details\b|<callout\b)/m;

/** 글자 꾸밈(굵게 · 링크) */
const INLINE_MARK = /\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)/;

/** 웹 페이지에서 복사한 것처럼 블록이 HTML 로 이미 갖춰진 붙여넣기 */
const SEMANTIC_HTML = /<(h[1-6]|p|ul|ol|li|blockquote|table|pre)[\s>]/i;

/**
 * 붙여 넣은 글을 마크다운으로 읽을 것인가. Claude 나 노션 MCP 가 준 글을 붙이면 블록으로 서게 하려는 것이다.
 *
 * ⚠ **HTML 에 블록이 갖춰져 있으면 그것을 쓴다.** 웹 페이지에서 복사한 글은 HTML 이 더 정확하다. 코드 편집기처럼 HTML 이
 *    꾸밈뿐(`<span>`)인 곳에서 복사한 마크다운은 글을 읽는다.
 */
export const readsAsMarkdown = (text: string, html: string): boolean =>
    text.trim() !== "" && !SEMANTIC_HTML.test(html) && (BLOCK_MARK.test(text) || INLINE_MARK.test(text));

/** 글을 편집기의 문서로 읽었다가 다시 글로 쓴다. 저장과 열기를 한 번 오간 글이다 */
export const roundTrip = (body: string): string => serializeBody(parseBody(body));
