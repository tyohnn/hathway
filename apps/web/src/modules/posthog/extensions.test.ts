import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { customerActor } from "@hathway/access/testing/actor";
import type { Consent } from "@hathway/analytics/domain/Consent";
import { EventSink } from "@hathway/analytics/ports/EventSink";
import type { PlannedEvent } from "@hathway/analytics/rules/capture";

import { ProductEvents } from "@/extensions/ProductEvents";

import { settingsFrom } from "./config";
import { productEventsLayer } from "./extensions";

/**
 * 분석 모듈을 켠 조립. 코어가 확장 지점(`ProductEvents`)에 알린 일이 동의와 카탈로그를 지나 창구에 닿는지 잰다.
 * 창구는 메모리이고, 응답 뒤로 미루는 일(`after`)은 모아 두었다가 시험이 직접 돌린다.
 */
const world = (consent: Consent, over: { readonly sinkFails?: boolean; readonly consentFails?: boolean } = {}) =>
{
    const sent: Array<PlannedEvent> = [];
    const deferred: Array<() => Promise<void>> = [];
    const sink = Layer.succeed(EventSink, EventSink.of({
        capture: (planned) => over.sinkFails === true ? Effect.die(new Error("down")) : Effect.sync(() => void sent.push(planned)),
    }));
    const layer = productEventsLayer({
        consent: over.consentFails === true ? Effect.die(new Error("no request")) : Effect.succeed(consent),
        sink,
        defer: (task) => void deferred.push(task),
    });
    const capture = (event: string, properties?: Readonly<Record<string, string | number>>) =>
        Effect.flatMap(ProductEvents, (events) => events.capture(customerActor("7"), event, properties)).pipe(Effect.provide(layer));
    const flush = Effect.promise(() => Promise.allSettled(deferred.map((task) => task())));

    return { sent, deferred, capture, flush };
};

describe("분석 모듈의 확장 지점", () =>
{
    it.effect("INV-ANALYTICS-01 동의한 사람의 일은 응답 뒤에 창구로 간다", () =>
        Effect.gen(function*()
        {
            const { sent, deferred, capture, flush } = world("granted");

            yield* capture("note_created", { visibility: "tenant", title: "비밀 회의" });

            assert.strictEqual(sent.length, 0, "응답 전에는 보내지 않는다");
            assert.strictEqual(deferred.length, 1);

            yield* flush;

            assert.deepStrictEqual(sent, [{ distinctId: "7", event: "note_created", properties: { visibility: "tenant" }, groups: { organization: "2" } }]);
        }));

    it.effect("INV-ANALYTICS-01 동의하지 않았거나 고르지 않은 사람의 일은 미루지도 않는다", () =>
        Effect.gen(function*()
        {
            for (const consent of ["denied", "unknown"] as const)
            {
                const { deferred, capture } = world(consent);

                yield* capture("note_created", { visibility: "tenant" });

                assert.strictEqual(deferred.length, 0);
            }
        }));

    it.effect("창구가 멈추거나 동의를 읽지 못해도 사람의 일은 실패하지 않는다", () =>
        Effect.gen(function*()
        {
            const broken = world("granted", { sinkFails: true });

            yield* broken.capture("note_archived");
            yield* broken.flush;

            const unreadable = world("granted", { consentFails: true });
            const exit = yield* Effect.exit(unreadable.capture("note_archived"));

            assert.strictEqual(exit._tag, "Success");
            assert.strictEqual(unreadable.deferred.length, 0);
        }));

    it("설정: 연습이 먼저고, 토큰이 있으면 실물, 둘 다 없으면 끈다. 리전이 호스트를 정한다", () =>
    {
        assert.strictEqual(settingsFrom({ sink: "rehearsal", token: "phc_x", region: undefined }).mode, "rehearsal");
        assert.strictEqual(settingsFrom({ sink: undefined, token: "phc_x", region: undefined }).mode, "live");
        assert.strictEqual(settingsFrom({ sink: undefined, token: " ", region: undefined }).mode, "off");
        assert.strictEqual(settingsFrom({ sink: undefined, token: "phc_x", region: "eu" }).ingestHost, "https://eu.i.posthog.com");
        assert.strictEqual(settingsFrom({ sink: undefined, token: "phc_x", region: undefined }).ingestHost, "https://us.i.posthog.com");
    });
});
