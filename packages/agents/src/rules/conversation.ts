import type { Actor } from "@hathway/access/domain/Actor";

import type { Conversation } from "../domain/Conversation.ts";

/**
 * 이 사람이 이 대화를 열고 이어 말할 수 있는가(INV-AGENT-01). 행 단위 판정의 단 하나의 자리다.
 *
 * ⚠ **테넌트도 함께 본다.** 한 계정이 여러 테넌트에 속할 수 있고 행위자는 지나온 테넌트를 들고 다닌다
 *    (INV-ACCESS-02). 다른 테넌트로 들어온 같은 사람에게 이 대화를 보이면 테넌트의 경계가 사람 단위로 샌다.
 * ⚠ **볼 수 없는 대화는 없는 것이다.** 저장소가 `null` 로 답하고 화면은 404 를 그린다.
 */
export const canOpenConversation = (actor: Actor, conversation: Conversation): boolean =>
    conversation.startedBy === actor.accountId && conversation.tenantId === actor.tenantId;

/** 대화에 말을 더 걸 수 있는가. 닫힌 대화는 워크플로가 이미 돌아가서 훅이 없다 */
export const canTalk = (actor: Actor, conversation: Conversation): boolean =>
    canOpenConversation(actor, conversation) && conversation.status === "open";

export const TITLE_LENGTH = 40;

/**
 * 첫 말에서 대화의 제목을 짓는다.
 *
 * ⚠ **모델에게 짓게 하지 않는다.** 목록의 제목은 대화가 시작되는 그 순간에 서야 하고, 모델을 한 번 더
 *    부르면 그 시간과 비용이 첫 화면에 얹힌다. 첫 줄을 글자 수로 자른다.
 */
export const titleOf = (firstMessage: string): string =>
{
    const firstLine = firstMessage.trim().split("\n")[0]?.trim() ?? "";

    if (firstLine === "")
    {
        return "새 대화";
    }

    const letters = [...firstLine];

    return letters.length <= TITLE_LENGTH ? firstLine : `${letters.slice(0, TITLE_LENGTH).join("")}…`;
};
