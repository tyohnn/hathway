import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBoardBySlug } from "@/lib/analysis";
import { getCompanyMenuBySlug } from "@/lib/company";
import { GuidePage } from "@/components/company-guide/guide-page";
import { BoardScreen } from "@/components/analysis-board/board-screen";

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;


export async function generateMetadata(
    props: PageProps<"/stocks/analysis/[stockCode]/[section]">,
): Promise<Metadata>
{
    const { stockCode, section } = await props.params;
    const menu = getCompanyMenuBySlug(section);
    if (menu) return { title: `${menu.title} · ${stockCode}` };
    const board = getBoardBySlug(section);
    if (board) return { title: `${board.title} · ${stockCode}` };
    return { title: stockCode };
}

export default async function AnalysisSectionPage(
    props: PageProps<"/stocks/analysis/[stockCode]/[section]">,
)
{
    const { stockCode, section } = await props.params;
    const menu = getCompanyMenuBySlug(section);
    if (menu) return <GuidePage stockCode={stockCode} menuId={menu.id} />;
    const board = getBoardBySlug(section);
    if (board) return <BoardScreen stockCode={stockCode} boardId={board.id} />;
    notFound();
}
