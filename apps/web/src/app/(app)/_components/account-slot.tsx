import Link from "next/link";

import { AppShellAccount } from "@investment/blocks/app-shell";
import { Button } from "@investment/ui/components/button";

import { signOut } from "@/actions/session";
import { paths } from "@/lib/paths";
import { supabaseServer } from "@/lib/supabase/server";
import { viewer } from "@/lib/viewer";

/**
 * 사이드바 아래의 계정 자리. 로그인했으면 계정과 「로그아웃」이, 아니면 「로그인」이 선다.
 *
 * ⚠ 로그인은 됐지만 명부에 없는 계정에도 계정과 「로그아웃」을 보인다. 그 사람이 다른 계정으로 바꿀 길이 여기뿐이다.
 */
export async function AccountSlot()
{
    const email = await signedInEmail();

    if (email === null)
    {
        return (
            <Button
                variant="outline"
                size="sm"
                className="w-full group-data-[collapsible=icon]:hidden"
                nativeButton={false}
                render={<Link href={paths.login()} />}
            >
                로그인
            </Button>
        );
    }

    return <AppShellAccount email={email} onSignOut={signOut} />;
}

/** 세션의 주소. 인증 서버의 설정이 없거나 세션이 없으면 `null` 이다 */
const signedInEmail = async (): Promise<string | null> =>
{
    // 행위자가 서면 세션이 있는 것이다. 서지 않아도 세션은 있을 수 있어서(명부에 없는 계정) 주소는 따로 읽는다
    await viewer();

    try
    {
        const supabase = await supabaseServer();
        const { data } = await supabase.auth.getUser();

        return data.user?.email ?? null;
    }
    catch
    {
        return null;
    }
};
