import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Effect } from "effect";

import { entryOutcome } from "@hathway/access/access/entryOutcome";

import { actorResolverLayer } from "@/lib/auth";
import { paths } from "@/lib/paths";

/**
 * 셸 안쪽의 문: 인증의 두 계층을 **매 요청** 다시 지나고, 이 앱의 사람이 아니면 돌려보낸다. 통과하면 아무것도 그리지 않는다.
 *
 * 미들웨어가 이미 세션을 보지만 그것은 문 앞의 안내다. 소속 판정(`org.membership` 을 읽는 둘째 계층)은
 * DB 왕복이 필요해 미들웨어에 둘 수 없고, 그래서 여기가 그 자리다.
 *
 * ⚠ **판정은 `packages/access` 의 `entryOutcome` 이 한다.** 여기 남은 것은 어휘를 이 앱의 주소로 옮기는 일뿐이다.
 * ⚠ **본문을 감싸지 않는다(2026-09-30).** 감싸면 틀이 구워지지 않는다(`layout.tsx`). 데이터가 판정 전에 나가지 않는
 *    것은 이 게이트가 아니라 조회마다 지나는 관문(`appRead`)이 지킨다. 이 게이트는 틀만 보고 있는 사람을 돌려보낸다.
 * ⚠ **실패의 종류마다 가는 곳이 다르다.** 세션이 없으면 `/login`, 소속이 아니면 `/no-access` 다.
 * ⚠ 이 게이트를 지났다는 사실을 **셋째 계층의 근거로 쓰지 않는다.** 행 단위 판정은 조회와 쓰기마다 다시 본다.
 */
export async function AuthGate(): Promise<null>
{
    await connection();

    const outcome = await Effect.runPromise(entryOutcome.pipe(Effect.provide(actorResolverLayer())));

    if (outcome === "no-session")
    {
        redirect(paths.login());
    }

    if (outcome === "not-member")
    {
        redirect(paths.noAccess());
    }

    return null;
}
