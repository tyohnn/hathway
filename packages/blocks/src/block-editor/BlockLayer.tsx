"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { TextSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@hathway/ui/components/dropdown-menu";

import { kindHint, TURN_INTO_KINDS } from "./kinds";
import type { BlockEditorLabels } from "./labels";
import { copyBlocks, deleteBlocks, duplicateBlocks, insertBelow, moveBlocks, turnInto } from "./ops";
import { collectRows, dropAt, outermost, rowAt, stepSelection, type BlockRow, type DropTarget, type KeySelection } from "./rows";

/**
 * 노션처럼 블록을 다루는 층. 편집기 위에 겹쳐 서서 다섯 가지를 맡는다.
 *
 * 1. **손잡이와 「+」.** 마우스가 있는 높이의 블록(줄) 왼쪽에 「+」와 여섯 점 손잡이가 선다. 블록 위든, 줄 사이 여백이든, 글머리 기호
 *    위든, 블록 왼쪽 여백이든 그 높이의 줄이 잡힌다(`rows.ts`). 「+」는 그 줄 아래에 새 블록을 넣고 `/` 메뉴를 연다.
 * 2. **블록 메뉴.** 손잡이를 누르면(끌지 않고) 그 블록이 골라지고 메뉴(지우기 · 복제 · 바꾸기)가 뜬다. 「바꾸기」는 옆으로 펴지는
 *    아래 메뉴다. 여러 블록을 고른 채 누르면 고른 블록 모두에 건다.
 * 3. **끌어 놓기.** 손잡이를 끌면 놓을 자리에 선이 서고, 놓으면 고른 블록(들)이 그 자리로 옮겨진다. 깊이는 마우스의 가로 위치로
 *    고른다(`dropAt`).
 * 4. **범위 선택.** 글 밖(블록 왼쪽 여백 · 아래 빈 곳)에서 끌면 네모가 그려지고 그 높이의 블록들이 골라진다.
 * 5. **글 안에서 여러 블록에 걸쳐 끌기.** 한 블록 안에서는 글자를 고르고, 다른 블록으로 넘어가면 노션처럼 블록 선택으로 바뀐다.
 *
 * 글을 쓰다 Esc 를 누르면 커서가 있는 블록이 골라진다. 고른 블록은 Backspace · Delete 로 지우고, ⌘C · ⌘X 로 노션 꼴 글로 복사하고 잘라 내고, ⌘D 로 복제한다. Esc 나 다른 곳을 누르면 풀린다.
 *
 * ⚠ **끌어 놓기는 브라우저의 끌어 놓기(HTML5 drag)를 쓰지 않는다.** 놓는 자리를 편집기가 어림잡아 엉뚱한 곳에 놓이기도 했고,
 *    브라우저의 끌기는 안쪽 목록이 있는 문서에서 멈추기도 했다(2026-10-09 시험). 포인터를 직접 따라간다. 4px 넘게 움직이지 않으면
 *    누르기(메뉴)다.
 * ⚠ **고른 블록은 자리(pos)로 쥔다.** 문서가 바뀌면 자리가 어긋나므로 선택을 푼다.
 */
// 손잡이 · 「+」 왼쪽으로도 범위 선택을 시작할 빈 곳이 남도록 넉넉히 듣는다
const GUTTER = 140;
const HIDE_DELAY = 300;

interface Box
{
    readonly top: number;
    readonly left: number;
    readonly width: number;
    readonly height: number;
}

/** 자리들에 해당하는 줄(문서 차례). 문서가 바뀌어 없어진 자리는 뺀다 */
const rowsAt = (rows: ReadonlyArray<BlockRow>, positions: ReadonlyArray<number>): ReadonlyArray<BlockRow> =>
    rows.filter((row) => positions.includes(row.pos));

interface BlockLayerProps
{
    readonly editor: Editor;
    /** 편집기를 감싼 틀. 겹쳐 그리는 것의 좌표가 이 틀 기준이다 */
    readonly frame: RefObject<HTMLDivElement | null>;
    readonly labels: BlockEditorLabels;
}

