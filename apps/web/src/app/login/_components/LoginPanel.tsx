import { LoginPanel as LoginPanelBlock, loginErrorOf } from "@investment/blocks/auth-screen";

import { signInWithPassword, startGoogleSignIn } from "@/actions/session";
import { localAccountsAllowed } from "@/lib/localAccounts";
import { paths } from "@/lib/paths";
import { safeRedirect } from "@/lib/safeRedirect";

/**
 * 로그인 판. 로그인하면 보드를 만들고 고칠 수 있다. 읽기에는 로그인이 필요 없다.
 *
 * ⚠ 로컬 계정 칸은 개발 서버에서만 선다(`lib/localAccounts.ts`). 배포에서는 구글 하나다.
 */
export async function LoginPanel(
    { searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> },
)
{
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

export { LoginPanelSkeleton } from "@investment/blocks/auth-screen";
