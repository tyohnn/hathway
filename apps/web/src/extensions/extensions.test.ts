import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { actorOf, customerActor } from "@hathway/access/testing/actor";
import { teamWorldMemory } from "@hathway/access/testing/teamDirectoryMemory";
import { noteStoreMemory } from "@hathway/notes/testing/noteStoreMemory";

import { RehearsalSummaryModel } from "@/lib/summaryModel";
import { createNote } from "@/usecases/notes";
import { summarizeNote } from "@/usecases/summary";
import { invite } from "@/usecases/team";

import { mcpPlan, TOOLS } from "@/lib/mcp";

import { CreditMeter, freeCreditMeter } from "./CreditMeter";
import { emptyMcpSurface, McpSurface } from "./McpSurface";
import { PlanLimits, unlimitedPlanLimits } from "./PlanLimits";
import { ProductEvents, silentProductEvents } from "./ProductEvents";

/**
 * 코어의 확장 지점. 모듈이 없을 때 선 기본 구현이 코어를 막지 않는지 잰다. 모듈이 채운 구현은 그 모듈이 잰다
 * (`modules/<이름>/acceptance.json` 의 검사).
 */
describe("확장 지점의 기본 구현 (결제 모듈 없음)", () =>
{
    it.effect("확장 지점의 기본 구현은 멤버 한도가 없고 MCP 를 막지 않는다", () =>
        Effect.gen(function*()
        {
            const limits = yield* Effect.flatMap(PlanLimits, (planLimits) => planLimits.forActor(customerActor("2"))).pipe(Effect.provide(unlimitedPlanLimits));

            assert.deepStrictEqual(limits, { maxMembers: null, mcp: true, upgradeHref: null });
        }));

    it.effect("기본 제품 분석은 아무것도 보내지 않고 실패하지 않는다", () =>
        Effect.gen(function*()
        {
            const exit = yield* Effect.exit(Effect.flatMap(ProductEvents, (events) =>
                events.capture(customerActor("2"), "note_created", { visibility: "tenant" })).pipe(Effect.provide(silentProductEvents)));

            assert.strictEqual(exit._tag, "Success");
        }));

    it.effect("기본 크레딧 계량은 부르기만 하고 장부를 지나지 않는다", () =>
        Effect.gen(function*()
        {
            const { quote, result } = yield* Effect.gen(function*()
            {
                const meter = yield* CreditMeter;

                return {
                    quote: yield* meter.quote(customerActor("2"), "note_summary"),
                    result: yield* meter.meter(customerActor("2"), "note_summary", new Date(), Effect.succeed({ value: "요약", tokens: 300 })),
                };
            }).pipe(Effect.provide(freeCreditMeter));

            assert.isNull(quote);
            assert.deepStrictEqual(result, { ok: true, value: "요약", credits: 0 });
        }));

    it.effect("기본 MCP 확장은 아무것도 더하지 않는다. 코어의 도구 둘만 선다", () =>
        Effect.gen(function*()
        {
            const surface = yield* McpSurface;
            const listed = mcpPlan({ id: 1, method: "tools/list" }, surface.shape);

            assert.deepStrictEqual(listed.kind === "reply" && listed.reply.result, { tools: TOOLS });
            assert.isNull(yield* surface.read({ actor: customerActor("2"), uri: "ui://anything" }));
        }).pipe(Effect.provide(emptyMcpSurface)));

    it.effect("결제 모듈을 끈 조립으로 초대 · MCP · 요약이 모두 돈다", () =>
        Effect.gen(function*()
        {
            const world = teamWorldMemory();
            const seeded = yield* world.make([
                { email: "owner@example.test", role: "owner" },
                { email: "admin@example.test", role: "admin" },
                { email: "kim@example.test", role: "member" },
            ]);
            const notes = yield* noteStoreMemory();
            const layer = Layer.mergeAll(seeded.layer, notes, unlimitedPlanLimits, freeCreditMeter);
            const owner = actorOf({ accountId: seeded.members[0]?.accountId ?? "", tenantId: seeded.tenantId, tenantKind: "customer", role: "owner" });

            const result = yield* Effect.gen(function*()
            {
                // 결제 모듈의 무료 요금제라면 넷째에서 막혔을 초대다
                const invited = yield* invite(owner, { email: "fourth@example.test", role: "member" });
                const mcp = (yield* Effect.flatMap(PlanLimits, (limits) => limits.forActor(owner))).mcp;
                const created = yield* createNote(customerActor("2"), { title: "회의", body: "안건", visibility: "tenant" });
                const summary = yield* summarizeNote(customerActor("2"), created.ok ? created.noteId : "", new RehearsalSummaryModel(), new Date());

                return { invited: invited.ok, mcp, summary: summary.ok };
            }).pipe(Effect.provide(layer));

            assert.deepStrictEqual(result, { invited: true, mcp: true, summary: true });
        }));
});
