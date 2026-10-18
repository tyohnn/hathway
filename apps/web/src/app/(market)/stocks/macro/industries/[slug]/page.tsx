import { PageHeader } from "@hathway/blocks/page-header";
import { SectionHeader } from "@hathway/blocks/section-header";
import { Badge } from "@hathway/ui/components/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@hathway/ui/components/card";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ksicDivision, ksicDivisionName } from "@hathway/schema";
import {
    SIEVE_LABELS,
    VERDICT_ORDER,
    getIndustry,
    industryStockCodes,
    unlistedJudged,
    verdictCounts,
} from "@/lib/industry";
import { getAnnualByCorpCodes, getCompaniesByStockCodes } from "@/lib/platform/db";
import { ValueChain, type MemberFacts } from "@/components/industry/value-chain";
import { VerdictBadge } from "@/components/industry/verdict";

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;

export async function generateMetadata(
    props: PageProps<"/stocks/macro/industries/[slug]">,
): Promise<Metadata>
{
    const { slug } = await props.params;
    const industry = getIndustry(decodeURIComponent(slug));
    if (!industry) return { title: "산업" };
    return { title: `${industry.name} 밸류체인`, description: industry.tagline };
}

/** 화면에 세우는 기준 연도. 카탈로그 기준일의 직전 회계연도다. */
const FACT_YEARS = [2023, 2024, 2025];
const DISPLAY_YEAR = 2025;

export default async function IndustryDetailPage(props: PageProps<"/stocks/macro/industries/[slug]">)
{
    const { slug } = await props.params;
    const industry = getIndustry(decodeURIComponent(slug));
    if (!industry) notFound();

    const companies = await getCompaniesByStockCodes(industryStockCodes(industry));
    const annual = await getAnnualByCorpCodes(
        companies.map((c) => c.corp_code),
        FACT_YEARS,
    );

    const facts: MemberFacts = new Map();
    for (const c of companies)
    {
        if (!c.stock_code) continue;
        const rows = annual.get(c.corp_code) ?? [];
        facts.set(c.stock_code, { fsDiv: rows[0]?.fs_div ?? null, rows });
    }

    const counts = verdictCounts(industry);
    const judged = VERDICT_ORDER.reduce((s, v) => s + counts[v], 0);
    const unlisted = unlistedJudged(industry);

    // 격자에서와 같은 규칙: 실제 소속사의 업종코드로 흩어짐을 센다.
    const divisions = new Map<string, number>();
    for (const c of companies)
    {
        const d = ksicDivision(c.sector_code);
        if (d) divisions.set(d, (divisions.get(d) ?? 0) + 1);
    }
    const missing = industryStockCodes(industry).filter(
        (code) => !companies.some((c) => c.stock_code === code),
    );

    return (
        <div className="mx-auto w-full max-w-7xl">
            <PageHeader
                breadcrumb={[{ label: "산업 지도", href: "/stocks/macro/industries" }, { label: industry.name }]}
                title={industry.name}
                description={industry.tagline}
                actions={(
                    <>
                        <Badge variant="secondary">분석 {industry.sieveStage}단계 · {SIEVE_LABELS[industry.sieveStage]}</Badge>
                        <span className="text-xs text-muted-foreground">기준일 {industry.asOf}</span>
                    </>
                )}
            />
            <p className="mt-3 max-w-3xl text-sm leading-relaxed">{industry.summary}</p>

            <div className="mt-6 flex flex-wrap gap-1.5">
                {VERDICT_ORDER.filter((v) => counts[v] > 0).map((v) => (
                    <VerdictBadge key={v} verdict={v} count={counts[v]} />
                ))}
                <Badge variant="outline">판정 합계 {judged}건</Badge>
            </div>
            {unlisted.length > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                    판정 {judged}건 가운데 {unlisted.length}건({unlisted.map((m) => m.name).join(", ")})은
                    종목 화면이 없어요.
                </p>
            )}

            <section className="mt-10">
                <SectionHeader
                    level={2}
                    title="밸류체인 지도"
                    description={`매출과 이익률은 ${DISPLAY_YEAR}년 연결 기준이에요. 연결 재무제표가 없는 회사는 「별도」로 표시했어요.`}
                />
                <div className="mt-5">
                    <ValueChain stages={industry.stages} facts={facts} year={DISPLAY_YEAR} />
                </div>
            </section>

            {industry.phase && (
                <section className="mt-12">
                    <SectionHeader level={2} title="산업 국면 질문 3가지" />
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {industry.phase.map((p) => (
                            <Card key={p.question} size="sm">
                                <CardHeader>
                                    <CardTitle role="heading" aria-level={3}>{p.question}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-2">
                                    <p className="text-sm font-medium text-primary">{p.verdict}</p>
                                    <p className="text-xs leading-relaxed text-muted-foreground">{p.detail}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle role="heading" aria-level={2}>업종 분포</CardTitle>
                        <CardDescription>
                            {companies.length}개사가 업종 {divisions.size}개에 흩어져 있어요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <ul className="flex flex-col gap-1.5">
                        {[...divisions.entries()]
                            .sort((a, b) => b[1] - a[1])
                            .map(([division, n]) => (
                                <li key={division} className="flex items-baseline gap-2 text-xs">
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        {division}
                                    </span>
                                    <span className="flex-1">{ksicDivisionName(division)}</span>
                                    <span className="tabular-nums text-muted-foreground">{n}</span>
                                </li>
                            ))}
                    </ul>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-[11px] text-muted-foreground">
                        <p>
                            채 0단계에서 후보를 긁을 때 쓴 접두:{" "}
                            <span className="font-mono">{industry.ksicPrefixes.join(" · ")}</span>. 빠뜨리지 않으려고
                            넓게 던진 그물이라 무관한 회사가 많이 걸려요.
                        </p>
                        {missing.length > 0 && (
                            <p className="text-warning">정보를 찾지 못한 종목: {missing.join(", ")}</p>
                        )}
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle role="heading" aria-level={2}>출처</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <ul className="flex flex-col gap-2">
                        {industry.sources.map((s) => (
                            <li key={s.path} className="text-xs">
                                <span className="font-medium">{s.label}</span>
                                <br />
                                <code className="text-[10px] text-muted-foreground">{s.path}</code>
                            </li>
                        ))}
                    </ul>
                    </CardContent>
                </Card>
            </section>

            <p className="mt-10 text-[11px] leading-relaxed text-muted-foreground">
                공부하며 분석한 자료예요. 종목 추천이나 투자 권유가 아니에요.
            </p>
        </div>
    );
}
