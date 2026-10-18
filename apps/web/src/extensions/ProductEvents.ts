import { Context, Effect, Layer } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";

/**
 * 확장 지점: 사람이 한 일을 제품 분석으로 알린다. 코어(액션의 ⑥ 밖으로)가 알리고 모듈(PostHog)이 보낸다.
 *
 * ⚠ **코어는 이 포트만 안다.** 무엇을 보내도 되는지(동의 · 카탈로그)와 어디로 보내는지는 모듈이 정한다. 분석 모듈이
 *    없으면 기본 구현(`silentProductEvents`)이 서서 아무것도 하지 않는다. 어느 구현을 잇는지는 `lib/modules.ts` 가 정한다.
 * ⚠ **실패하지 않는다.** 분석 때문에 사람의 일이 실패하면 안 된다. 그래서 오류 채널이 없다.
 * ⚠ **이벤트는 이름(`note_created`)과 작은 속성만 넘긴다.** 사람이 쓴 글(제목 · 본문)을 속성에 싣지 않는다.
 */
export class ProductEvents extends Context.Service<ProductEvents, {
    readonly capture: (
        actor: Actor,
        event: string,
        properties?: Readonly<Record<string, string | number | boolean>>,
    ) => Effect.Effect<void>;
}>()("@hathway/web/extensions/ProductEvents")
{}

/** 모듈이 없을 때. 아무것도 보내지 않는다 */
export const silentProductEvents: Layer.Layer<ProductEvents> =
    Layer.succeed(ProductEvents, ProductEvents.of({ capture: () => Effect.void }));
