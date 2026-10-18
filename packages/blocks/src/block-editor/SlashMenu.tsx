"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import { Suggestion, type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";

import { cn } from "@hathway/ui/lib/utils";

import { applyKind, kindHint, kindsMatching, type BlockKindItem } from "./kinds";
import { BLOCK_EDITOR_LABELS, type BlockEditorLabels } from "./labels";

/**
 * `/` 블록 메뉴. 노션처럼 빈 자리에서 `/` 를 누르면 블록을 고르는 목록이 뜨고, 이어 친 글자로 거른다.
 *
 * ⚠ **고르면 친 `/…` 를 지우고 블록을 바꾼다.** 지우지 않으면 본문에 `/제목` 같은 글자가 남는다.
 * ⚠ 블록의 종류와 바꾸는 명령은 손잡이의 「바꾸기」 메뉴와 같은 것을 쓴다(`kinds.ts`).
 */
type SlashItem = BlockKindItem;

interface SlashListHandle
{
    readonly onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

type SlashListProps = SuggestionProps<SlashItem> & { readonly labels: BlockEditorLabels; readonly ref?: Ref<SlashListHandle> };

function SlashList({ items, command, labels, ref }: SlashListProps)
{
    const [active, setActive] = useState(0);
    const latest = useRef({ items, active, command });
    // 목록이 새 배열로 와도 고를 거리가 같으면 고른 자리를 지킨다. 한글을 조합하다 끝낼 때마다 목록이 다시 와서 첫 줄로 돌아갔다
    const kinds = items.map((item) => item.kind).join(" ");

    useEffect(() => setActive(0), [kinds]);

    useEffect(() =>
    {
        latest.current = { items, active, command };
    });

    // 키는 아래의 문서 잡기 단계가 모두 받는다. 편집기 쪽 손잡이는 Esc 만 넘긴다
    useImperativeHandle(ref, () => ({ onKeyDown: () => false }), []);

    /**
     * 화살표와 Enter 는 편집기보다 먼저 문서의 잡기 단계에서 받는다.
     *
     * ⚠ **한글을 조합하는 중과 그 직후에는 편집기(ProseMirror)가 키를 받지 않는다.** `/텍스` 의 「스」를 조합하는 동안, 그리고
     *    조합이 끝나고 20ms 동안 편집기는 아직 조합 중으로 치고 키를 흘려보낸다. 그래서 화살표가 목록 대신 커서를 옮겼고 Enter 는
     *    조합을 끝내는 데 쓰였다(2026-10-09 사용자, 조합 중의 키만 받았던 첫 고침으로는 그 직후의 키를 놓쳤다).
     * ⚠ Enter 는 조합이 끝나고 편집기가 마지막 글자를 받은 뒤에 고른다. 먼저 고르면 지우는 범위(`/텍스`)가 마지막 글자를 빠뜨린다.
     */
    useEffect(() =>
    {
        let pendingEnter = false;
        let composedAt = 0;

        const choose = (): void =>
        {
            const { items: now, active: at, command: pick } = latest.current;
            const item = now[Math.min(at, now.length - 1)];

            if (item !== undefined)
            {
                pick(item);
            }
        };

        const key = (event: KeyboardEvent): void =>
        {
            const count = latest.current.items.length;
            // 입력기가 받은 키는 이름이 「Process」로 오는 때가 있어 자판의 자리(code)로도 읽는다
            const name = event.key === "Process" ? event.code.replace("NumpadEnter", "Enter") : event.key;

            // 맞는 블록이 없으면 Enter 는 편집기의 줄바꿈이다
            if ((name !== "ArrowDown" && name !== "ArrowUp" && name !== "Enter") || count === 0)
            {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (name !== "Enter")
            {
                setActive((index) => (name === "ArrowDown" ? (index + 1) % count : (index - 1 + count) % count));

                return;
            }

            if (event.isComposing)
            {
                pendingEnter = true;

                return;
            }

            // 조합이 막 끝났으면 편집기가 그 글자를 받을 때까지 기다린다
            if (Date.now() - composedAt < 100)
            {
                setTimeout(choose, 50);

                return;
            }

            choose();
        };

        const composed = (): void =>
        {
            composedAt = Date.now();

            if (pendingEnter)
            {
                pendingEnter = false;
                setTimeout(choose, 50);
            }
        };

        document.addEventListener("keydown", key, true);
        document.addEventListener("compositionend", composed, true);

        return () =>
        {
            document.removeEventListener("keydown", key, true);
            document.removeEventListener("compositionend", composed, true);
        };
    }, []);

    const list = useRef<HTMLDivElement | null>(null);

    // 키로 옮긴 줄이 목록의 보이는 자리 밖이면 그 줄까지 굴린다
    useEffect(() =>
    {
        list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active]);

    // 모양은 시스템의 메뉴(DropdownMenu)와 같은 면 · 줄이다. 고른 줄의 바탕은 accent 다. muted 는 어두운 loam 에서 면과 같은 값이라 보이지 않았다
    return (
        <div ref={list} role="listbox" aria-label={labels.slashMenu} data-slash-menu className="cn-command z-50 max-h-80 w-60 overflow-y-auto">
            {items.length === 0
                ? <p className="cn-dropdown-menu-item flex items-center text-muted-foreground">{labels.noMatch}</p>
                : items.map((item, index) => (
                    <button
                        key={item.kind}
                        type="button"
                        role="option"
                        data-index={index}
                        aria-selected={index === active}
                        // 마우스를 실제로 움직였을 때만 고른다. 키로 옮기다 목록이 굴러 마우스 밑에 다른 줄이 와도 고른 줄을 뺏지 않는다
                        onMouseMove={() => setActive(index)}
                        onMouseDown={(event) =>
                        {
                            event.preventDefault();
                            command(item);
                        }}
                        className={cn(
                            "cn-dropdown-menu-item flex w-full cursor-default items-center text-left outline-hidden select-none",
                            index === active ? "bg-accent text-accent-foreground" : null,
                        )}
                    >
                        <span>{labels.kinds[item.kind]}</span>
                        <span className="cn-dropdown-menu-shortcut ml-auto font-mono text-muted-foreground">{kindHint(item, labels)}</span>
                    </button>
                ))}
        </div>
    );
}

export const SlashCommand = Extension.create<{ readonly labels: BlockEditorLabels }>({
    name: "slashCommand",

    addOptions()
    {
        return { labels: BLOCK_EDITOR_LABELS };
    },

    addProseMirrorPlugins()
    {
        const labels = this.options.labels;

        return [
            Suggestion<SlashItem, SlashItem>({
                editor: this.editor,
                char: "/",
                startOfLine: false,
                allowSpaces: false,
                items: ({ query }) => [...kindsMatching(query, labels)],
                command: ({ editor, range, props }) =>
                {
                    editor.chain().focus().deleteRange(range).run();
                    applyKind(editor, props.kind);
                },
                render: () =>
                {
                    let component: ReactRenderer<SlashListHandle, SlashListProps> | null = null;
                    let unmount: (() => void) | null = null;

                    return {
                        onStart: (props) =>
                        {
                            component = new ReactRenderer(SlashList, { props: { ...props, labels }, editor: props.editor });
                            unmount = props.mount(component.element);
                        },
                        onUpdate: (props) => component?.updateProps({ ...props, labels }),
                        onKeyDown: (props) =>
                        {
                            if (props.event.key === "Escape")
                            {
                                return false;
                            }

                            return component?.ref?.onKeyDown(props) ?? false;
                        },
                        onExit: () =>
                        {
                            unmount?.();
                            component?.destroy();
                            component = null;
                        },
                    };
                },
            }),
        ];
    },
});
