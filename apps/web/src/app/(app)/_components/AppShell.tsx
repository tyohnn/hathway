"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppShell as AppShellBlock, AppShellNav, AppShellTitle } from "@hathway/blocks/app-shell";

import { paths } from "@/lib/paths";

import { PaletteProvider, ShellTools } from "./CommandPalette";
import { BILLABLE_GROUPS, FOOTER_GROUPS, GROUPS, LABELS, TITLE_GROUPS } from "./navGroups";

/**
 * 이 앱의 셸. 생김새와 규격은 `@hathway/blocks` 의 `AppShell` 이 갖고 이 앱은 메뉴와 브랜드만 넘긴다.
 *
 * 사이드바는 `/ia-design` 의 대시보드 해부도(`references/dashboard.md` 2번)대로 선다. 위에서부터 브랜드 → 도구 줄(찾기 ⌘K ·
 * 만들기) → 개인 묶음 → 객체 메뉴 → 모듈의 묶음이고, 발치에 설정 · 문서와 계정이 선다. 설정 화면들은 사이드바에 따로 서지 않는다.
 *
 * ⚠ **`usePathname()` 은 `Nav` · `FooterNav` · `Title` 조각 안에서만 부른다.** 셸이 그 조각들을 `<Suspense>` 로 감싸므로
 *    경계가 선다. 위로 끌어올리면 동적 라우트의 프리렌더가 `CLIENT_HOOK_DYNAMIC` 으로 멈춘다.
 */
/** 사이드바 메뉴. 결제하는 조직인지는 서버 조각(`ActorNav`)이 행위자를 읽어 알려 준다 */
export function Nav({ billable }: { readonly billable: boolean })
{
    return <AppShellNav groups={billable ? BILLABLE_GROUPS : GROUPS} pathname={usePathname()} />;
}

function FooterNav()
{
    return <AppShellNav groups={FOOTER_GROUPS} pathname={usePathname()} />;
}

// 제목은 모든 메뉴에서 찾는다. 사이드바에 서지 않는 설정 화면도 「설정 › 팀」으로 제 자리를 갖는다
function Title()
{
    return <AppShellTitle groups={TITLE_GROUPS} pathname={usePathname()} labels={LABELS} />;
}

export function AppShell({ nav, user, children }: { readonly nav: ReactNode; readonly user: ReactNode; readonly children: ReactNode })
{
    return (
        <PaletteProvider>
            <AppShellBlock
                brand={{ mark: "H", name: "Hathway", render: <Link href={paths.home()} /> }}
                groups={GROUPS}
                nav={nav}
                tools={<ShellTools />}
                footerGroups={FOOTER_GROUPS}
                footerNav={<FooterNav />}
                title={<Title />}
                user={user}
                labels={LABELS}
            >
                {children}
            </AppShellBlock>
        </PaletteProvider>
    );
}
