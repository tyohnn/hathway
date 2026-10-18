import "server-only";

import type { Layer } from "effect";

import { posthogSinkLayer } from "@hathway/adapters-posthog/PosthogSink";
import { rehearsalSinkLayer } from "@hathway/adapters-posthog/RehearsalSink";
import type { EventSink } from "@hathway/analytics/ports/EventSink";

import { posthogSettings } from "./config";

/**
 * 이 서버가 쓸 이벤트 창구. 설정(`config.ts`)이 끔이면 `null` 이고 아무것도 보내지 않는다.
 *
 * ⚠ **실물 창구는 프로세스에 하나다.** posthog-node 클라이언트를 요청마다 만들지 않게 `globalThis` 에 둔다.
 */
const store = globalThis as typeof globalThis & { __posthogSink?: Layer.Layer<EventSink> };

export const chosenSink = (): Layer.Layer<EventSink> | null =>
{
    const settings = posthogSettings();

    if (settings.mode === "off")
    {
        return null;
    }

    if (settings.mode === "rehearsal")
    {
        return rehearsalSinkLayer;
    }

    store.__posthogSink ??= posthogSinkLayer({ token: settings.token, host: settings.ingestHost });

    return store.__posthogSink;
};
