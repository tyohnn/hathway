"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { localAccountsAllowed } from "@/lib/localAccounts";
import { paths } from "@/lib/paths";
import { safeRedirect } from "@/lib/safeRedirect";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * 세션을 여닫는 액션 셋.
 *
 * ⚠ **이 셋만 관문(`lib/action.ts`)을 지나지 않는다.** 그 관문은 행위자를 확정한 뒤에야 핸들러를 부르는데,
 *    로그인은 행위자가 아직 없는 자리다. 그래서 관문 밖에 두고 대신 **아무 도메인 데이터도 만지지 않는다**:
 *    여기서 하는 일은 Supabase Auth 에 넘기는 것과 돌아갈 주소를 정하는 것뿐이다. 도메인을 만지는 액션이
 *    이 파일에 들어오면 관문을 우회하는 길이 생긴다.
 * ⚠ 돌아갈 주소는 `safeRedirect` 를 지난다. 사람이 주소창에 적을 수 있는 값이다.
 */
const originOf = async (): Promise<string> =>
{
    const store = await headers();
    const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost:3000";
    const protocol = store.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
};

/**
 * 구글로 보낸다. 돌아오는 자리는 `/auth/callback` 이고 거기서 코드가 세션이 된다.
 *
 * ⚠ `redirect()` 는 예외를 던져 흐름을 끊는다. `try` 로 감싸지 말 것: 감싸면 리다이렉트가 오류로 잡힌다.
 */
export async function startGoogleSignIn(formData: FormData): Promise<void>
{
    const next = safeRedirect(String(formData.get("redirect") ?? ""), paths.home());
    const supabase = await supabaseServer();
    const origin = await originOf();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });

    if (error !== null || data.url === null)
    {
        redirect(paths.login(next, "failed"));
    }

    redirect(data.url);
}

/**
 * 로컬 계정으로 들어온다. **문이 열려 있을 때만 선다**(`lib/localAccounts.ts`).
 *
 * ⚠ 닫혀 있으면 아무 일도 하지 않고 로그인 화면으로 돌려보낸다. 화면에서 감추는 것으로는 부족하다:
 *    서버 액션은 화면을 지나지 않고도 불린다. 화면과 이 자리가 **같은 함수**를 읽으므로 둘이 갈라지지 않는다.
 */
export async function signInWithPassword(formData: FormData): Promise<void>
{
    const next = safeRedirect(String(formData.get("redirect") ?? ""), paths.home());

    if (!localAccountsAllowed())
    {
        redirect(paths.login(next, "failed"));
    }

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = await supabaseServer();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error !== null)
    {
        redirect(paths.login(next, "credentials"));
    }

    redirect(next);
}

export async function signOut(): Promise<void>
{
    const supabase = await supabaseServer();

    await supabase.auth.signOut();

    // 이 앱은 로그인하지 않아도 읽을 수 있다. 나간 뒤에는 로그인 화면이 아니라 첫 화면으로 간다
    redirect(paths.home());
}
