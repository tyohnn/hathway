import "server-only";

import { Layer, ManagedRuntime } from "effect";

/**
 * 서버 액션에서 Effect 프로그램을 실행하는 런타임이다.
 *
 * `ManagedRuntime` 은 Effect 와 비-Effect 코드(여기서는 Next 서버 액션)를 잇는 다리다. 애플리케이션 Layer 로
 * 런타임을 한 번 만들고, 액션마다 `runPromise` 로 실행한다.
 *
 * ⚠ 여기에는 **요청과 무관한 불변 어댑터만** 올린다. 세션·토큰·사용자별 상태를 품은 서비스를 이 모듈 스코프
 *    런타임에 올리면 서버 렌더가 같은 프로세스에서 동시에 돌면서 **요청 간 교차 오염**이 난다. 요청 스코프
 *    서비스는 액션 안에서 `Effect.provide` 로 그때그때 주입한다(`lib/action.ts` 의 `ActorResolver`).
 *
 * ⚠ 캐시(`use cache`) 트리 안에서 실행되는 Effect 에는 `cookies()`/`headers()` 를 읽는 서비스가 절대 섞이면
 *    안 된다. 빌드는 통과하고 `next start` 에서 터진다.

 */
export const runtime = ManagedRuntime.make(Layer.empty);
