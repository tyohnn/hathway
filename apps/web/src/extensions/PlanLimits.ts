import { Context, Effect, Layer } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";

/**
 * 확장 지점: 조직이 무엇까지 쓸 수 있는가. 코어(팀 초대 · MCP 도구)가 묻고 모듈(결제)이 답한다.
 *
 * ⚠ **코어는 이 포트만 안다.** 요금제 · 구독 · Stripe 를 모른다. 결제 모듈이 없으면 기본 구현(`unlimitedPlanLimits`)이
 *    서서 한도 없이 돈다. 어느 구현을 잇는지는 `lib/modules.ts` 하나가 정한다.
 */
export interface Limits
{
    /** 살아 있는 멤버십의 한도. `null` 이면 없다. 초대만 받은 사람도 센다 */
    readonly maxMembers: number | null;
    /** Claude 연결(MCP 도구)을 부를 수 있는가 */
    readonly mcp: boolean;
    /** 이 사람이 한도를 올리러 갈 주소. 올릴 수 없으면(결제를 못 하는 관리자 · 모듈 없음) `null` 이고 링크가 서지 않는다 */
    readonly upgradeHref: string | null;
}

export class PlanLimits extends Context.Service<PlanLimits, {
    readonly forActor: (actor: Actor) => Effect.Effect<Limits, unknown>;
}>()("@hathway/web/extensions/PlanLimits")
{}

export const UNLIMITED: Limits = { maxMembers: null, mcp: true, upgradeHref: null };

/** 모듈이 없을 때. 한도가 없고 아무것도 막지 않는다 */
export const unlimitedPlanLimits: Layer.Layer<PlanLimits> =
    Layer.succeed(PlanLimits, PlanLimits.of({ forActor: () => Effect.succeed(UNLIMITED) }));
