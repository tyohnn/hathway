"use client";

import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@hathway/ui/components/dialog";

import { NewNoteForm } from "./NewNoteForm";

/**
 * 목록 위에 연 새 쪽지(`/ia-design` 의 대시보드 해부도 6번, 칸이 다섯 안팎이면 다이얼로그). 닫으면 뒤로 간다. 연 것이 이동이었으므로
 * 닫는 것도 이동이어야 뒤로 가기와 닫기가 같은 일을 한다.
 */
export function NewNoteDialog()
{
    const router = useRouter();

    return (
        <Dialog open onOpenChange={(open) => (open ? undefined : router.back())}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>쪽지 쓰기</DialogTitle>
                </DialogHeader>
                <NewNoteForm />
            </DialogContent>
        </Dialog>
    );
}
