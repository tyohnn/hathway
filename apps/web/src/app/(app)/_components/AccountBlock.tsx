import { Effect } from "effect";

import { AppShellAccount } from "@hathway/blocks/app-shell";

import { signOut } from "@/actions/session";
import { ModuleSignedIn } from "@/app/_components/ModuleSlots";
import { appRead } from "@/lib/read";
import { supabaseServer } from "@/lib/supabase/server";
import { teamDirectoryLayer } from "@/lib/teamRuntime";
import { currentOrgName, myself } from "@/usecases/team";

/**
 * 사이드바 발치의 계정 자리를 이 앱의 세션과 액션에 붙이는 얇은 배선. 생김새는 블록이 갖는다.
 *
 * ⚠ 세션을 읽으므로 `<Suspense>` 안쪽이다. 이 한 줄 때문에 사이드바 전체가 늦게 오면 안 되므로
 *    계정만 경계에 넣는다. 기다리는 얼굴은 같은 블록의 `loading` 이다(`layout.tsx`).
 * ⚠ 이름은 명부에서 읽는다(내 계정 화면이 고치는 값). 읽지 못하면 이메일만 적고 사이드바를 깨뜨리지 않는다.
 * ⚠ 여러 조직에 속한 사람에게는 지금 들어온 조직의 이름을 한 줄 더 적는다. 어느 조직의 쪽지와 팀을 보고 있는지 말한다.
 * ⚠ 누가 들어왔는지 아는 자리라 모듈의 「로그인한 사람」 자리(`ModuleSignedIn`)도 여기서 그린다.
 */
export async function AccountBlock()
{
    const { actor, facts } = await appRead((actor) =>
        Effect.flatMap(teamDirectoryLayer, (layer) => Effect.all({ me: myself(actor), org: currentOrgName(actor) }).pipe(Effect.provide(layer))).pipe(
            Effect.orElseSucceed(() => null),
            Effect.map((facts) => ({ actor, facts })),
        ));
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    const name = facts?.me?.name;
    const org = facts?.org;

    return (
        <>
            <AppShellAccount
                email={data.user?.email ?? ""}
                {...(name ? { name } : {})}
                {...(org ? { org } : {})}
                onSignOut={signOut}
            />
            <ModuleSignedIn accountId={actor.accountId} tenantId={actor.tenantId} />
        </>
    );
}
