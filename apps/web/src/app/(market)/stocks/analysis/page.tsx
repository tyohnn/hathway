import Link from "next/link";
import type { Metadata } from "next";
import { companyHref } from "@/lib/company";
import { listCompanies } from "@/lib/platform/db";
import { EmptyState } from "@hathway/blocks/empty-state";
import { PageHeader } from "@hathway/blocks/page-header";
import { Badge } from "@hathway/ui/components/badge";
import { CardAction, CardContent, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { MotionSurface } from "@/lib/motion/motion-card";
import { StaggerReveal } from "@/lib/motion/stagger-reveal";

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;

export const metadata: Metadata = {
    title: "종목 분석",
};


export default async function StockAnalysisListPage()
{
    const companies = await listCompanies();

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <PageHeader title="종목 분석" />

            {companies.length === 0 ? (
                <EmptyState title="아직 종목이 없어요" />
            ) : (
                <StaggerReveal className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {companies
                        .filter((c): c is typeof c & { stock_code: string } => Boolean(c.stock_code))
                        .map((c) => (
                            <Link key={c.corp_code} href={companyHref(c.stock_code)} className="group block">
                                <MotionSurface>
                                    <CardHeader>
                                        <CardTitle role="heading" aria-level={2} className="group-hover:text-primary">{c.name}</CardTitle>
                                        {c.market && <CardAction><Badge variant="secondary">{c.market}</Badge></CardAction>}
                                    </CardHeader>
                                    <CardContent>
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                        <div className="flex justify-between">
                                            <dt>종목코드</dt>
                                            <dd className="font-mono text-foreground">{c.stock_code}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt>대표이사</dt>
                                            <dd className="text-foreground">{c.ceo ?? "—"}</dd>
                                        </div>
                                    </dl>
                                    </CardContent>
                                </MotionSurface>
                            </Link>
                        ))}
                </StaggerReveal>
            )}
        </div>
    );
}
