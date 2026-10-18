"use client";

import "./block-editor.css";

import { useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { Placeholder } from "@tiptap/extensions";
import { TextSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

import { Button } from "@hathway/ui/components/button";
import { Bold, Code, Italic, Link as LinkIcon } from "@hathway/ui/icons";
import { cn } from "@hathway/ui/lib/utils";

import { BlockLayer } from "./BlockLayer";
import { readsAsMarkdown, serializeBody } from "./format";
import { blockEditorLabels, type BlockEditorLabels } from "./labels";
import { blockEditorExtensions } from "./schema";
import { SlashCommand } from "./SlashMenu";

/** 호출부가 편집기에 거는 손잡이 */
export interface BlockEditorHandle
{
    /** 본문 맨 앞에 커서를 둔다. 제목 칸에서 Enter 를 누르면 부른다 */
    readonly focusStart: () => void;
    /**
     * 지금의 본문(노션 enhanced markdown). 끝의 빈 줄은 걷는다.
     *
     * ⚠ 화면을 떠날 때는 이 손잡이가 호출부의 정리(effect cleanup)보다 먼저 풀린다. 떠나며 저장하려면 `onChange` 가 넘긴 함수를
     *    쥐어 두고 그것으로 읽는다.
     */
    readonly getBody: () => string;
}

export interface BlockEditorProps
{
    /** 처음 여는 본문(노션 enhanced markdown). 열린 뒤에 바꿔도 편집기는 다시 읽지 않는다 */
    readonly defaultValue: string;
    /** `read` 면 고칠 수 없고 손잡이 · 메뉴가 서지 않는다 */
    readonly mode?: "edit" | "read";
    /**
     * 글이 바뀔 때마다 부른다. 본문을 글로 바꾸는 일이 가볍지 않아 값 대신 읽는 함수를 넘긴다. 저장할 때 한 번 부르면 된다.
     */
    readonly onChange?: (getBody: () => string) => void;
    /** 편집기가 선 뒤 한 번 부른다. 연 본문을 한 번 글로 바꾼 값을 저장의 기준으로 삼을 때 쓴다 */
    readonly onReady?: (getBody: () => string) => void;
    readonly labels?: Partial<BlockEditorLabels>;
    readonly className?: string;
    readonly ref?: Ref<BlockEditorHandle>;
}

/** 편집기의 글. 들여쓰기를 탭으로 적으려고 `serializeBody` 를 지난다 */
const bodyOf = (editor: Editor): string => serializeBody(editor.getJSON()).replace(/\s+$/, "");

/**
 * 노션 같은 블록 편집기. 본문은 노션 enhanced markdown 으로 열고 닫는다.
 *
 * 하는 일: `/` 블록 메뉴 · 글자 메뉴(굵게 · 기울임 · 취소선 · 코드 · 링크) · 줄마다의 손잡이와 「+」 · 블록 메뉴(지우기 · 복제 · 바꾸기) ·
 * 끌어 옮기기(깊이는 마우스의 가로 위치) · 범위 선택 · Tab 과 Shift+Tab 들여쓰기 · 마크다운 붙여넣기.
 *
 * ⚠ **값을 갖지 않는다(비제어).** 저장은 호출부가 `onChange` 로 때를 받아 한다. 편집기가 다시 읽어야 하면(다른 문서를 열 때)
 *    `key` 를 바꿔 새로 세운다.
 * ⚠ **블록 모양은 `block-editor.css` 한 곳에 있다.** 편집기 안의 요소는 tiptap 이 그려서 클래스를 달 수 없으므로 이 블록만 CSS 파일을
 *    갖는다. 값은 loam 의 읽는 문서 조판(`--typeset-doc-*`)을 읽는다.
 */
export function BlockEditor({ defaultValue, mode = "edit", onChange, onReady, labels: over, className, ref }: BlockEditorProps)
{
    const labels = useMemo(() => blockEditorLabels(over), [over]);
    const frame = useRef<HTMLDivElement | null>(null);
    const current = useRef<Editor | null>(null);
    // 편집기는 처음 받은 콜백을 쥐고 있으므로 늘 마지막 것을 부르도록 거쳐 부른다
    const listeners = useRef({ onChange, onReady });
    const editable = mode === "edit";

    useEffect(() =>
    {
        listeners.current = { onChange, onReady };
    });
    // 확장은 편집기를 세울 때 한 번만 읽는다. 문구가 바뀌어도 편집기를 다시 세우지 않는다
    const [extensions] = useState(() => [
        ...blockEditorExtensions(labels),
        Placeholder.configure({
            placeholder: ({ node }) => (node.type.name === "heading" ? labels.headingPlaceholder(Number(node.attrs["level"] ?? 1)) : labels.placeholder),
            includeChildren: false,
        }),
        SlashCommand.configure({ labels }),
    ]);

    const editor = useEditor({
        extensions,
        content: defaultValue,
        contentType: "markdown",
        editable,
        immediatelyRender: false,
        editorProps: {
            attributes: { "aria-label": labels.content },
            // Claude 나 노션에서 가져온 마크다운을 붙이면 글이 아니라 블록으로 세운다
            handlePaste: (view, event) =>
            {
                const text = event.clipboardData?.getData("text/plain") ?? "";
                const html = event.clipboardData?.getData("text/html") ?? "";

                if (!readsAsMarkdown(text, html) || current.current === null)
                {
                    return false;
                }

                current.current.commands.insertContent(text, { contentType: "markdown" });
                view.focus();

                return true;
            },
        },
        onCreate: ({ editor: created }) =>
        {
            current.current = created;
            listeners.current.onReady?.(() => bodyOf(created));
        },
        onUpdate: ({ editor: changed }) => listeners.current.onChange?.(() => bodyOf(changed)),
    });

    useImperativeHandle(ref, () => ({
        focusStart: () =>
        {
            // tiptap 의 focus 는 다음 그림 차례(requestAnimationFrame)에 옮긴다. 창이 가려져 있으면 그 차례가 늦으므로 바로도 옮긴다
            editor?.commands.focus("start");
            editor?.view.focus();
        },
        getBody: () => (editor === null ? defaultValue : bodyOf(editor)),
    }), [editor, defaultValue]);

    return (
        <div ref={frame} className={cn("relative", className)}>
            {editor === null || !editable
                ? null
                : (
                    <>
                        <FormatMenu editor={editor} labels={labels} />
                        <BlockLayer editor={editor} frame={frame} labels={labels} />
                    </>
                )}
            <EditorContent editor={editor} className="block-editor" />
        </div>
    );
}

/**
 * 글자를 고르면 뜨는 메뉴. 굵게 · 기울임 · 취소선 · 코드 · 링크. 마크다운으로 저장되는 꾸밈만 둔다(`schema.ts`).
 */
function FormatMenu({ editor, labels }: { readonly editor: Editor; readonly labels: BlockEditorLabels })
{
    const [linking, setLinking] = useState(false);
    const [href, setHref] = useState("");
    const active = useEditorState({
        editor,
        selector: ({ editor: current }) => ({
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            strike: current.isActive("strike"),
            code: current.isActive("code"),
            link: current.isActive("link"),
        }),
    });

    const applyLink = (): void =>
    {
        const value = href.trim();
        const chain = editor.chain().focus().extendMarkRange("link");

        (value === "" ? chain.unsetLink() : chain.setLink({ href: value })).run();
        setLinking(false);
        setHref("");
    };

    const mark = (name: keyof typeof active, label: string, icon: ReactNode, run: () => void) => (
        <button
            type="button"
            aria-label={label}
            aria-pressed={active[name]}
            onMouseDown={(event) => event.preventDefault()}
            onClick={run}
            className={cn("inline-flex size-8 items-center justify-center rounded-md text-sm", active[name] ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
            {icon}
        </button>
    );

    return (
        <BubbleMenu
            editor={editor}
            options={{ placement: "top" }}
            // 글자를 고를 때만 선다. 손잡이로 블록을 통째로 골랐을 때(NodeSelection)는 글자 꾸밈이 뜻이 없다
            shouldShow={({ state, editor: current }) => current.isEditable && !state.selection.empty && state.selection instanceof TextSelection}
            className="z-50 flex items-center gap-0.5 rounded-xl border border-border bg-popover p-1 shadow-lg">
            {linking
                ? (
                    <form
                        className="flex items-center gap-1"
                        onSubmit={(event) =>
                        {
                            event.preventDefault();
                            applyLink();
                        }}
                    >
                        <input
                            autoFocus
                            value={href}
                            onChange={(event) => setHref(event.target.value)}
                            onKeyDown={(event) =>
                            {
                                if (event.key === "Escape")
                                {
                                    setLinking(false);
                                }
                            }}
                            placeholder="https://"
                            aria-label={labels.linkAddress}
                            className="h-8 w-56 rounded-md bg-transparent px-2 text-sm outline-none"
                        />
                        <Button type="submit" size="sm" variant="ghost">{labels.linkApply}</Button>
                    </form>
                )
                : (
                    <>
                        {mark("bold", labels.bold, <Bold className="size-4" aria-hidden />, () => editor.chain().focus().toggleBold().run())}
                        {mark("italic", labels.italic, <Italic className="size-4" aria-hidden />, () => editor.chain().focus().toggleItalic().run())}
                        {mark("strike", labels.strike, <span className="text-sm line-through">S</span>, () => editor.chain().focus().toggleStrike().run())}
                        {mark("code", labels.code, <Code className="size-4" aria-hidden />, () => editor.chain().focus().toggleCode().run())}
                        {mark("link", labels.link, <LinkIcon className="size-4" aria-hidden />, () =>
                        {
                            if (active.link)
                            {
                                editor.chain().focus().extendMarkRange("link").unsetLink().run();

                                return;
                            }

                            setHref(String(editor.getAttributes("link")["href"] ?? ""));
                            setLinking(true);
                        })}
                    </>
                )}
        </BubbleMenu>
    );
}
