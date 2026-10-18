import Link from "next/link";
import { Effect } from "effect";

import { ItemList, type ListItem } from "@hathway/blocks/item-list";

import { conversationStoreLayer } from "@/lib/agentRuntime";
import { paths } from "@/lib/paths";
import { appRead } from "@/lib/read";
import { listConversations } from "@/usecases/conversation";

/** 이 사람이 연 대화(INV-AGENT-01). 남의 대화는 목록에 서지 않는다 */
export async function ConversationList()
{
    const conversations = await appRead((actor) =>
        Effect.flatMap(conversationStoreLayer, (layer) => listConversations(actor).pipe(Effect.provide(layer))));

    const items: ReadonlyArray<ListItem> = conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        ...(conversation.status === "closed" ? { meta: "종료" } : {}),
        actions: (
            <Link className="text-sm underline-offset-4 hover:underline" href={paths.conversation(conversation.id)} aria-label={`${conversation.title} 열기`}>
                열기
            </Link>
        ),
    }));

    return <ItemList items={items} appearance="divided" labels={{ empty: "아직 대화가 없어요" }} />;
}
