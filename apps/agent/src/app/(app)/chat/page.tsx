import { Suspense } from "react";
import type { Metadata } from "next";

import { ItemList } from "@hathway/blocks/item-list";
import { PageHeader } from "@hathway/blocks/page-header";

import { ChatPanel } from "./_components/ChatPanel";
import { ConversationList } from "./_components/ConversationList";

export const metadata: Metadata = { title: "대화" };

/**
 * 새 대화와 지난 대화. 첫 말을 보내면 Workflow 실행이 서고 그 번호가 대화의 주소가 된다.
 *
 * ⚠ **제목 · 새 대화 칸 · 「지난 대화」 머리는 `<Suspense>` 밖이다.** 누가 열어도 같아 구워 둔다. 기다리는 것은 목록 하나이고,
 *    기다리는 얼굴은 같은 목록의 `loading` 이다(`CLAUDE.md` 「정적 껍데기」).
 */
export default function ChatPage()
{
    return (
        <div className="flex flex-col gap-8">
            <PageHeader title="대화" />
            <ChatPanel runId={null} initialMessages={[]} open />
            <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold">지난 대화</h2>
                <Suspense fallback={<ItemList items={[]} loading />}>
                    <ConversationList />
                </Suspense>
            </section>
        </div>
    );
}
