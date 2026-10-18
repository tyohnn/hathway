import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Effect } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import { ActorResolver } from "@hathway/access/ports/ActorResolver";

import { actorResolverLayer } from "./auth";
import { paths } from "./paths";

/**
 * 화면이 데이터를 읽는 관문. 서버 액션의 `appAction` 과 짝이다.
 *
 *   ① 요청마다 행위자를 확정한다
 *   ② 세션이 없으면 `/login`, 이 앱의 사람이 아니면 `/no-access` 로 보낸다
 *   ③ 그 뒤에만 `read` 를 부른다. 행 단위 판정은 `read` 가 부르는 유스케이스가 한다
 *
 * ⚠ **데이터를 지키는 것은 셸의 게이트가 아니라 이 관문이다.** 게이트(`AuthGate`)는 본문 옆에 서서 틀을 막지 않는다.
 *    틀(제목 · 폼 · 단추)에는 데이터가 없으므로 게이트보다 먼저 보여도 새지 않고, 데이터는 조회마다 여기를 지난다.
 *    그래서 틀을 미리 구울 수 있다(`CLAUDE.md` 「정적 껍데기」).
 * ⚠ **`<Suspense>` 안쪽에서만 부른다.** 쿠키를 읽으므로 요청 시점 조각이다(`connection`).
 * ⚠ `app/(app)/` 아래에서 행위자를 얻거나 Effect 를 돌리는 길은 이것 하나다(`readBoundary.test.ts`).
 */
export const appRead = async <A>(read: (actor: Actor) => Effect.Effect<A, unknown>): Promise<A> =>
{
    await connection();

    const resolved = await Effect.runPromise(Effect.flatMap(ActorResolver, (resolver) => resolver.current).pipe(
        Effect.map((actor) => ({ _tag: "actor", actor }) as const),
        Effect.catchTags({
            NoSession: () => Effect.succeed({ _tag: "no-session" } as const),
            NotAppMember: () => Effect.succeed({ _tag: "not-member" } as const),
        }),
        Effect.provide(actorResolverLayer()),
    ));

    if (resolved._tag === "no-session")
    {
        redirect(paths.login());
    }

    if (resolved._tag === "not-member")
    {
        redirect(paths.noAccess());
    }

    return Effect.runPromise(read(resolved.actor));
};
