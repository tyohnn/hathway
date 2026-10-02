import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthShell } from "@/app/_components/AuthShell";

import { LoginPanel, LoginPanelSkeleton } from "./_components/LoginPanel";

export const metadata: Metadata = { title: "로그인" };

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
