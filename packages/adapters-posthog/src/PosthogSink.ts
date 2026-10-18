import "server-only";

import { Effect, Layer } from "effect";
import { PostHog, type PostHogOptions } from "posthog-node";

import { EventSink } from "@hathway/analytics/ports/EventSink";

/**
 * 이벤트 창구의 PostHog 구현. posthog-node 는 이 패키지에만 있다.
 *
 * ⚠ **`captureImmediate` 로 보낸다.** 큐에 쌓는 `capture` 는 서버리스에서 응답 뒤에 버려질 수 있다. 부르는 쪽이
 *    `after()` 안에서 부르므로 응답을 늦추지도 않는다.
 * ⚠ **GeoIP 를 끈다.** 서버에서 보내면 위치가 사람이 아니라 서버의 것이 된다.
 * ⚠ **다시 보내기를 짧게 잡는다.** SDK 기본값(3번 · 3초 간격 · 10초 제한)이면 PostHog 가 멈췄을 때 함수 하나가 40초를
 *    붙잡는다. 한 번만 다시 보내고 그래도 안 되면 버린다.
 * ⚠ **실패를 삼킨다**(`EventSink` 의 약속). 경고만 남긴다.
 */
export interface PosthogSinkConfig
{
    /** 프로젝트 토큰(`phc_…`). 공개해도 되는 값이지만 환경값으로 받는다 */
    readonly token: string;
    /** 받는 호스트. 미국 `https://us.i.posthog.com` · 유럽 `https://eu.i.posthog.com` */
    readonly host: string;
    /** 시험에서 네트워크 대신 끼운다 */
    readonly fetch?: PostHogOptions["fetch"];
}

export const posthogSinkLayer = (config: PosthogSinkConfig): Layer.Layer<EventSink> =>
{
    const client = new PostHog(config.token, {
        host: config.host,
        flushAt: 1,
        flushInterval: 0,
        disableGeoip: true,
        fetchRetryCount: 1,
        fetchRetryDelay: 500,
        requestTimeout: 3000,
        ...(config.fetch === undefined ? {} : { fetch: config.fetch, disableCompression: true }),
    });

    return Layer.succeed(EventSink, EventSink.of({
        capture: (planned) =>
            Effect.tryPromise(() => client.captureImmediate({
                distinctId: planned.distinctId,
                event: planned.event,
                properties: { ...planned.properties },
                groups: { ...planned.groups },
            })).pipe(
                Effect.catch((cause) =>
                    Effect.logWarning("분석 이벤트를 보내지 못했다").pipe(Effect.annotateLogs({ event: planned.event, cause: String(cause) }))),
            ),
    }));
};
