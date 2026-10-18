import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Effect } from "effect";
import type { UIMessage } from "ai";

import { PageHeader } from "@hathway/blocks/page-header";

import { conversationStoreLayer } from "@/lib/agentRuntime";
import { appRead } from "@/lib/read";
import { openConversation } from "@/usecases/conversation";

import { ChatPanel } from "../_components/ChatPanel";

export const metadata: Metadata = { title: "대화" };

/**
 * 대화 하나. 지난 말은 장부(`agent.message`)에서 읽고, 이어 말하면 같은 Workflow 실행이 깨어난다.
 *
 * ⚠ **연 사람만 연다**(INV-AGENT-01). 볼 수 없는 대화는 404 다. 실행 번호를 안다고 열리지 않는다.
 * ⚠ **`params` 를 맨 위에서 기다리지 않는다.** 약속 그대로 `<Suspense>` 안쪽 조각에 넘긴다(`CLAUDE.md` 「정적 껍데기」).
 * ⚠ 기다리는 얼굴은 같은 머리(`PageHeader loading`)다. 대화 칸은 열렸는지 닫혔는지를 알아야 서므로 기다린 뒤에 선다.
 */
export default function ConversationPage({ params }: { readonly params: Promise<{ readonly runId: string }> })
{
    return (
        <Suspense fallback={<div aria-busy className="flex flex-col gap-6"><PageHeader loading /></div>}>
            <Conversation params={params} />
        </Suspense>
    );
}

async function Conversation({ params }: { readonly params: Promise<{ readonly runId: string }> })
{
    const { runId } = await params;
    const opened = await appRead((actor) =>
        Effect.flatMap(conversationStoreLayer, (layer) => openConversation(actor, decodeURIComponent(runId)).pipe(Effect.provide(layer))));

    if (opened === null)
    {
        notFound();
    }

    const initialMessages: ReadonlyArray<UIMessage> = opened.messages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: [{ type: "text", text: message.text }],
    }));

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title={opened.conversation.title}
            />
            <ChatPanel
                key={opened.conversation.id}
                runId={opened.conversation.id}
                initialMessages={initialMessages}
                open={opened.conversation.status === "open"}
            />
        </div>
    );
}
