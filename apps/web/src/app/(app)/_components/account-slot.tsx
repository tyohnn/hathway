import Link from "next/link";
import { Effect, Exit } from "effect";

import type { Actor } from "@investment/access/domain/Actor";
import { AppShellAccount } from "@investment/blocks/app-shell";
import { Button } from "@investment/ui/components/button";

import { signOut } from "@/actions/session";
import { paths } from "@/lib/paths";
import { runtime } from "@/lib/runtime";
import { supabaseServer } from "@/lib/supabase/server";
import { teamDirectoryLayer } from "@/lib/teamRuntime";
import { viewer } from "@/lib/viewer";
import { currentOrgName, myself } from "@/usecases/team";

/**
 * 사이드바 아래의 계정 자리. 로그인했으면 계정과 「로그아웃」이, 아니면 「로그인」이 선다.
 *
 * ⚠ 로그인은 됐지만 명부에 없는 계정에도 계정과 「로그아웃」을 보인다. 그 사람이 다른 계정으로 바꿀 길이 여기뿐이다.
 * ⚠ **설정으로 가는 링크는 이 앱의 구성원에게만 선다.** 명부에 없는 사람에게 세우면 눌러서 `/no-access` 로 간다.
 *    링크가 없는 것은 모양이고, 막는 것은 그 화면의 관문(`appRead`)이다.
 */
export async function AccountSlot()
{
    const actor = await viewer();
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

    if (actor === null)
    {
        return <AppShellAccount email={email} onSignOut={signOut} />;
    }

    const { name, org } = await profileOf(actor);

    return (
        <div className="flex flex-col gap-1">
            <AppShellAccount
                email={email}
                onSignOut={signOut}
                {...(name === null ? {} : { name })}
                {...(org === null ? {} : { org })}
            />
            <div className="flex gap-1 group-data-[collapsible=icon]:hidden">
                <Button variant="ghost" size="xs" nativeButton={false} render={<Link href={paths.team()} />}>팀</Button>
                <Button variant="ghost" size="xs" nativeButton={false} render={<Link href={paths.account()} />}>내 계정</Button>
            </div>
        </div>
    );
}

/** 세션의 주소. 인증 서버의 설정이 없거나 세션이 없으면 `null` 이다 */
const signedInEmail = async (): Promise<string | null> =>
{
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

/** 계정 자리에 적을 이름과 조직. 읽지 못해도 셸은 서야 하므로 비워 둔다 */
const profileOf = async (actor: Actor): Promise<{ readonly name: string | null; readonly org: string | null }> =>
{
    const exit = await runtime.runPromiseExit(Effect.flatMap(teamDirectoryLayer, (layer) =>
        Effect.all({ me: myself(actor), org: currentOrgName(actor) }).pipe(Effect.provide(layer))));

    return Exit.isSuccess(exit) ? { name: exit.value.me?.name ?? null, org: exit.value.org } : { name: null, org: null };
};
