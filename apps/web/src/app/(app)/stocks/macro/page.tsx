import type { Metadata } from "next";
import Link from "next/link";
import { industryMapHref } from "@/lib/nav";

export const metadata: Metadata = {
    title: "거시경제 분석",
};

export default function MacroLandingPage()
{
    return (
        <div className="mx-auto w-full max-w-3xl">
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">거시경제 분석</h1>

            <ul className="mt-8 space-y-3">
                <li>
                    <Link
                        href={industryMapHref()}
                        className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/60"
                    >
                        <h2 className="font-semibold">산업 지도</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            업종별 상장사와 분석한 산업
                        </p>
                    </Link>
                </li>
                <li className="rounded-xl border border-dashed border-border p-5">
                    <h2 className="font-semibold text-muted-foreground">금리 · 환율 · 경기</h2>
                    <p className="mt-1 text-sm text-muted-foreground">매크로 시계열 슬롯 — 아직 비어 있습니다.</p>
                </li>
            </ul>
        </div>
    );
}
