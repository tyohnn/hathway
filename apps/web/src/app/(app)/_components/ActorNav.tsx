import { Effect } from "effect";

import { appRead } from "@/lib/read";

import { Nav } from "./AppShell";
import { BillableSignal } from "./CommandPalette";

/**
 * 행위자에 맞춘 사이드바 메뉴. 운영팀에게는 「요금제」가 서지 않는다(2026-09-29 사용자 결정). 같은 답을 ⌘K 팔레트에도 알린다.
 *
 * ⚠ 행위자를 읽으므로 요청 시점 조각이다. 셸이 메뉴 자리를 `<Suspense>` 로 감싸 두어서 셸 전체는 기다리지 않는다.
 * ⚠ 메뉴를 걷는 것은 모양이다. 운영팀이 주소로 들어와도 요금제 화면은 「요금제 없이 써요」 한 줄만 선다.
 */
export async function ActorNav()
{
    const billable = await appRead((actor) => Effect.succeed(actor.tenantKind !== "operator"));

    return (
        <>
            <Nav billable={billable} />
            <BillableSignal billable={billable} />
        </>
    );
}
