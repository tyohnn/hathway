import "server-only";

import { redirect } from "next/navigation";
import { Effect } from "effect";

import type { Actor } from "@investment/access/domain/Actor";
import { ActorResolver } from "@investment/access/ports/ActorResolver";

import { actorResolverLayer } from "./auth";
import { paths } from "./paths";
import { runtime } from "./runtime";

/**
 * 로그인한 사람만 보는 화면이 데이터를 읽는 관문. 서버 액션의 `appAction` 과 짝이다.
 *
 *   ① 요청마다 행위자를 확정한다
 *   ② 세션이 없으면 `/login`, 이 앱의 사람이 아니면 `/no-access` 로 보낸다
 *   ③ 그 뒤에만 `read` 를 부른다. 행 단위 판정은 `read` 가 부르는 유스케이스가 한다
 *
 * ⚠ **이 앱은 읽기가 공개다. 이 관문은 예외인 자리에만 쓴다.** 지금은 설정(팀 · 내 계정)뿐이다. 종목 · 교재 · 보드처럼
 *    누구나 읽는 화면은 `viewer()` 로 보는 사람을 얻고, 없어도 선다.
 * ⚠ **데이터를 지키는 것은 메뉴가 아니라 이 관문이다.** 설정으로 가는 링크는 로그인한 사람에게만 서지만, 주소를 직접
 *    쳐도 여기서 끊긴다.
 */
export const appRead = async <A>(read: (actor: Actor) => Effect.Effect<A, unknown>, from: string): Promise<A> =>
{
    const resolved = await runtime.runPromise(Effect.flatMap(ActorResolver, (resolver) => resolver.current).pipe(
        Effect.map((actor) => ({ _tag: "actor", actor }) as const),
        Effect.catchTags({
            NoSession: () => Effect.succeed({ _tag: "no-session" } as const),
            NotAppMember: () => Effect.succeed({ _tag: "not-member" } as const),
        }),
        Effect.provide(actorResolverLayer()),
    ));

    if (resolved._tag === "no-session")
    {
        redirect(paths.login(from));
    }

    if (resolved._tag === "not-member")
    {
        redirect(paths.noAccess());
    }

    return runtime.runPromise(read(resolved.actor));
};
