import { Effect } from "effect";

import { appRead } from "@/lib/read";
import { supabaseServer } from "@/lib/supabase/server";
import { teamDirectoryLayer } from "@/lib/teamRuntime";
import { myAccount } from "@/usecases/team";

import { AccountBody } from "./AccountBody";

/** 내 계정 조회를 기다리는 조각. 요청 시점이라 `<Suspense>` 안쪽에서만 쓴다. 누구의 계정인지는 관문이 넘기는 행위자가 정한다 */
export async function AccountView()
{
    const account = await appRead((actor) => Effect.flatMap(teamDirectoryLayer, (layer) => myAccount(actor).pipe(Effect.provide(layer))));

    // 들어온 길(Google · 이메일)은 명부가 아니라 세션이 안다. 사이드바 발치(`AccountBlock`)와 같은 자리에서 읽는다
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();

    return <AccountBody account={{ ...account, google: data.user?.app_metadata.provider === "google" }} />;
}
