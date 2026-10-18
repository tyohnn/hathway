import { Suspense } from "react";
import { Effect } from "effect";

import { appRead } from "@/lib/read";

import { SettingsNav, SettingsNavView } from "./_components/SettingsNav";

/**
 * 설정 화면들의 틀. 왼쪽에 설정의 옆 메뉴, 오른쪽에 화면이다. 사이드바에는 「설정」 한 줄만 서고, 팀 · 내 계정 · 요금제 · 알림은
 * 이 메뉴에 선다(`/ia-design` 의 대시보드 해부도 7번). 설정 화면이 늘어도 사이드바는 그대로다.
 *
 * ⚠ **맨 위에서 아무것도 기다리지 않는다**(루트 `CLAUDE.md` 「정적 껍데기」). 행위자를 읽는 메뉴만 제 `<Suspense>` 안이고, 기다리는 얼굴은
 *    같은 메뉴가 아무것도 켜지지 않은 모습이다. 화면은 곧바로 선다.
 */
export default function SettingsLayout({ children }: { readonly children: React.ReactNode })
{
    return (
        <div className="flex flex-col gap-8 md:flex-row md:gap-10">
            <Suspense fallback={<SettingsNavView billable={false} pathname="" />}>
                <ActorSettingsNav />
            </Suspense>
            <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
        </div>
    );
}

/** 결제하는 조직인지 읽어 메뉴에 넘긴다. 운영팀에게는 「요금제」가 서지 않는다(사이드바의 `ActorNav` 와 같은 판정) */
async function ActorSettingsNav()
{
    const billable = await appRead((actor) => Effect.succeed(actor.tenantKind !== "operator"));

    return <SettingsNav billable={billable} />;
}
