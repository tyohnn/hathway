"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@hathway/ui/components/alert-dialog";
import { Button } from "@hathway/ui/components/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@hathway/ui/components/dropdown-menu";
import { MoreHorizontal } from "@hathway/ui/icons";

import { archiveNoteAction } from "@/actions/notes";

/**
 * 쪽지 머리의 ⋯ 메뉴(`/ia-design` 의 대시보드 해부도 5번). 주 동작이 아닌 것은 모두 여기 서고, 되돌릴 수 없는 일은 맨 아래 묶음이다.
 *
 * ⚠ **보관은 열었을 때의 판을 함께 보낸다.** 그사이 쪽지가 바뀌었으면 덮어쓰지 않는다(INV-NOTE-03).
 * ⚠ **보관은 확인 창을 거친다.** 되돌릴 수 없다(INV-NOTE-04). 되돌릴 수 없는 일만 확인 창을 띄우고, 그때 잃는 것을 한 줄로 적는다
 *    (`ux-writing` 「자리별 규칙」). 물러서는 버튼은 「닫기」다.
 * ⚠ 보관 줄을 세울지(`canArchive`)는 화면의 편의다. 판정은 액션이 `archiveVerdict` 로 다시 한다.
 */
export function NoteMenu({ noteId, version, canArchive }: { readonly noteId: string; readonly version: number; readonly canArchive: boolean })
{
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [pending, start] = useTransition();
    const [notice, setNotice] = useState<{ readonly tone: "status" | "alert"; readonly text: string } | null>(null);

    const copyLink = (): void =>
    {
        // 눌렀는데 아무 글도 없으면 복사된 줄 알고 엉뚱한 것을 붙여 넣는다. 못 했으면 못 했다고 적는다
        const failed = (): void => setNotice({ tone: "alert", text: "링크를 복사하지 못했어요. 주소창에서 복사해 주세요." });

        // 보안 연결이 아닌 주소에서는 `clipboard` 자체가 없다
        if (!("clipboard" in navigator))
        {
            failed();

            return;
        }

        void navigator.clipboard.writeText(window.location.href).then(
            () => setNotice({ tone: "status", text: "링크를 복사했어요" }),
            failed,
        );
    };

    const archive = (): void =>
    {
        start(async () =>
        {
            const result = await archiveNoteAction({ noteId, version });

            setConfirming(false);

            if (result.ok)
            {
                setNotice(null);
                router.refresh();

                return;
            }

            setNotice({ tone: "alert", text: result.message });
        });
    };

    return (
        <div className="flex items-center gap-3">
            {notice === null
                ? null
                : (
                    <span role={notice.tone} className={notice.tone === "alert" ? "text-destructive text-sm" : "text-sm text-muted-foreground"}>
                        {notice.text}
                    </span>
                )}
            <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="쪽지 메뉴" disabled={pending} />}>
                    <MoreHorizontal aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={copyLink}>링크 복사하기</DropdownMenuItem>
                    </DropdownMenuGroup>
                    {canArchive
                        ? (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>보관하기</DropdownMenuItem>
                                </DropdownMenuGroup>
                            </>
                        )
                        : null}
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog open={confirming} onOpenChange={setConfirming}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>쪽지를 보관할까요?</AlertDialogTitle>
                        <AlertDialogDescription>보관한 쪽지는 되돌릴 수 없어요.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>닫기</AlertDialogCancel>
                        <AlertDialogAction onClick={archive} disabled={pending}>
                            {pending ? "보관하는 중" : "보관하기"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
