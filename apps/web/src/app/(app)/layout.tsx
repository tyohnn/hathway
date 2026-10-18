import { Suspense } from "react";

import { AppShellAccount } from "@hathway/blocks/app-shell";

import { AccountBlock } from "./_components/AccountBlock";
import { ActorNav } from "./_components/ActorNav";
import { AppShell } from "./_components/AppShell";
import { AuthGate } from "./_components/AuthGate";

/**
 * 셸을 쓰는 화면 전부의 레이아웃. **틀은 미리 굽고, 기다림은 데이터 가까이에 둔다**(`CLAUDE.md` 「정적 껍데기」).
 *
 * ⚠ **게이트는 본문을 감싸지 않고 옆에 선다.** 감싸면 게이트가 쿠키를 읽는 동안 본문 전체가 요청 시점으로 밀려
 *    아무것도 구워지지 않고, 새로고침마다 공용 뼈대가 먼저 번쩍인다. 옆에 서면 제목 · 폼 같은 틀이 곧바로 선다.
 *    틀에는 데이터가 없으므로 먼저 보여도 새지 않는다. 데이터는 조회마다 관문(`lib/read.ts` 의 `appRead`)이 지킨다.
 * ⚠ **본문을 통째로 감싸는 안전망 `<Suspense>` 를 두지 않는다.** 두면 화면의 코드 조각이 늦게 오는 동안 그 경계가
 *    대신 선다. 맨 위에서 요청 값을 기다리는 화면은 빌드가 막아 준다.
 * ⚠ 이 레이아웃 **최상단에서 세션을 읽지 않는다.** 읽는 조각(계정 · 메뉴 · 게이트)은 저마다 `<Suspense>` 안쪽이다.
 */
export default function AppLayout({ children }: { readonly children: React.ReactNode })
{
    return (
        <AppShell
            nav={<ActorNav />}
            user={
                <Suspense fallback={<AppShellAccount loading />}>
                    <AccountBlock />
                </Suspense>
            }
        >
            <Suspense fallback={null}>
                <AuthGate />
            </Suspense>
            {children}
        </AppShell>
    );
}
