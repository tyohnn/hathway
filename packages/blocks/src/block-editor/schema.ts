import type { AnyExtension } from "@tiptap/core";
import { DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Markdown } from "@tiptap/markdown";
import { StarterKit } from "@tiptap/starter-kit";

import { BlockIndent } from "./indent";
import { BLOCK_EDITOR_LABELS, type BlockEditorLabels } from "./labels";
import { Callout, NotionDetails } from "./notion";

/**
 * 블록 편집기의 블록과 글자 꾸밈. 화면의 편집기(`BlockEditor`)와 글을 오가는 일(`format.ts`)이 같은 목록을 쓴다.
 *
 * 블록: 문단 · 제목 1~3 · 글머리 목록 · 번호 목록 · 할 일 · 인용 · 코드 · 구분선 · 토글 · 콜아웃. 맨 바깥 블록은 들여 써서
 * 앞 블록의 안쪽 블록이 된다(`indent.ts`).
 * 글자: 굵게 · 기울임 · 취소선 · 코드 · 링크.
 *
 * ⚠ **마크다운에 없는 꾸밈은 켜지 않는다.** 밑줄은 노션 꼴로는 `<span underline>` 인데 지금은 그 꼴을 읽지 않으므로 꺼 둔다.
 *    켜면 저장할 때 조용히 사라진다.
 */
export const blockEditorExtensions = (labels: BlockEditorLabels = BLOCK_EDITOR_LABELS): Array<AnyExtension> => [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
    }),
    TaskList,
    TaskItem.configure({
        nested: true,
        // 화면 읽기 프로그램이 읽는 상자의 이름. 기본값은 영어다
        a11y: { checkboxLabel: (node, checked) => `${checked ? labels.taskDone : labels.taskOpen}: ${node.textContent || labels.taskEmpty}` },
    }),
    // 펼침 상태는 문서에 남기지 않는다. 노션 꼴의 글에 그 자리가 없고, 남기면(persist) tiptap 의 펼침 표시가 상태와 엇갈리는 때가 있었다
    NotionDetails.configure({ persist: false, HTMLAttributes: { class: "block-editor-details" } }),
    DetailsSummary,
    DetailsContent,
    Callout,
    BlockIndent,
    Markdown.configure({ indentation: { style: "space", size: 2 } }),
];
