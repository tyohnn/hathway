import { normalizeLoginEmail } from "./signInLink.ts";

/**
 * 로그인한 사람의 세션을 명부의 계정에 잇는 판정이다.
 *
 * 로그인은 Supabase Auth 가 하고(`auth.users`) 이 사람이 누구인지는 `org.account` 가 답한다. 둘을 잇는
 * 칸이 `org.account.auth_user_id` 다. 이관된 사람과 운영이 admin 에서 더한 사람은 계정 행만 먼저 서
 * 있고 그 칸이 비어 있으므로, 처음 로그인할 때 같은 주소의 계정을 찾아 한 번 잇는다
 * (운영이 먼저 세운 사람).
 *
 * ⚠ **잇는 것은 문을 여는 것이 아니다.** 이은 뒤에도 이 앱을 쓸 수 있는지는 `canEnterApp` 이 판정한다.
 *    여기에 멤버십이나 테넌트 종류를 적으면 문을 여는 술어가 두 벌이 된다.
 */

/** 세션이 서버에서 확인한 사람. `getUser()` 가 Auth 서버에 물어 받은 값이어야 한다 */
export interface SignedInUser
{
    readonly authUserId: string;
    readonly email: string | null;
    readonly emailConfirmed: boolean;
}

/**
 * 인증 서버가 돌려준 사용자에서 잇기에 쓸 것만 꺼낸다. 모든 앱과 토큰 경로가 같은 판정을 쓰도록
 * 이 변환을 한 곳에 둔다.
 *
 * ⚠ **주소를 확인한 시각이 있어야 인증된 주소다.** 매직링크는 링크를 누른 뒤에, 구글은 처음부터 그
 *    시각이 찬다. 모양은 Supabase 의 `User` 에 맞췄지만 그 타입을 가져오지 않는다. 이 패키지의 런타임
 *    의존은 effect 뿐이다.
 */
export const signedInUserOf = (user: {
    readonly id: string;
    readonly email?: string | null | undefined;
    readonly email_confirmed_at?: string | null | undefined;
}): SignedInUser => ({
    authUserId: user.id,
    email: user.email ?? null,
    emailConfirmed: user.email_confirmed_at !== undefined && user.email_confirmed_at !== null,
});

/** 주소로 찾은 계정 하나의 사실. 잇기에 필요한 것만 담는다 */
export interface LinkableAccount
{
    readonly accountId: string;
    readonly authUserId: string | null;
    readonly deactivated: boolean;
}

export type AccountLinkPlan =
    | { readonly _tag: "Link"; readonly accountId: string; readonly email: string }
    | { readonly _tag: "AlreadyLinked"; readonly accountId: string }
    | { readonly _tag: "Refuse"; readonly reason: RefuseReason };

/**
 * 잇지 않는 까닭. 서버 기록에만 남기고 화면에는 드러내지 않는다(INV-ACCESS-06). 명부에 없는 것과
 * 남이 붙어 있는 것이 다른 답으로 보이면 그 차이가 「이 주소는 이 제품의 사람이다」를 밖에 알린다.
 */
export type RefuseReason = "no_email" | "unverified_email" | "no_account" | "deactivated" | "linked_to_other";

/**
 * 주소로 찾은 계정 하나에 이 세션을 이을지 정한다(INV-ACCESS-08).
 *
 * ⚠ **세션의 주소를 먼저 본다.** 주소가 없거나 확인되지 않았으면 계정이 무엇이든 잇지 않는다.
 *    확인되지 않은 주소는 그 주소의 주인이 아니어도 가입할 수 있는 값이다.
 * ⚠ **이미 붙은 칸은 이 세션의 것일 때만 받아들인다.** 다른 세션이 붙어 있으면 덮지 않는다.
 *    퇴사자의 주소를 다시 받은 사람이 그 주소로 로그인하는 일이 실제로 생긴다.
 * ⚠ **`Link` 는 소문자로 접은 주소를 들고 나간다.** 쓰는 쪽이 그 주소로 계정을 한 번 더 확인해서,
 *    판정과 쓰기 사이에 주소가 바뀐 계정에는 붙지 않는다.
 */
export const planAccountLink = (user: SignedInUser, account: LinkableAccount | null): AccountLinkPlan =>
{
    const email = user.email === null ? null : normalizeLoginEmail(user.email);

    if (email === null)
    {
        return { _tag: "Refuse", reason: "no_email" };
    }

    if (!user.emailConfirmed)
    {
        return { _tag: "Refuse", reason: "unverified_email" };
    }

    if (account === null)
    {
        return { _tag: "Refuse", reason: "no_account" };
    }

    if (account.deactivated)
    {
        return { _tag: "Refuse", reason: "deactivated" };
    }

    if (account.authUserId === user.authUserId)
    {
        return { _tag: "AlreadyLinked", accountId: account.accountId };
    }

    if (account.authUserId !== null)
    {
        return { _tag: "Refuse", reason: "linked_to_other" };
    }

    return { _tag: "Link", accountId: account.accountId, email };
};
