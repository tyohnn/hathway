import { StatusBadge } from "@investment/blocks/status-badge";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { analysisHref } from "@/lib/nav";
import { getFilingByRceptNo, getFilingSectionContent } from "@/lib/platform/db";
import { FilingSectionMarkdown } from "@/app/(app)/lab/[stockCode]/_components/filing-section-md";
import { dartUrl, formatKoDate } from "@/app/(app)/lab/[stockCode]/_components/format";

export const revalidate = 0;

export async function generateMetadata(
    props: PageProps<"/stocks/analysis/[stockCode]/filing/[rceptNo]/[secNo]">,
): Promise<Metadata>
{
    const { rceptNo, secNo } = await props.params;
    const section = await getFilingSectionContent(rceptNo, Number(secNo));
    return { title: section ? `${section.title} · 공시 원문` : "공시 원문" };
}

export default async function FilingSectionPage(
    props: PageProps<"/stocks/analysis/[stockCode]/filing/[rceptNo]/[secNo]">,
)
{
    const { stockCode, rceptNo, secNo } = await props.params;
    const [section, filing] = await Promise.all([
        getFilingSectionContent(rceptNo, Number(secNo)),
        getFilingByRceptNo(rceptNo),
    ]);
    if (!section || !section.content) notFound();

    return (
        <div className="space-y-4 pb-16">
            <Link
                href={analysisHref(stockCode, "primary")}
                className="text-sm text-muted-foreground hover:text-foreground"
            >
                ← 1차 자료로 돌아가기
            </Link>

            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {section.is_note && (
                        <StatusBadge tone="warning" label="★ 주석" />
                    )}
                    {section.is_biz && (
                        <StatusBadge tone="info" label="☆ 사업의 내용" />
                    )}
                    {filing && <span>{filing.report_nm}</span>}
                    {filing && <span>· 접수 {formatKoDate(filing.rcept_dt)}</span>}
                </div>
                <h1 className="mt-2 text-xl font-bold tracking-tight">{section.title}</h1>
                <a
                    href={dartUrl(rceptNo)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                    DART 원문 열기 →
                </a>
                <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                    자동으로 변환한 글이라 표가 원문과 다를 수 있어요. 숫자를 인용하기 전에 DART 원문과
                    대조해 주세요.
                </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
                <FilingSectionMarkdown content={section.content} />
            </div>
        </div>
    );
}
