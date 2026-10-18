import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { EventSink } from "@hathway/analytics/ports/EventSink";
import type { PlannedEvent } from "@hathway/analytics/rules/capture";

import { posthogSinkLayer } from "./PosthogSink.ts";
import { rehearsalEvents, rehearsalSinkLayer } from "./RehearsalSink.ts";

/**
 * PostHog 창구. 네트워크에 나가지 않는다. SDK 는 진짜를 쓰고, 보내는 자리(`fetch`)만 가짜로 끼워 무엇이 나가는지 본다.
 */
const PLANNED: PlannedEvent = {
    distinctId: "7",
    event: "note_created",
    properties: { visibility: "tenant" },
    groups: { organization: "2" },
};

interface Sent
{
    readonly url: string;
    readonly body: Record<string, unknown>;
}

const capture = (fetch: Parameters<typeof posthogSinkLayer>[0]["fetch"]) =>
    Effect.flatMap(EventSink, (sink) => sink.capture(PLANNED)).pipe(
        Effect.provide(posthogSinkLayer({ token: "phc_test", host: "https://us.i.posthog.test", fetch })),
    );

describe("PostHog 창구", () =>
{
    it.effect("정해진 이벤트를 곧바로 보낸다. 계정 id · 조직 그룹 · 카탈로그의 속성만 싣는다", () =>
        Effect.gen(function*()
        {
            const sent: Array<Sent> = [];

            yield* capture(async (url, options) =>
            {
                sent.push({ url, body: JSON.parse(String(options.body)) as Record<string, unknown> });

                return { status: 200, text: async () => "{}", json: async () => ({}) } as never;
            });

            assert.strictEqual(sent.length, 1);
            assert.match(sent[0]!.url, /^https:\/\/us\.i\.posthog\.test\//);

            const batch = (sent[0]!.body["batch"] as Array<Record<string, unknown>>)[0]!;
            const properties = batch["properties"] as Record<string, unknown>;

            assert.strictEqual(batch["event"], "note_created");
            assert.strictEqual(batch["distinct_id"], "7");
            assert.strictEqual(properties["visibility"], "tenant");
            assert.deepStrictEqual(properties["$groups"], { organization: "2" });
            assert.notProperty(properties, "email");
        }));

    it.effect("보내지 못해도 실패로 올리지 않는다. 분석 때문에 사람의 일이 실패하면 안 된다", () =>
        Effect.gen(function*()
        {
            const exit = yield* Effect.exit(capture(async () =>
            {
                throw new Error("network down");
            }));

            assert.strictEqual(exit._tag, "Success");
        }));

    it.effect("연습 창구는 보내지 않고 이 프로세스에 모은다", () =>
        Effect.gen(function*()
        {
            const before = rehearsalEvents().length;

            yield* Effect.flatMap(EventSink, (sink) => sink.capture(PLANNED)).pipe(Effect.provide(rehearsalSinkLayer));

            assert.strictEqual(rehearsalEvents().length, before + 1);
            assert.deepStrictEqual(rehearsalEvents().at(-1), PLANNED);
        }));
});
