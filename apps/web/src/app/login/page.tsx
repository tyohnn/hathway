import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/app/_components/AuthShell";
import { LegalNote } from "@/app/_components/LegalNote";
import { ModuleSignedOut } from "@/app/_components/ModuleSlots";

import { LoginPanel, LoginPanelSkeleton } from "./_components/LoginPanel";

export const metadata: Metadata = { title: "로그인" };

/**
 * 로그인.
 *
 * ⚠ 제목과 설명은 `<Suspense>` **밖**이다. LCP 엘리먼트가 요청 데이터를 기다리면 첫 글자가 늦게 온다.
 *    기다리는 것은 돌아갈 주소와 어긋남뿐이고, 그 둘은 단추 위의 한 줄만 바꾼다.
 * ⚠ 로그아웃하면 여기로 온다. 앞 사람의 흔적을 지우는 모듈의 자리(`ModuleSignedOut`)를 여기서 그린다.
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
            <LegalNote action="로그인하면" />
            <ModuleSignedOut />
        </AuthShell>
    );
}
