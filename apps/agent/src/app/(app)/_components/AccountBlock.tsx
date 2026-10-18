import { connection } from "next/server";

import { AppShellAccount } from "@hathway/blocks/app-shell";

import { signOut } from "@/actions/session";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * 사이드바 발치의 계정 자리를 이 앱의 세션과 액션에 붙이는 얇은 배선. 생김새는 블록이 갖는다.
 *
 * ⚠ 세션을 읽으므로 `<Suspense>` 안쪽이다. 이 한 줄 때문에 사이드바 전체가 늦게 오면 안 되므로
 *    계정만 경계에 넣는다. 기다리는 얼굴은 같은 블록의 `loading` 이다(`layout.tsx`).
 */
export async function AccountBlock()
{
    await connection();

    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();

    return <AppShellAccount email={data.user?.email ?? ""} onSignOut={signOut} />;
}