export function BlockLayer({ editor, frame, labels }: BlockLayerProps)
{
    const [hovered, setHovered] = useState<BlockRow | null>(null);
    const [selected, setSelected] = useState<ReadonlyArray<number>>([]);
    const [drop, setDrop] = useState<DropTarget | null>(null);
    const [marquee, setMarquee] = useState<{ readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number } | null>(null);
    const [ghost, setGhost] = useState<{ readonly x: number; readonly y: number; readonly label: string } | null>(null);
    const [menu, setMenu] = useState<{ readonly top: number } | null>(null);
    const [, redraw] = useState(0);
    /** 끄는 중인가. 끌기 전에는 `false` 다 */
    const dragging = useRef(false);
    /** 손잡이를 누른 자리와 끌 블록들. 고른 블록 위의 손잡이를 누르면 고른 블록 모두를 끈다 */
    const press = useRef<{ x: number; y: number; positions: ReadonlyArray<number>; top: number } | null>(null);
    const marqueeStart = useRef<{ x: number; y: number } | null>(null);
    /** 글 안에서 누른 줄. 다른 줄로 넘어가면 블록 선택으로 바뀐다 */
    const textAnchor = useRef<{ pos: number; blockMode: boolean } | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** 키보드로 옮기는 선택의 처음 줄과 지금 줄. Esc 로 고른 때부터 위 · 아래 화살표가 이어 쓴다 */
    const keySelection = useRef<KeySelection | null>(null);
    const view = editor.view;

    /** 화면 좌표를 이 층(편집기 틀) 안의 좌표로 */
    const local = useCallback((x: number, y: number): { x: number; y: number } =>
    {
        const box = frame.current?.getBoundingClientRect();

        return box === undefined ? { x, y } : { x: x - box.left, y: y - box.top };
    }, [frame]);

    /** 마우스가 손잡이 · 범위 선택이 듣는 자리(편집기 틀과 왼쪽 여백)에 있는가 */
    const withinZone = useCallback((x: number, y: number, rows: ReadonlyArray<BlockRow>): boolean =>
    {
        const box = frame.current?.getBoundingClientRect();

        if (box === undefined || rows.length === 0)
        {
            return false;
        }

        const top = Math.min(box.top, rows[0]?.top ?? box.top) - 12;
        const bottom = Math.max(box.bottom, rows.at(-1)?.fullBottom ?? box.bottom) + 12;

        return x >= box.left - GUTTER && x <= box.right + 24 && y >= top && y <= bottom;
    }, [frame]);

    const keep = useCallback((): void =>
    {
        if (hideTimer.current !== null)
        {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
    }, []);

    // 1. 손잡이: 마우스가 있는 높이의 줄을 따라간다
    useEffect(() =>
    {
        const move = (event: MouseEvent): void =>
        {
            if (!editor.isEditable || dragging.current || marqueeStart.current !== null || menu !== null)
            {
                return;
            }

            const rows = collectRows(view);

            if (!withinZone(event.clientX, event.clientY, rows))
            {
                if (hideTimer.current === null)
                {
                    hideTimer.current = setTimeout(() =>
                    {
                        hideTimer.current = null;
                        setHovered(null);
                    }, HIDE_DELAY);
                }

                return;
            }

            keep();

            const row = rowAt(rows, event.clientY);

            setHovered((current) => (current?.pos === row?.pos && current?.top === row?.top ? current : row));
        };

        document.addEventListener("mousemove", move);

        return () =>
        {
            keep();
            document.removeEventListener("mousemove", move);
        };
    }, [editor, view, withinZone, keep, menu]);

    // 2 · 3. 손잡이를 누른 채 움직이면 끌기, 움직이지 않고 떼면 블록 메뉴
    useEffect(() =>
    {
        const stop = (): void =>
        {
            press.current = null;
            dragging.current = false;
            document.body.classList.remove("block-editor-dragging");
            setGhost(null);
            setDrop(null);
        };

        const follow = (event: PointerEvent): void =>
        {
            const pressed = press.current;

            if (pressed === null)
            {
                return;
            }

            if (!dragging.current)
            {
                if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < 4)
                {
                    return;
                }

                // 끌기가 시작되었다
                dragging.current = true;
                setSelected(pressed.positions);
                setMenu(null);
                document.body.classList.add("block-editor-dragging");
            }

            event.preventDefault();

            const rows = collectRows(view);
            const sources = rowsAt(rows, pressed.positions);
            const label = sources.length === 1 ? (sources[0]?.node.textContent.slice(0, 40) ?? "") : labels.dragCount(sources.length);

            setGhost({ x: event.clientX, y: event.clientY, label });
            setDrop(withinZone(event.clientX, event.clientY, rows) ? dropAt(rows, sources, event.clientX, event.clientY) : null);
        };

        const release = (event: PointerEvent): void =>
        {
            const pressed = press.current;

            if (pressed === null)
            {
                return;
            }

            const wasDragging = dragging.current;

            stop();

            if (!wasDragging)
            {
                // 움직이지 않았으면 누르기다. 누른 블록(들)을 고르고 블록 메뉴를 연다
                setSelected(pressed.positions);
                setMenu({ top: pressed.top });

                return;
            }

            const rows = collectRows(view);
            const sources = rowsAt(rows, pressed.positions);
            const target = withinZone(event.clientX, event.clientY, rows) ? dropAt(rows, sources, event.clientX, event.clientY) : null;

            if (target !== null && sources.length > 0)
            {
                moveBlocks(editor, sources, target);
            }
        };

        const cancel = (event: KeyboardEvent): void =>
        {
            if (event.key === "Escape" && press.current !== null)
            {
                stop();
            }
        };

        document.addEventListener("pointermove", follow);
        document.addEventListener("pointerup", release);
        document.addEventListener("keydown", cancel, true);

        return () =>
        {
            document.removeEventListener("pointermove", follow);
            document.removeEventListener("pointerup", release);
            document.removeEventListener("keydown", cancel, true);
            document.body.classList.remove("block-editor-dragging");
        };
    }, [editor, view, withinZone, labels]);

    // 4 · 5. 글 밖에서 끌면 네모로, 글 안에서 다른 블록으로 넘어가면 블록 선택으로
    useEffect(() =>
    {
        const down = (event: MouseEvent): void =>
        {
            if (event.button !== 0 || !editor.isEditable || !(event.target instanceof Element))
            {
                return;
            }

            // 손잡이 · 「+」 · 블록 메뉴를 누르면 고른 블록을 그대로 둔다
            if (event.target.closest("[data-block-layer-control]") !== null)
            {
                return;
            }

            setSelected([]);
            setMenu(null);

            const rows = collectRows(view);
            const inText = view.dom.contains(event.target);
            const onControl = event.target.closest("button, a, input, textarea, [role='menu'], [role='listbox']") !== null;

            if (inText)
            {
                const row = rowAt(rows, event.clientY);

                textAnchor.current = row === null ? null : { pos: row.pos, blockMode: false };

                return;
            }

            if (onControl || !withinZone(event.clientX, event.clientY, rows))
            {
                return;
            }

            event.preventDefault();
            marqueeStart.current = { x: event.clientX, y: event.clientY };
            setHovered(null);
            view.dom.blur();
        };

        const drag = (event: MouseEvent): void =>
        {
            const anchor = textAnchor.current;

            if (anchor !== null && (event.buttons & 1) === 1)
            {
                const rows = collectRows(view);
                const row = rowAt(rows, event.clientY);
                const from = rows.findIndex((each) => each.pos === anchor.pos);
                const to = row === null ? -1 : rows.indexOf(row);

                if (from === -1 || to === -1 || row?.pos === anchor.pos)
                {
                    // 같은 블록 안이면 글자 고르기다
                    if (anchor.blockMode)
                    {
                        anchor.blockMode = false;
                        view.dom.classList.remove("block-editor-block-mode");
                        setSelected([]);
                    }

                    return;
                }

                anchor.blockMode = true;
                view.dom.classList.add("block-editor-block-mode");
                setSelected(outermost(rows.slice(Math.min(from, to), Math.max(from, to) + 1)).map((each) => each.pos));

                return;
            }

            const start = marqueeStart.current;

            if (start === null)
            {
                return;
            }

            const rows = collectRows(view);
            const top = Math.min(start.y, event.clientY);
            const bottom = Math.max(start.y, event.clientY);

            setMarquee({ x0: start.x, y0: start.y, x1: event.clientX, y1: event.clientY });
            setSelected(outermost(rows.filter((row) => row.top < bottom && row.bottom > top)).map((row) => row.pos));
        };

        const up = (): void =>
        {
            const anchor = textAnchor.current;

            textAnchor.current = null;

            if (anchor?.blockMode === true)
            {
                // 글자 고르기를 접고 블록 선택만 남긴다. 키는 블록 선택이 받는다
                view.dom.classList.remove("block-editor-block-mode");
                view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(Math.min(anchor.pos + 1, view.state.doc.content.size)))));
                view.dom.blur();
            }

            if (marqueeStart.current !== null)
            {
                marqueeStart.current = null;
                setMarquee(null);
            }
        };

        document.addEventListener("mousedown", down, true);
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", up);

        return () =>
        {
            document.removeEventListener("mousedown", down, true);
            document.removeEventListener("mousemove", drag);
            document.removeEventListener("mouseup", up);
        };
    }, [editor, view, withinZone]);

    // 글을 쓰다 Esc 를 누르면 커서가 있는 블록이 골라진다(노션처럼). 그다음 키(지우기 · 복사 · 옮기기)는 블록에 건다
    useEffect(() =>
    {
        const escape = (event: KeyboardEvent): void =>
        {
            if (event.key !== "Escape" || event.isComposing || !editor.isEditable || !(event.target instanceof Node) || !view.dom.contains(event.target))
            {
                return;
            }

            // `/` 메뉴가 열려 있으면 Esc 는 그 메뉴를 닫는다
            if (document.querySelector("[data-slash-menu]") !== null)
            {
                return;
            }

            const at = view.state.selection.$from.pos;
            // 커서를 품은 줄 가운데 가장 안쪽 줄. 맨 바깥 줄은 들여 쓴 안쪽 블록이 아니라 제 노드만 본다
            const row = collectRows(view)
                .filter((each) => at > each.pos && at < each.pos + each.node.nodeSize)
                .reduce<BlockRow | null>((inner, each) => (inner === null || each.pos > inner.pos ? each : inner), null);

            if (row === null)
            {
                return;
            }

            // 편집기의 다른 Esc 처리보다 먼저 받는다(뒤에서 받으면 이미 처리된 것으로 막혀 있었다)
            event.preventDefault();
            event.stopPropagation();
            keySelection.current = { anchor: row.pos, focus: row.pos };
            setSelected([row.pos]);
            setMenu(null);
            view.dom.blur();
            window.getSelection()?.removeAllRanges();
        };

        document.addEventListener("keydown", escape, true);

        return () => document.removeEventListener("keydown", escape, true);
    }, [editor, view]);

    // 고른 블록을 지우고, 복사하고, 잘라 내고, 복제한다
    useEffect(() =>
    {
        if (selected.length === 0)
        {
            return undefined;
        }

        const key = (event: KeyboardEvent): void =>
        {
            const modifier = event.metaKey || event.ctrlKey;
            const rows = (): ReadonlyArray<BlockRow> => rowsAt(collectRows(view), selected);

            if (event.key === "Escape")
            {
                setSelected([]);
                setMenu(null);

                return;
            }

            if (event.target instanceof HTMLElement && event.target.closest("[data-block-menu]") !== null && event.key !== "Backspace" && event.key !== "Delete")
            {
                // 블록 메뉴 안의 단추는 키보드로도 누른다
                return;
            }

            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !modifier && !event.altKey)
            {
                // 위 · 아래로 고른 줄을 옮긴다. Shift 면 처음 고른 줄부터 여럿을 고른다
                event.preventDefault();
                event.stopPropagation();

                const all = collectRows(view);
                const picked = all.filter((row) => selected.includes(row.pos));
                const kept = keySelection.current;
                // 마우스로 다시 골랐으면 키보드의 처음 · 지금 줄은 지난 것이다. 지금 고른 블록 안에 있을 때만 이어 쓴다
                const covered = (pos: number): boolean => picked.some((row) => pos >= row.pos && pos < row.end);
                const valid = kept !== null && covered(kept.focus) && covered(kept.anchor);
                const down = event.key === "ArrowDown";
                const edge = (down ? picked.at(-1) : picked[0])?.pos ?? selected[0] ?? 0;
                const next = stepSelection(all, valid ? kept : { anchor: picked[0]?.pos ?? edge, focus: edge }, down ? "down" : "up", event.shiftKey);

                keySelection.current = { anchor: next.anchor, focus: next.focus };
                setSelected(next.selected);
                setMenu(null);
                all.find((row) => row.pos === next.focus)?.element.scrollIntoView({ block: "nearest" });

                return;
            }

            if (event.key === "Backspace" || event.key === "Delete")
            {
                event.preventDefault();
                event.stopPropagation();
                deleteBlocks(editor, rows());
                setSelected([]);
                setMenu(null);

                return;
            }

            if (modifier && (event.key === "c" || event.key === "x" || event.key === "d"))
            {
                event.preventDefault();
                event.stopPropagation();

                if (event.key === "d")
                {
                    duplicateBlocks(editor, rows());

                    return;
                }

                void copyBlocks(editor, rows());

                if (event.key === "x")
                {
                    deleteBlocks(editor, rows());
                    setSelected([]);
                }

                return;
            }

            if (!["Shift", "Meta", "Control", "Alt"].includes(event.key))
            {
                setSelected([]);
                setMenu(null);
            }
        };

        document.addEventListener("keydown", key, true);

        return () => document.removeEventListener("keydown", key, true);
    }, [editor, view, selected]);

    // 문서가 바뀌면 고른 자리가 어긋나므로 풀고, 화면이 움직이면 겹쳐 그린 것을 다시 잰다
    useEffect(() =>
    {
        const changed = ({ transaction }: { transaction: { docChanged: boolean } }): void =>
        {
            if (transaction.docChanged)
            {
                setSelected([]);
                setHovered(null);
                setMenu(null);
            }
        };
        const remeasure = (): void => redraw((tick) => tick + 1);

        editor.on("transaction", changed);
        window.addEventListener("scroll", remeasure, true);
        window.addEventListener("resize", remeasure);

        return () =>
        {
            editor.off("transaction", changed);
            window.removeEventListener("scroll", remeasure, true);
            window.removeEventListener("resize", remeasure);
        };
    }, [editor]);

    const grab = (event: ReactPointerEvent<HTMLButtonElement>): void =>
    {
        if (hovered === null || event.button !== 0)
        {
            return;
        }

        // 글자 고르기 · 포커스 이동을 막고 끌기를 기다린다
        event.preventDefault();
        press.current = {
            x: event.clientX,
            y: event.clientY,
            positions: selected.includes(hovered.pos) ? selected : [hovered.pos],
            top: local(0, hovered.top).y,
        };
    };

    /** 블록 메뉴의 한 줄을 누른다. 고른 블록에 걸고 메뉴를 닫는다 */
    const act = (run: (rows: ReadonlyArray<BlockRow>) => void): void =>
    {
        const rows = rowsAt(collectRows(view), selected);

        setMenu(null);
        setSelected([]);

        if (rows.length > 0)
        {
            run(rows);
        }
    };

    if (!editor.isEditable)
    {
        return null;
    }

    const column = frame.current?.getBoundingClientRect().width ?? 0;
    const rows = selected.length === 0 ? [] : collectRows(view);
    const highlights: ReadonlyArray<Box> = rows
        .filter((row) => selected.includes(row.pos))
        .map((row) =>
        {
            // 안쪽 줄도 바깥 줄과 같은 너비다. 편집기 단의 왼쪽 끝부터 오른쪽 끝까지 덮는다(2026-10-09 사용자)
            const at = local(0, row.top);

            return { top: at.y - 2, left: -6, width: column + 12, height: row.fullBottom - row.top + 4 };
        });

    return (
        <div className="pointer-events-none absolute inset-0 z-10">
            {highlights.map((box, index) => (
                <div key={index} className="block-editor-block-selected absolute" style={box} />
            ))}
            {marquee === null
                ? null
                : (() =>
                {
                    const a = local(Math.min(marquee.x0, marquee.x1), Math.min(marquee.y0, marquee.y1));

                    return (
                        <div
                            className="block-editor-marquee absolute"
                            style={{ top: a.y, left: a.x, width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }}
                        />
                    );
                })()}
            {drop === null
                ? null
                : (() =>
                {
                    const at = local(drop.lineLeft, drop.lineY);
                    const width = (frame.current?.getBoundingClientRect().right ?? 0) - drop.lineLeft;

                    return <div data-testid="block-drop-line" className="block-editor-drop-line absolute" style={{ top: at.y - 2, left: at.x, width }} />;
                })()}
            {ghost === null
                ? null
                : (() =>
                {
                    const at = local(ghost.x, ghost.y);

                    return <div className="block-editor-drag-ghost absolute" style={{ top: at.y + 8, left: at.x + 12 }}>{ghost.label === "" ? labels.dragFallback : ghost.label}</div>;
                })()}
            {hovered === null || marquee !== null || ghost !== null
                ? null
                : (() =>
                {
                    // 「+」와 손잡이는 깊이와 상관없이 모든 줄에서 같은 세로줄(편집기 단의 왼쪽)에 선다(2026-10-09 사용자)
                    const at = local(0, hovered.top);

                    return (
                        <>
                            <button
                                type="button"
                                data-block-layer-control
                                aria-label={labels.addBelow}
                                onMouseEnter={keep}
                                onPointerDown={(event) => event.preventDefault()}
                                onClick={() => insertBelow(editor, hovered)}
                                style={{ top: at.y, left: -58 }}
                                className="block-editor-drag-handle block-editor-add-block pointer-events-auto absolute"
                            >
                                <Plus />
                            </button>
                            <button
                                type="button"
                                data-block-layer-control
                                aria-label={labels.moveBlock}
                                aria-haspopup="menu"
                                onMouseEnter={keep}
                                onPointerDown={grab}
                                style={{ top: at.y, left: -32 }}
                                className="block-editor-drag-handle pointer-events-auto absolute"
                            >
                                <Grip />
                            </button>
                        </>
                    );
                })()}
            {menu === null
                ? null
                : (
                    // 메뉴는 프리미티브(Base UI)가 연다. 여는 때는 손잡이의 누르기가 정하므로 열림을 이쪽이 쥐고, 메뉴는 손잡이 자리의 빈 단추에 붙인다
                    <DropdownMenu
                        open
                        onOpenChange={(open) =>
                        {
                            if (!open)
                            {
                                setMenu(null);
                                setSelected([]);
                            }
                        }}
                    >
                        <DropdownMenuTrigger
                            render={<button type="button" tabIndex={-1} aria-hidden data-block-layer-control />}
                            style={{ top: menu.top, left: -32, width: 24, height: 28 }}
                            className="pointer-events-none absolute opacity-0"
                        />
                        <DropdownMenuContent aria-label={labels.blockMenu} data-block-layer-control data-block-menu className="w-56">
                            <DropdownMenuItem onClick={() => act((rows) => deleteBlocks(editor, rows))}>
                                {labels.delete}
                                <DropdownMenuShortcut aria-hidden>Del</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act((rows) => duplicateBlocks(editor, rows))}>
                                {labels.duplicate}
                                <DropdownMenuShortcut aria-hidden>⌘D</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>{labels.turnInto}</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent aria-label={labels.turnInto} data-block-layer-control data-block-menu className="w-52">
                                    {TURN_INTO_KINDS.map((item) => (
                                        <DropdownMenuItem key={item.kind} onClick={() => act((rows) => turnInto(editor, rows, item.kind))}>
                                            {labels.kinds[item.kind]}
                                            {kindHint(item, labels) === "" ? null : <DropdownMenuShortcut aria-hidden>{kindHint(item, labels)}</DropdownMenuShortcut>}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
        </div>
    );
}

/** 여섯 점 손잡이. 아이콘 묶음에 없어서 그린다 */
function Grip()
{
    return (
        <svg aria-hidden viewBox="0 0 10 16" className="h-4 w-2.5" fill="currentColor">
            {[2, 8, 14].flatMap((y) => [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.4} />))}
        </svg>
    );
}

/** 더하기. 손잡이와 같은 굵기로 그린다 */
function Plus()
{
    return (
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
        </svg>
    );
}
