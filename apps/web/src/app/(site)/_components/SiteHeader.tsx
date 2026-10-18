import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";

import { buttonVariants } from "@hathway/ui/components/button";

import { paths } from "@/lib/paths";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * 공개 화면(첫 화면 · 블로그 · 문서 · 새 소식)의 머리.
 *
 * ⚠ **페이지를 여는 것은 링크로 그리고 모양만 버튼으로 입힌다**(`buttonVariants`). `Button` 에 링크를 끼우면
 *    `role="button"` 이 붙어 스크린리더가 링크를 단추로 읽는다.
 * ⚠ **세션을 읽는 조각만 `<Suspense>` 안쪽이다.** 나머지 머리와 본문은 프리렌더되고, 오른쪽 단추 하나만 요청 때 선다.
 *    로그인한 사람에게는 「앱 열기」, 아니면 「로그인」이다. 기다리는 동안은 「로그인」을 세운다. 눌러도 미들웨어가
 *    로그인한 사람을 제자리로 돌려보낸다.
 */
const NAV = [
    { label: "문서", href: paths.docs() },
    { label: "블로그", href: paths.blog() },
    { label: "새 소식", href: paths.changelog() },
] as const;

export function SiteHeader()
{
    return (
        <header className="border-border flex h-14 items-center gap-6 border-b px-6">
            <Link href={paths.landing()} className="font-semibold">Hathway</Link>
            <nav aria-label="사이트" className="text-muted-foreground flex items-center gap-4 text-sm">
                {NAV.map((item) => (
                    <Link key={item.href} href={item.href} className="hover:text-foreground">{item.label}</Link>
                ))}
            </nav>
            <div className="ml-auto">
                <AccountButton />
            </div>
        </header>
    );
}

/** 머리 오른쪽의 단추 하나. 문서 · 새 소식의 머리도 같은 것을 세운다 */
export function AccountButton()
{
    return (
        <Suspense fallback={<SignInButton />}>
            <SessionButton />
        </Suspense>
    );
}

function SignInButton()
{
    return <Link data-slot="button" className={buttonVariants({ variant: "outline", size: "sm" })} href={paths.login()}>로그인</Link>;
}

async function SessionButton()
{
    await connection();

    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();

    return data.user === null
        ? <SignInButton />
        : <Link data-slot="button" className={buttonVariants({ size: "sm" })} href={paths.home()}>앱 열기</Link>;
}
