import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { customerActor } from "@hathway/access/testing/actor";
import { noteStoreMemory } from "@hathway/notes/testing/noteStoreMemory";

import { freeCreditMeter } from "@/extensions/CreditMeter";
import { RehearsalSummaryModel } from "@/lib/summaryModel";

import { createNote } from "./notes";
import { summarizeNote } from "./summary";

/**
 * 쪽지 요약. 크레딧은 확장 지점(`CreditMeter`)이 잰다. 여기서는 코어의 기본 구현(재지 않음)으로 돌고, 크레딧을 쓰는
 * 조립은 그 확장 지점을 채운 모듈이 잰다(`modules/<이름>/acceptance.json` 의 검사).
 */
const NOW = new Date("2026-09-29T12:00:00Z");
const model = new RehearsalSummaryModel();

const setUp = () => Effect.map(noteStoreMemory(), (notes) => Layer.mergeAll(notes, freeCreditMeter));

describe("쪽지 요약 (결제 모듈 없음)", () =>
{
    it.effect("결제 모듈이 없으면 요약은 부르기만 하고 크레딧을 쓰지 않는다", () =>
        Effect.gen(function*()
        {
            const layer = yield* setUp();
            const result = yield* Effect.gen(function*()
            {
                const created = yield* createNote(customerActor("2"), { title: "주간 회의", body: "배포 일정 정하기", visibility: "tenant" });

                return yield* summarizeNote(customerActor("2"), created.ok ? created.noteId : "", model, NOW);
            }).pipe(Effect.provide(layer));

            assert.deepStrictEqual(result, { ok: true, summary: "(연습 모드) 주간 회의: 배포 일정 정하기", credits: 0 });
        }));

    it.effect("INV-NOTE-02 볼 수 없는 쪽지는 요약하지 않는다", () =>
        Effect.gen(function*()
        {
            const layer = yield* setUp();
            const result = yield* Effect.gen(function*()
            {
                const created = yield* createNote(customerActor("2"), { title: "비밀", body: "", visibility: "private" });

                return yield* summarizeNote(customerActor("3"), created.ok ? created.noteId : "", model, NOW);
            }).pipe(Effect.provide(layer));

            assert.deepStrictEqual(result, { ok: false, message: "쪽지를 찾을 수 없어요." });
        }));
});
