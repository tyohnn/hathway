import { notFound } from "next/navigation";
import { StockPageShell } from "@/components/stock-page-shell";
import { getCompany } from "@/lib/platform/db";

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;

export default async function StockAnalysisLayout({
    children,
    params,
}: LayoutProps<"/stocks/analysis/[stockCode]">)
{
    const { stockCode } = await params;
    const company = await getCompany(stockCode);
    if (!company) notFound();
    return <StockPageShell company={company}>{children}</StockPageShell>;
}
