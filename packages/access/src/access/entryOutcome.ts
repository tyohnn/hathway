import { Effect } from "effect";

import { ActorResolver } from "../ports/ActorResolver.ts";

/**
 * 셸 안쪽으로 들어갈 수 있는지 판정한다. 인증 두 계층의 결과를 **어휘 하나로** 모은다.
 *
 * 앱마다 셸의 문 앞에서 같은 일을 한다. 행위자를 확정해 보고, 실패의 **종류**에 따라 다른 곳으로
 * 보낸다. 그 파이프라인이 앱마다 복사되어 있었고(resolv-ai 에서 두 앱의 `AuthGate` 가
 * 주석만 다르고 코드가 같았다) 여기로 올렸다.
 *
 * ⚠ **어디로 보낼지는 정하지 않는다.** 주소는 앱의 것이라(`paths`) 이 함수는 어휘만 돌려주고
 *    보내는 일은 앱이 한다. 라우트를 도메인 패키지가 알기 시작하면 앱마다 다른 화면 구조가 여기로
 *    새어 들어온다.
 *
 * ⚠ **실패의 종류를 하나로 접지 않는다.** 세션이 없는 것과 소속이 아닌 것은 사람이 할 일이 다르다.
 *    앞은 다시 로그인하면 되고 뒤는 계정을 열어 달라고 알려야 풀린다. 접으면 화면이 그 둘을 같은
 *    말로 안내하게 된다.
 *
 * ⚠ **이 판정을 지났다는 사실을 셋째 계층의 근거로 쓰지 않는다.** 행 단위 열람권은 조회와 쓰기마다
 *    도메인 패키지의 술어가 다시 본다. 여기서 답하는 것은 「문 앞을 지날 수 있는가」까지다.
 */
export type EntryOutcome = "allowed" | "no-session" | "not-member";

export const entryOutcome: Effect.Effect<EntryOutcome, never, ActorResolver> = Effect.gen(function*()
{
    const resolver = yield* ActorResolver;

    yield* resolver.current;

    return "allowed" as EntryOutcome;
}).pipe(Effect.catchTags({
    NoSession: () => Effect.succeed("no-session" as EntryOutcome),
    NotAppMember: () => Effect.succeed("not-member" as EntryOutcome),
}));
