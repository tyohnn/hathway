import "server-only";

import { Effect, Layer } from "effect";

import { CreditMeter, freeCreditMeter } from "@/extensions/CreditMeter";
import { emptyMcpSurface, McpSurface } from "@/extensions/McpSurface";
import { PlanLimits, unlimitedPlanLimits } from "@/extensions/PlanLimits";
import { ProductEvents, silentProductEvents } from "@/extensions/ProductEvents";
import { pluginExtensions } from "@/modules/plugin/extensions"; // scaffold:module plugin
import { posthogExtensions } from "@/modules/posthog/extensions"; // scaffold:module posthog

/**
 * 켠 모듈을 코어의 확장 지점에 잇는 **단 한 곳**이다. 코어의 화면 · 유스케이스 · 액션은 확장 지점(`@/extensions/*`)만
 * 알고, 모듈의 코드는 이 파일만 부른다(`packages/shared/scripts/check-modules.mjs` 가 잰다).
 *
 * ⚠ **모듈을 빼는 일은 이 파일에서 `scaffold:module <이름>` 이 붙은 줄을 걷고 그 모듈이 가진 파일을 지우는 것이다.**
 *    남은 확장 지점은 기본 구현(한도 없음 · 재지 않음 · 알리지 않음 · 더하지 않음)으로 돈다.
 * ⚠ **브라우저 쪽은 `lib/moduleClient.ts` 가 잇는다.** 이 파일은 서버 전용이라 클라이언트 컴포넌트가 부를 수 없다.
 * ⚠ **뒤에 적은 모듈이 앞의 것을 덮는다.** 두 모듈이 같은 확장 지점을 채우면 차례가 뜻을 갖는다.
 */
type Extensions = PlanLimits | CreditMeter | ProductEvents | McpSurface;

const DEFAULTS: Layer.Layer<Extensions> = Layer.mergeAll(unlimitedPlanLimits, freeCreditMeter, silentProductEvents, emptyMcpSurface);

/**
 * 모듈 하나가 내는 Layer. 확장 지점 가운데 하나 이상을 채운다(결제는 둘, 분석은 하나).
 * ⚠ Layer 는 내놓는 쪽이 반변이라 `Layer<Extensions>` 로 적으면 일부만 채운 모듈이 맞지 않는다. 지점마다의 합으로 적는다.
 */
type ModuleLayer = Layer.Layer<PlanLimits> | Layer.Layer<CreditMeter> | Layer.Layer<ProductEvents> | Layer.Layer<McpSurface>;

const MODULES: ReadonlyArray<Effect.Effect<ModuleLayer, unknown>> = [
    pluginExtensions, // scaffold:module plugin
    posthogExtensions, // scaffold:module posthog
];

export const extensionsLayer: Effect.Effect<Layer.Layer<Extensions>, unknown> =
    Effect.map(Effect.all(MODULES), (layers): Layer.Layer<Extensions> => Layer.mergeAll(DEFAULTS, ...layers));
