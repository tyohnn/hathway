import type { Metadata } from "next";

import { PageHeader } from "@hathway/blocks/page-header";

import { NewNoteForm } from "../_components/NewNoteForm";

export const metadata: Metadata = { title: "쪽지 쓰기" };

/**
 * 새 쪽지의 전체 페이지. 주소로 바로 오거나, 새로 고치거나, 쪽지 화면 밖(홈 · 사이드바)에서 오면 이것이 선다. 쪽지 화면에서 누르면
 * 같은 폼이 다이얼로그로 열린다(`../@modal/(.)new`).
 */
export default function NewNotePage()
{
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="쪽지 쓰기" />
            <NewNoteForm />
        </div>
    );
}
