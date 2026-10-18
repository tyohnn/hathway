import "server-only";

import { Effect, Layer } from "effect";

import { EventSink } from "@hathway/analytics/ports/EventSink";
import type { PlannedEvent } from "@hathway/analytics/rules/capture";

/**
 * 키 없이 도는 연습 창구. 보내지 않고 이 프로세스의 메모리에 모은다. 로컬 개발과 e2e 가 쓴다(`POSTHOG_SINK=rehearsal`).
 *
 * ⚠ **`globalThis` 에 둔다.** Next 는 라우트마다 모듈을 따로 불러서, 모듈 변수에 두면 이벤트를 적는 액션과 읽는 라우트가
 *    서로 다른 배열을 본다.
 * ⚠ **프로세스마다 따로다.** e2e 의 서버 둘(닫힌 · 열린)은 서로의 이벤트를 모른다. 이벤트를 만든 서버에 물어야 한다.
 * ⚠ 끝없이 쌓이지 않게 최근 것만 둔다.
 */
const LIMIT = 500;

const store = globalThis as typeof globalThis & { __rehearsalAnalytics?: Array<PlannedEvent> };

const events = (): Array<PlannedEvent> =>
{
    store.__rehearsalAnalytics ??= [];

    return store.__rehearsalAnalytics;
};

export const rehearsalSinkLayer: Layer.Layer<EventSink> = Layer.succeed(EventSink, EventSink.of({
    capture: (planned) =>
        Effect.sync(() =>
        {
            const list = events();

            list.push(planned);
            list.splice(0, Math.max(0, list.length - LIMIT));
        }),
}));

/** 모은 이벤트. 최근 것이 뒤에 있다 */
export const rehearsalEvents = (): ReadonlyArray<PlannedEvent> => [...events()];
