import { connection } from "next/server";

import { LoginPanel as LoginPanelBlock, loginErrorOf } from "@hathway/blocks/auth-screen";

import { signInWithPassword, startGoogleSignIn } from "@/actions/session";
import { localAccountsAllowed } from "@/lib/localAccounts";
import { paths } from "@/lib/paths";
import { safeRedirect } from "@/lib/safeRedirect";

/**
 * 로그인 판을 이 앱의 주소·액션·규칙에 붙이는 얇은 배선.
 *
 * 생김새는 `@hathway/blocks` 의 `LoginPanel` 이 갖는다.
 *
 * ⚠ **요청 시점 값을 읽는 것은 이 파일까지다.** `searchParams` 는 `cacheComponents` 아래에서 `<Suspense>`
 *    안쪽에서 읽어야 라우트가 blocking 이 되지 않는다. 페이지가 약속을 그대로 내려보내고 여기서 기다린다.
 * ⚠ **로컬 계정 문의 규칙은 `lib/localAccounts.ts` 하나가 갖는다.** 서버 액션도 같은 함수를 읽는다.
 */
export async function LoginPanel(
    { searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> },
)
{
    await connection();

    const params = await searchParams;

    return (
        <LoginPanelBlock
            redirectTo={safeRedirect(typeof params.redirect === "string" ? params.redirect : null, paths.home())}
            error={loginErrorOf(params.error)}
            localAccounts={localAccountsAllowed()}
            onGoogleSignIn={startGoogleSignIn}
            onPasswordSignIn={signInWithPassword}
        />
    );
}

export { LoginPanelSkeleton } from "@hathway/blocks/auth-screen";
