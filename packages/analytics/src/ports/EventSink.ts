import { Context, type Effect } from "effect";

import type { PlannedEvent } from "../rules/capture.ts";

/**
 * 정해진 이벤트를 밖으로 보내는 포트. 무엇을 보낼지는 `planCapture` 가 이미 정했고, 여기는 나르기만 한다.
 *
 * ⚠ **부르면 곧바로 보내고 다 보낼 때까지 기다린다.** 서버리스 함수는 응답 뒤에 멈출 수 있어서, 쌓아 두었다 나중에
 *    보내는 모양이면 조용히 버려진다. 응답을 늦추지 않으려면 부르는 쪽이 `after()` 안에서 부른다.
 * ⚠ **보내지 못해도 실패로 올리지 않는다.** 분석 때문에 사람의 일이 실패하면 안 된다. 구현이 경고를 남기고 삼킨다.
 */
export class EventSink extends Context.Service<EventSink, {
    readonly capture: (event: PlannedEvent) => Effect.Effect<void>;
}>()("@hathway/analytics/ports/EventSink")
{}
