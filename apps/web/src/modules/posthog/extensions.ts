import "server-only";

import { after } from "next/server";
import { cookies } from "next/headers";
import { Effect, Layer } from "effect";

import { CONSENT_COOKIE, parseConsent, type Consent } from "@hathway/analytics/domain/Consent";
import { EventSink } from "@hathway/analytics/ports/EventSink";
import { planCapture } from "@hathway/analytics/rules/capture";

import { ProductEvents } from "@/extensions/ProductEvents";

import { chosenSink } from "./runtime";

/**
 * 확장 지점 `ProductEvents` 를 PostHog 로 채운다.
 *
 *   ① 그 사람의 동의를 쿠키에서 읽는다
 *   ② 보낼지와 무엇을 보낼지는 `planCapture` 가 정한다(INV-ANALYTICS-01 · 02 · 03)
 *   ③ 보내는 일은 응답 뒤로 미룬다(`after`). 사람은 분석을 기다리지 않는다
 *
 * ⚠ **동의를 물을 수 없는 길은 보내지 않는다.** MCP 처럼 쿠키가 없는 요청은 동의가 `unknown` 이라 ②에서 멈춘다.
 * ⚠ **어느 단계에서 실패해도 삼킨다.** 확장 지점의 약속이다.
 */
export interface ProductEventsDeps
{
    readonly consent: Effect.Effect<Consent>;
    readonly sink: Layer.Layer<EventSink> | null;
    readonly defer: (task: () => Promise<void>) => void;
}

export const productEventsLayer = (deps: ProductEventsDeps): Layer.Layer<ProductEvents> =>
    Layer.succeed(ProductEvents, ProductEvents.of({
        capture: (actor, event, properties) =>
        {
            const sink = deps.sink;

            if (sink === null)
            {
                return Effect.void;
            }

            return Effect.flatMap(deps.consent, (consent) =>
            {
                const planned = planCapture(consent, actor, event, properties);

                return planned === null
                    ? Effect.void
                    : Effect.sync(() =>
                        deps.defer(() => Effect.runPromise(Effect.flatMap(EventSink, (eventSink) => eventSink.capture(planned)).pipe(Effect.provide(sink)))));
            }).pipe(Effect.catchCause(() => Effect.void));
        },
    }));

/** 이 요청의 동의. 요청 밖이라 쿠키를 읽지 못하면 고르지 않은 것이다 */
const requestConsent: Effect.Effect<Consent> = Effect.promise(async () =>
{
    try
    {
        return parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
    }
    catch
    {
        return "unknown" as const;
    }
});

/** 응답 뒤에 돌린다. 요청 밖이면 곧바로 띄운다 */
const afterResponse = (task: () => Promise<void>): void =>
{
    try
    {
        after(task);
    }
    catch
    {
        void task();
    }
};

export const posthogExtensions: Effect.Effect<Layer.Layer<ProductEvents>> = Effect.sync(() =>
    productEventsLayer({ consent: requestConsent, sink: chosenSink(), defer: afterResponse }));
