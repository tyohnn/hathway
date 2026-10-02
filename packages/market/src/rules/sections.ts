import type { FilingSection } from "@investment/schema";

import type { NoteSectionListItem, RawSection, ReportRef } from "../domain/rows.ts";

/**
 * 공시 본문의 조각을 화면의 모양으로 고른다. 조각은 저장소에 공시마다 한 덩이로 들어 있다.
 */
const sectionOfRaw = (row: RawSection, content: boolean): FilingSection => ({
    id: row.sec_no,
    rcept_no: row.rcept_no,
    sec_no: row.sec_no,
    title: row.title,
    is_note: row.is_note,
    is_biz: row.is_biz,
    ...(content ? { content: row.content } : {}),
});

/** 조각 하나. 본문을 함께 싣는다 */
export const sectionOf = (sections: ReadonlyArray<RawSection> | null, secNo: number): FilingSection | null =>
{
    const row = sections?.find((section) => section.sec_no === secNo);

    return row === undefined ? null : sectionOfRaw(row, true);
};

/**
 * 주석과 「사업의 내용」의 목록. 최근 보고서부터 한도만큼 싣고 본문은 싣지 않는다.
 *
 * ⚠ 본문이 아직 추출되지 않은 보고서(`null`)는 건너뛴다. 관심 종목이 아니면 추출하지 않는다.
 */
export const noteSectionsOf = (
    reports: ReadonlyArray<ReportRef>,
    sectionsByReport: ReadonlyMap<string, ReadonlyArray<RawSection> | null>,
    limit: number,
): NoteSectionListItem[] =>
{
    const out: NoteSectionListItem[] = [];

    for (const report of reports)
    {
        for (const row of sectionsByReport.get(report.rcept_no) ?? [])
        {
            if (out.length >= limit)
            {
                return out;
            }

            if (row.is_note || row.is_biz)
            {
                out.push({ ...sectionOfRaw(row, false), report_nm: report.report_nm, filing_rcept_dt: report.rcept_dt });
            }
        }
    }

    return out;
};
