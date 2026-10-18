import { Context, Effect, Layer } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";

/**
 * 확장 지점: AI 기능 하나를 부를 때 크레딧을 재는가. 코어(쪽지 요약)가 부름을 맡기고 모듈(결제)이 크레딧을 잡고 확정한다.
 *
 * ⚠ **코어는 이 포트만 안다.** 결제 모듈이 없으면 기본 구현(`freeCreditMeter`)이 서서 부르기만 하고 장부를 지나지 않는다.
 *    어느 구현을 잇는지는 `lib/modules.ts` 하나가 정한다.
 * ⚠ **기능은 이름(`note_summary`)으로 넘긴다.** 얼마를 잡을지는 모듈이 안다.
 */
export type Metered<A> =
    | { readonly ok: true; readonly value: A; readonly credits: number }
    | { readonly ok: false; readonly available: number; readonly topUpHref: string | null };

export class CreditMeter extends Context.Service<CreditMeter, {
    /** 누르기 전에 보일 최대 크레딧. `null` 이면 이 사람에게는 재지 않는다 */
    readonly quote: (actor: Actor, feature: string) => Effect.Effect<number | null, unknown>;
    /** `call` 을 재며 부른다. 모자라면 부르지 않고 `ok: false` 다. `call` 이 실패하면 그 실패를 그대로 올린다 */
    readonly meter: <A, E, R>(
        actor: Actor,
        feature: string,
        now: Date,
        call: Effect.Effect<{ readonly value: A; readonly tokens: number }, E, R>,
    ) => Effect.Effect<Metered<A>, unknown, R>;
}>()("@hathway/web/extensions/CreditMeter")
{}

/** 모듈이 없을 때. 부르기만 하고 재지 않는다 */
export const freeCreditMeter: Layer.Layer<CreditMeter> = Layer.succeed(CreditMeter, CreditMeter.of({
    quote: () => Effect.succeed(null),
    meter: (_actor, _feature, _now, call) => Effect.map(call, ({ value }) => ({ ok: true as const, value, credits: 0 })),
}));
