import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { INDUSTRIES } from "@/lib/industry";
import { listCompanyIndex } from "@/lib/platform/db";
import type { CompanyIndex, IndustryIndex } from "@/lib/platform/company-index";
import { Shell } from "@/components/app-shell";
import { AccountSlot } from "./_components/account-slot";
import { SymbolCommandProvider } from "@/components/symbol-command";
import { INDEXABLE } from "@/lib/site";

/** 종목 · 부동산 화면은 로그인 없이 읽는 공개 화면이라 검색에 연다. 뿌리 레이아웃은 막아 둔다 */
export const metadata: Metadata = { robots: INDEXABLE };

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;

async function loadCompanyIndex(): Promise<CompanyIndex[]>
{
    // 요청 시점을 먼저 기다린다. 아래 catch 가 빌드의 미리 굽기 중단까지 삼키면 빈 검색이 틀에 구워진다
    await connection();
    try
    {
        return await listCompanyIndex();
    }
    catch (error)
    {
        console.warn("[app-shell] 종목 인덱스를 읽지 못했습니다", error);
        return [];
    }
}

function industryIndex(): IndustryIndex[]
{
    return INDUSTRIES.map((industry) => ({
        slug: industry.slug,
        name: industry.name,
        tagline: industry.tagline,
    }));
}

export default async function AppLayout({ children }: { children: ReactNode })
{
    const companies = await loadCompanyIndex();

    return (
        <SymbolCommandProvider companies={companies} industries={industryIndex()}>
            <Shell
                account={(
                    <Suspense fallback={null}>
                        <AccountSlot />
                    </Suspense>
                )}
            >
                {children}
            </Shell>
        </SymbolCommandProvider>
    );
}
