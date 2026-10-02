import { PageHeader } from "@investment/blocks/page-header";
import { SectionHeader } from "@investment/blocks/section-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@investment/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { ksicDivision } from "@investment/schema";
import {
    INDUSTRIES,
    SIEVE_LABELS,
    VERDICT_ORDER,
    industryStockCodes,
    verdictCounts,
    type Industry,
} from "@/lib/industry";
import { getCompaniesByStockCodes, getListedDivisionCounts } from "@/lib/platform/db";
import { SectorGrid, type DivisionCoverage } from "./_components/sector-grid";
import { VerdictBadge } from "./_components/verdict";

export const metadata: Metadata = {
    title: "산업 지도",
    description: "상장사 전체를 업종별로 나누고 분석한 산업을 표시한 지도",
};

// 빌드 환경에는 DB 자격증명이 없으므로 프리렌더가 불가능하다 — revalidate 를 두면
// 이 화면이 빌드 타임에 생성 대상이 되고, db.ts 의 폴백인 로컬 127.0.0.1:54321 로
// 붙으러 가서 빌드가 깨진다(PR #38 최초 실패). 캐시는 데이터 계층에서 건다.
export const revalidate = 0;

export default async function IndustryMapPage()
{
    const [{ divisions, totalListed }, industryMembers] = await Promise.all([
        getListedDivisionCounts(),
        Promise.all(
            INDUSTRIES.map(async (industry) => ({
                industry,
                companies: await getCompaniesByStockCodes(industryStockCodes(industry)),
            })),
        ),
    ]);

    // 격자 하이라이트는 카탈로그의 `ksicPrefixes` 가 아니라 **실제 소속사의 업종코드**로
    // 계산한다. 접두는 재현율을 위해 넓게 던진 그물이라 그대로 칠하면 무관한 회사 수백 개가
    // 그 산업으로 보인다(20 화학만 171개사다).
    const coverage = new Map<string, DivisionCoverage>();
    let coveredCompanies = 0;
    for (const { industry, companies } of industryMembers)
    {
        coveredCompanies += companies.length;
        const perDivision = new Map<string, number>();
        for (const c of companies)
        {
            const d = ksicDivision(c.sector_code);
            if (!d) continue;
            perDivision.set(d, (perDivision.get(d) ?? 0) + 1);
        }
        for (const [division, members] of perDivision)
        {
            const entry = coverage.get(division) ?? { industries: [] };
            entry.industries.push({ slug: industry.slug, name: industry.name, members });
            coverage.set(division, entry);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
            <PageHeader title="산업 지도" />

            <section className="flex flex-col gap-4">
                <SectionHeader
                    level={2}
                    title="분석한 산업"
                    description={`상장 ${totalListed.toLocaleString()}개사 가운데 ${coveredCompanies}개사를 분석했어요.`}
                />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {industryMembers.map(({ industry, companies }) => (
                        <IndustryCard key={industry.slug} industry={industry} listed={companies.length} />
                    ))}
                </div>
            </section>

            <section className="flex flex-col gap-6">
                <SectionHeader
                    level={2}
                    title="업종별 상장사"
                    description="표준산업분류로 나눈 칸이라 한 산업의 회사가 여러 칸에 흩어져 있어요. 색이 있는 칸에는 분석한 산업의 회사 수를 함께 적었어요."
                />
                <SectorGrid divisions={divisions} coverage={coverage} />
            </section>
        </div>
    );
}

function IndustryCard({ industry, listed }: { industry: Industry; listed: number })
{
    const counts = verdictCounts(industry);
    const judged = VERDICT_ORDER.reduce((s, v) => s + counts[v], 0);
    const touched = new Set(
        industry.ksicPrefixes.map((p) => p.slice(0, 2)).filter((p) => p.length === 2),
    );

    return (
        <Link
            href={`/stocks/macro/industries/${encodeURIComponent(industry.slug)}`}
            className="group rounded-[var(--radius-xl)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <Card className="h-full transition-colors group-hover:bg-accent/40">
                <CardHeader>
                    <CardTitle role="heading" aria-level={3} className="group-hover:text-primary">{industry.name}</CardTitle>
                    <CardDescription>{industry.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
                {SIEVE_LABELS[industry.sieveStage]}까지 분석 · {industry.asOf} 기준
            </p>

            <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                    <dt className="text-xs text-muted-foreground">판정 / 상장</dt>
                    <dd className="font-medium tabular-nums">
                        {judged}건 / {listed}개사
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">밸류체인 단계</dt>
                    <dd className="font-medium tabular-nums">{industry.stages.length}개</dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">후보 풀 접두</dt>
                    <dd className="font-mono text-xs">{[...touched].join(" · ")}</dd>
                </div>
            </dl>

            <div className="flex flex-wrap gap-1.5">
                {VERDICT_ORDER.filter((v) => counts[v] > 0).map((v) => (
                    <VerdictBadge key={v} verdict={v} count={counts[v]} />
                ))}
            </div>

            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {industry.summary}
            </p>
                </CardContent>
            </Card>
        </Link>
    );
}
