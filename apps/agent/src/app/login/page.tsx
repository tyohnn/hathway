import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/app/_components/AuthShell";

import { LoginPanel, LoginPanelSkeleton } from "./_components/LoginPanel";

export const metadata: Metadata = { title: "로그인" };

/**
 * 로그인.
 *
 * ⚠ 제목과 설명은 `<Suspense>` **밖**이다. LCP 엘리먼트가 요청 데이터를 기다리면 첫 글자가 늦게 온다.
 *    기다리는 것은 돌아갈 주소와 어긋남뿐이고, 그 둘은 단추 위의 한 줄만 바꾼다.
 */
export default function LoginPage(
    { searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> },
)
{
    return (
        <AuthShell>
            <Suspense fallback={<LoginPanelSkeleton />}>
                <LoginPanel searchParams={searchParams} />
            </Suspense>
        </AuthShell>
    );
}
