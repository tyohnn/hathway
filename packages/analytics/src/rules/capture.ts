import type { Actor } from "@hathway/access/domain/Actor";

import type { Consent } from "../domain/Consent.ts";
import { EVENTS, isEventName, type EventName, type EventProperties } from "../domain/Event.ts";

/**
 * 이벤트 하나를 보낼지와, 보낸다면 무엇을 보낼지를 정한다. 보내는 일은 포트(`EventSink`)가 한다.
 *
 *   · 동의하지 않았거나 고르지 않았으면 보내지 않는다(INV-ANALYTICS-01)
 *   · 카탈로그에 없는 이벤트는 보내지 않고, 적지 않은 속성은 떨군다(INV-ANALYTICS-03)
 *   · 사람은 계정 id, 조직은 테넌트 id 로만 가리킨다(INV-ANALYTICS-02)
 */
export interface PlannedEvent
{
    readonly distinctId: string;
    readonly event: EventName;
    readonly properties: EventProperties;
    /** PostHog 의 그룹 분석. 조직 단위로 묶는다 */
    readonly groups: { readonly organization: string };
}

export const planCapture = (
    consent: Consent,
    actor: Actor,
    event: string,
    properties: EventProperties = {},
): PlannedEvent | null =>
{
    if (consent !== "granted" || !isEventName(event))
    {
        return null;
    }

    const allowed: ReadonlyArray<string> = EVENTS[event];
    const kept = Object.fromEntries(Object.entries(properties).filter(([key]) => allowed.includes(key)));

    return {
        distinctId: actor.accountId,
        event,
        properties: kept,
        groups: { organization: actor.tenantId },
    };
};
