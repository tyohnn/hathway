import { Context, Effect, Schema } from "effect";

import type { Actor } from "../domain/Actor.ts";

/**
 * 행위자 확정 포트.
 *
 * 세션에서 "누가 이 일을 하는가" 를 확정한다. `Actor` 가 운영에서 생기는 자리이고, 행 단위 판정의 첫 입력이
 * 전부 여기서 나온다.
 *
 * ## 실패가 둘인 이유 (정본: 노션 「인증과 스코프 판정」)
 *
 * 인증은 세 계층이고 **앞의 둘이 이 포트**다. 실패마다 가는 곳이 다르므로 오류도 갈라야 한다.
 *
 * | 계층 | 묻는 것 | 실패하면 |
 * |---|---|---|
 * | 세션 | 로그인했는가 | `/login` 으로 보낸다. 원래 가려던 주소를 기억한다 |
 * | 소속 | 이 앱을 쓸 수 있는 사람인가 | `/no-access` |
 * | 행 | 이 행을 볼 수 있는가 | **목록에서 빠진다.** 거부 화면이 아니다 (도메인 패키지의 술어가 한다) |
 *
 * ⚠ 셋째 계층은 이 포트가 하지 않는다. 그것은 **모든 조회와 모든 쓰기마다** 다시 하는 판정이고,
 *    "화면을 지나 왔다" 를 근거로 삼지 않는다.
 *
 * ⚠ **요청 스코프다.** 모듈 스코프 런타임(`ManagedRuntime`)에 올리면 서버 렌더가 같은 프로세스에서 동시에 돌 때
 *    요청 간 교차 오염이 난다. 액션마다 `Effect.provide` 로 준다.
 */
export class NoSession extends Schema.TaggedError<NoSession>()(
    "NoSession",
    { reason: Schema.String },
)
{}

/**
 * 로그인은 했으나 **이 앱**을 쓸 수 있는 사람이 아니다. `/no-access` 로 간다.
 *
 * ⚠ 이름에 앱이 들어가지 않는다. 앱들이 같은 포트를 쓰고 판정은 `access/membership.ts` 가 앱마다 다르게
 *    내리므로, 오류 이름이 한 앱을 가리키면 나머지 앱에서 뜻이 어긋난다(2026-09-14 개명, 종전 NotAdvisorUser).
 */
export class NotAppMember extends Schema.TaggedError<NotAppMember>()(
    "NotAppMember",
    { reason: Schema.String },
)
{}

export class ActorResolver extends Context.Service<ActorResolver, {
    /** 이번 요청의 행위자. 익명 폴백을 두지 않는다 */
    readonly current: Effect.Effect<Actor, NoSession | NotAppMember>;
}>()("@investment/access/ports/ActorResolver")
{}
