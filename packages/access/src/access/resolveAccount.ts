import { Effect } from "effect";

import { AccountDirectory } from "../ports/AccountDirectory.ts";
import { AuthSettings } from "../ports/AuthSettings.ts";
import { NotAppMember } from "../ports/ActorResolver.ts";

import { planAccountLink, type SignedInUser } from "./accountLink.ts";
import type { AccountFacts } from "./membership.ts";
import { normalizeLoginEmail } from "./signInLink.ts";

/**
 * 세션으로 계정의 소속 사실을 읽는다. 붙은 계정이 없으면 주소로 찾아 한 번 잇고 다시 읽는다.
 *
 * 모든 앱의 행위자 확정이 이 함수 하나를 지난다(INV-ACCESS-08). 앱마다 잇는 자리가 따로 있으면 어느
 * 앱에서는 이어지고 어느 앱에서는 막히는 문이 넷이 된다.
 *
 * ⚠ **로그인 콜백이 아니라 요청마다 여기서 잇는다.** 콜백은 세션이 생기는 순간 한 번만 돌아서, 잇는
 *    코드가 배포되기 전에 생긴 세션과 콜백을 지나지 않은 토큰은 영영 이어지지 않는다. 이미 붙은
 *    사람은 첫 조회에서 끝나므로 요청마다 쓰기가 나가지 않는다.
 * ⚠ **잇지 못한 까닭을 오류에 싣지 않는다.** 명부에 없는 것과 남이 붙어 있는 것이 같은 답이어야
 *    한다(INV-ACCESS-06). 까닭은 서버 기록에만 남긴다.
 * ⚠ **쓰기 직전에만 인증 서버의 이메일 확인을 묻는다.** 꺼져 있으면 확인 시각이 주소의 주인을 증명하지
 *    못한다. 이미 이어진 사람과 잇지 않을 사람에게는 묻지 않으므로 한 사람당 첫 로그인에 한 번이다.
 * ⚠ **쓰기의 결과를 믿지 않고 다시 읽는다.** 두 요청이 동시에 잇더라도 답은 칸에 실제로 붙은 것이
 *    정한다. 먼저 온 쪽이 이겼으면 진 쪽은 다시 읽어도 없으므로 막힌다.
 */
export const resolveAccountFacts = (
    user: SignedInUser,
): Effect.Effect<AccountFacts, NotAppMember, AccountDirectory | AuthSettings> =>
    Effect.gen(function*()
    {
        const directory = yield* AccountDirectory;
        const facts = yield* directory.factsBySession(user.authUserId);

        if (facts !== null)
        {
            return facts;
        }

        // 주소가 쓸 수 없는 값이면 명부를 뒤지지 않는다. 판정은 아래 planAccountLink 가 다시 한다
        const email = user.email === null ? null : normalizeLoginEmail(user.email);
        const account = email === null || !user.emailConfirmed ? null : yield* directory.linkableByEmail(email);
        const plan = planAccountLink(user, account);

        if (plan._tag === "Refuse")
        {
            yield* Effect.logWarning(`세션을 계정에 잇지 않았다: ${plan.reason}`);

            return yield* new NotAppMember({ reason: NOT_FOUND });
        }

        if (plan._tag === "Link" && !(yield* confirmationEnforced))
        {
            return yield* new NotAppMember({ reason: NOT_FOUND });
        }

        const outcome = plan._tag === "Link"
            ? yield* directory.link({ accountId: plan.accountId, authUserId: user.authUserId, email: plan.email })
            : "linked";
        const linked = yield* directory.factsBySession(user.authUserId);

        if (linked !== null)
        {
            // ⚠ 쓰기가 졌어도 여기로 온다. 한 화면이 행위자를 여러 요청에서 함께 세우면 같은 세션끼리
            //    경쟁하고, 먼저 온 요청이 붙인 칸을 뒤의 요청이 다시 읽는다. 경고할 일이 아니다
            return linked;
        }

        yield* Effect.logWarning(`계정 ${plan.accountId} 에 세션을 붙이지 못했다: ${outcome}`);

        return yield* new NotAppMember({ reason: NOT_FOUND });
    });

/**
 * 잇기 직전에 인증 서버의 이메일 확인이 켜져 있는지 본다. 꺼져 있거나 읽지 못하면 잇지 않는다.
 *
 * ⚠ **읽지 못한 것도 잇지 않는 쪽으로 닫는다.** 설정을 받지 못한 날 잇기를 허용하면 장애가 곧 남의
 *    계정을 가져갈 틈이 된다. 이미 이어진 사람은 여기까지 오지 않으므로 그날도 들어온다.
 */
const confirmationEnforced = Effect.gen(function*()
{
    const enforced = yield* Effect.flatMap(AuthSettings, (settings) => settings.emailConfirmationEnforced).pipe(
        Effect.catchTag("AuthSettingsUnavailable", (error) =>
            Effect.logWarning(`인증 서버 설정을 읽지 못해 잇지 않았다: ${error.reason}`).pipe(Effect.as(null))),
    );

    if (enforced === false)
    {
        yield* Effect.logWarning("세션을 계정에 잇지 않았다: 인증 서버의 이메일 확인이 꺼져 있다");
    }

    return enforced === true;
});

/** `findMembershipsByUserId` 가 계정이 없을 때 내던 것과 같은 문장이다. 잇기가 들어와도 답이 바뀌지 않는다 */
const NOT_FOUND = "org.account 에 이 계정의 행이 없다";
