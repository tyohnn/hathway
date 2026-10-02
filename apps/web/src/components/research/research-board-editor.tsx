"use client";

import { SidebarTrigger } from "@investment/ui/components/sidebar";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { removeBoardAction, saveBoardAction } from "@/actions/research";
import type { BoardAccess } from "@/lib/boards";
import { paths } from "@/lib/paths";
import { fitBoardGroupHeights } from "@/lib/research/document";
import type { ResearchBoard } from "@/lib/research/types";
import { researchBoardsHref } from "@/lib/nav";
import { Button } from "@investment/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@investment/ui/components/dialog";
import { ResearchBoardFlow } from "@/components/research/research-board-flow";

type SaveState = "saved" | "saving" | "error";

/**
 * 보드 하나의 화면. 고칠 수 있는 사람에게는 편집기이고 나머지에게는 읽는 화면이다.
 *
 * ⚠ **저장은 한 번에 하나만 나간다.** 저장은 열었을 때의 판을 들고 가고(INV-RESEARCH-03) 돌아온 판을 다음 저장이
 *    쓴다. 앞의 저장이 돌아오기 전에 다음 것을 보내면 스스로의 저장에 「그사이 바뀌었다」로 막힌다. 그래서 나가 있는
 *    저장이 있으면 기다렸다가 가장 새로운 모양으로 한 번 더 보낸다.
 * ⚠ **`access` 는 표시를 위한 값이다.** 쓰기를 여는 것은 서버의 관문이다. 고칠 수 없는 사람의 화면에서는 저장을
 *    보내지 않을 뿐이고, 보내더라도 관문이 끊는다.
 */
export function ResearchBoardEditor({
    initial,
    version: openedVersion,
    access,
}: {
    initial: ResearchBoard;
    /** 서버가 이 보드를 읽었을 때의 판 */
    version: number;
    access: BoardAccess;
})
{
    const router = useRouter();
    const pathname = usePathname();
    const editable = access === "editable";
    const [board, setBoard] = useState(() => fitBoardGroupHeights(initial));
    const [saveState, setSaveState] = useState<SaveState>("saved");
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef(board);
    const version = useRef(openedVersion);
    const sending = useRef(false);
    const pending = useRef(false);
    latest.current = board;

    useEffect(() =>
    {
        setBoard(fitBoardGroupHeights(initial));
        setSaveState("saved");
        setError(null);
        version.current = openedVersion;
    }, [initial.slug]);

    const persist = useCallback(async () =>
    {
        if (sending.current)
        {
            pending.current = true;
            return;
        }

        sending.current = true;
        setSaveState("saving");

        do
        {
            pending.current = false;

            const next = latest.current;
            const result = await saveBoardAction({
                slug: next.slug,
                version: version.current,
                title: next.title,
                tagline: next.tagline,
                groups: next.groups,
            });

            if (!result.ok)
            {
                sending.current = false;
                setSaveState("error");
                setError(result.message);
                return;
            }

            version.current = result.board.version;
        }
        while (pending.current);

        sending.current = false;
        setSaveState("saved");
        setError(null);
    }, []);

    const onChange = useCallback(
        (next: ResearchBoard) =>
        {
            setBoard(next);
            latest.current = next;

            // 고칠 수 없는 사람의 화면에서는 배치를 움직여도 자기 화면에서만 바뀐다
            if (!editable) return;

            setSaveState("saving");
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() =>
            {
                timer.current = null;
                void persist();
            }, 400);
        },
        [editable, persist],
    );

    useEffect(() =>
    {
        return () =>
        {
            if (!timer.current) return;
            clearTimeout(timer.current);
            timer.current = null;
            void persist();
        };
    }, [persist]);

    async function onDelete()
    {
        const result = await removeBoardAction({ slug: board.slug });
        if (!result.ok)
        {
            setError(result.message);
            setSaveState("error");
            setConfirmDelete(false);
            return;
        }
        router.push(researchBoardsHref(board.theme));
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 px-4 pt-5 sm:px-6">
                {/* 이 화면은 셸의 띠 없이 선다(`layout="full"`). 접은 사이드바를 다시 펴는 단추를 본문이 갖는다 */}
                <SidebarTrigger className="-ml-1 mt-1 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground">리서치 보드</p>
                    <input
                        className="mt-2 w-full bg-transparent text-2xl font-semibold tracking-tight outline-none"
                        value={board.title}
                        aria-label="보드 제목"
                        readOnly={!editable}
                        onChange={(event) => onChange({ ...board, title: event.target.value })}
                    />
                    <input
                        className="mt-1 w-full max-w-3xl bg-transparent text-sm text-muted-foreground outline-none"
                        value={board.tagline}
                        aria-label="보드 설명"
                        placeholder={editable ? "보드 설명" : undefined}
                        readOnly={!editable}
                        onChange={(event) => onChange({ ...board, tagline: event.target.value })}
                    />
                </div>
                {editable && (
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-muted-foreground" aria-live="polite">
                            {saveState === "saving" && "저장하는 중"}
                            {saveState === "saved" && "저장됨"}
                            {saveState === "error" && (error ?? "저장하지 못했어요")}
                        </p>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                            보드 삭제하기
                        </Button>
                    </div>
                )}
                {access === "sign-in" && (
                    <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={paths.login(pathname)} />}
                    >
                        로그인하고 고치기
                    </Button>
                )}
            </header>
            <div className="min-h-0 flex-1">
                <ResearchBoardFlow board={board} onChange={onChange} readOnly={!editable} />
            </div>
            <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>이 보드를 삭제할까요?</DialogTitle>
                        <DialogDescription>그룹과 카드도 함께 삭제돼요. 삭제한 보드는 되살릴 수 없어요.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                            닫기
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void onDelete()}>
                            삭제하기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
