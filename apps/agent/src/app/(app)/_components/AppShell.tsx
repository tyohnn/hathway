"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppShell as AppShellBlock, AppShellNav, AppShellTitle } from "@hathway/blocks/app-shell";

import { paths } from "@/lib/paths";

import { GROUPS, LABELS } from "./navGroups";

/**
 * 이 앱의 셸. 생김새와 규격은 `@hathway/blocks` 의 `AppShell` 이 갖고 이 앱은 메뉴와 브랜드만 넘긴다.
 *
 * ⚠ **`usePathname()` 은 `Nav` · `Title` 두 조각 안에서만 부른다.** 셸이 그 둘을 `<Suspense>` 로 감싸므로
 *    경계가 선다. 위로 끌어올리면 동적 라우트의 프리렌더가 `CLIENT_HOOK_DYNAMIC` 으로 멈춘다.
 */
function Nav()
{
    return <AppShellNav groups={GROUPS} pathname={usePathname()} />;
}

function Title()
{
    return <AppShellTitle groups={GROUPS} pathname={usePathname()} labels={LABELS} />;
}

export function AppShell({ user, children }: { readonly user: ReactNode; readonly children: ReactNode })
{
    return (
        <AppShellBlock
            brand={{ mark: "A", name: "Hathway Agent", render: <Link href={paths.home()} /> }}
            groups={GROUPS}
            nav={<Nav />}
            title={<Title />}
            user={user}
            labels={LABELS}
        >
            {children}
        </AppShellBlock>
    );
}
