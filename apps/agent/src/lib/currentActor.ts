import "server-only";

import { Effect } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import { ActorResolver } from "@hathway/access/ports/ActorResolver";

import { actorResolverLayer } from "./auth";

/**
 * 서버 컴포넌트가 이번 요청의 행위자를 얻는 자리. 관문과 같은 `ActorResolver` 를 지난다.
 *
 * ⚠ **셸의 게이트를 지났다는 것을 근거로 삼지 않는다.** 화면도 요청마다 행위자를 다시 세우고, 행 단위
 *    판정은 그 행위자로 저장소의 읽는 메서드가 한다. 세우지 못하면 `null` 이고 부르는 쪽이 아무것도
 *    그리지 않는다. 게이트가 같은 요청에서 이미 리다이렉트를 걸었다.
 * ⚠ **행위자를 클라이언트 컴포넌트의 prop 으로 넘기지 말 것.** 직렬화를 지나면 브랜드가 사라진다.
 */
export const currentActor = (): Promise<Actor | null> =>
    Effect.runPromise(
        Effect.flatMap(ActorResolver, (resolver) => resolver.current).pipe(
            Effect.provide(actorResolverLayer()),
            Effect.orElseSucceed(() => null),
        ),
    );
