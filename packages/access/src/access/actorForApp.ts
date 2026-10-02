import { Effect, Schema } from "effect";

import { ActorFields, type Actor } from "../domain/Actor.ts";
import type { AppAudience } from "../domain/AppAudience.ts";
import { NotAppMember } from "../ports/ActorResolver.ts";
import { canEnterApp, type AccountFacts } from "./membership.ts";

/**
 * 읽어 온 소속 사실에서 이 앱의 행위자를 확정한다. 인증 둘째 계층의 **유일한 통로**다.
 *
 * 어댑터는 `org` 의 행을 사실 그대로 읽고, 그 사실로 문을 열지 말지 정하는 일은 여기서 한다.
 * 그래서 앱이 판정을 각자 적지 않고 자기 이름만 넘긴다.
 *
 * ⚠ **행위자는 지나온 테넌트를 들고 나간다.** 한 계정이 여러 테넌트에 속하면 앱의 표에 맞는
 *    멤버십으로 선다. 그래서 같은 사람이 앱에 따라 다른 범위를 볼 수 있다.
 *
 * ⚠ **거절은 오류 하나로 모은다**(`NotAppMember` 를 던지고 화면은 `/no-access` 로 보낸다).
 *    어느 테넌트에도 속하지 않은 것과 다른 테넌트의 사람인 것이 화면에서 같은 자리로 간다. 다른
 *    자리로 보내려면 그 화면이 먼저 정해져야 한다.
 *
 * ⚠ 이 함수를 지났다는 것은 **문 앞을 지났다**는 뜻이다. 행 단위 판정은 조회와 쓰기마다 다시 한다.
 */
export interface ActorForAppInput
{
    readonly app: AppAudience;
    readonly account: AccountFacts;
}

const decodeFields = Schema.decodeUnknownEffect(ActorFields);

/**
 * 값을 검사해 브랜드를 붙인다. **이 파일 밖으로 내보내지 않는다.**
 *
 * 내보내면 어느 액션에서든 객체 하나를 지어내 행위자를 만들 수 있고, 그러면 `canEnterApp` 이 건너뛸 수
 * 있는 관문이 된다. 이 함수를 여기 가두었기 때문에 운영에서 행위자가 생기는 길이 `actorForApp`
 * 하나로 남는다.
 *
 * 브랜드를 붙이는 단언이 여기 있는 것도 같은 까닭이다. `as Actor` 가 저장소에서 나타나도 되는
 * 자리는 이곳과 `testing/actor.ts` 둘뿐이고, `boundary.test.ts` 가 그것을 확인한다.
 */
const brand = (fields: ActorFields): Actor => fields as Actor;

export const actorForApp = ({ app, account }: ActorForAppInput): Effect.Effect<Actor, NotAppMember> =>
{
    const verdict = canEnterApp({ app, account });

    if (!verdict.allowed)
    {
        return Effect.fail(new NotAppMember({ reason: verdict.reason }));
    }

    const { membership } = verdict;

    return decodeFields({
        accountId: account.accountId,
        tenantId: membership.tenantId,
        tenantKind: membership.tenantKind,
        role: membership.role,
    }).pipe(
        Effect.map(brand),
        Effect.mapError((error) => new NotAppMember({ reason: `행위자를 세우지 못했다: ${String(error)}` })),
    );
};
