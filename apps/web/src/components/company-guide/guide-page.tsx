import { notFound } from "next/navigation";
import { GuideSections } from "@/components/company-guide/guide-sections";
import { bindGuidePage } from "@/lib/company/guide-bind";
import { getCompanyMenu, type CompanyMenuId } from "@/lib/company";
import { getCompanyPageData } from "@/lib/platform/db";
import { CorrectionChains } from "@/components/analysis-board/correction-chains";
import { EventsSection } from "@/components/analysis-board/events-section";

export async function GuidePage({
    stockCode,
    menuId,
}: {
    stockCode: string;
    menuId: CompanyMenuId;
})
{
    const menu = getCompanyMenu(menuId);
    const data = await getCompanyPageData(stockCode);
    if (!data) notFound();

    const sections = bindGuidePage(menuId, data);

    return (
        <div className="space-y-6 pb-12">
            <GuideSections sections={sections} annual={data.annual} />
            {menuId === "exchange-filings" && data.events.length > 0 && <EventsSection events={data.events} />}
            {menuId === "fss-filings" && data.corrections.length > 0 && (
                <CorrectionChains corrections={data.corrections} />
            )}
            <p className="sr-only">
                {menu.title} 가이드 슬롯 {sections.length}개
            </p>
        </div>
    );
}
