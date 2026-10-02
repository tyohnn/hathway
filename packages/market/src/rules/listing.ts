import { ksicDivision } from "@investment/schema";

import type { DivisionCount, ListedSectorRow } from "../domain/rows.ts";

/**
 * 상장사를 KSIC 대분류로 접어 센다. 산업 지도의 격자가 읽는다.
 *
 * ⚠ 업종 코드가 없는 회사는 대분류에 서지 않지만 상장사 수(`totalListed`)에는 든다.
 */
export const divisionCountsOf = (
    rows: ReadonlyArray<ListedSectorRow>,
): { divisions: DivisionCount[]; totalListed: number } =>
{
    const byDivision = new Map<string, DivisionCount>();

    for (const row of rows)
    {
        const division = ksicDivision(row.sector_code);

        if (!division)
        {
            continue;
        }

        const entry = byDivision.get(division) ?? { division, kospi: 0, kosdaq: 0, total: 0 };

        if (row.market === "KOSPI") entry.kospi += 1;
        else if (row.market === "KOSDAQ") entry.kosdaq += 1;

        entry.total += 1;
        byDivision.set(division, entry);
    }

    return {
        divisions: [...byDivision.values()].sort((a, b) => b.total - a.total),
        totalListed: rows.length,
    };
};

/** 주제 공시를 고르는 낱말. 보고서 이름에 이 가운데 하나가 들면 지분 · 배당 · 자사주 화면에 선다 */
export const THEMED_FILING_PATTERNS = ["대량보유", "주요주주", "배당", "자기주식", "자사주"] as const;

/** 주석과 「사업의 내용」이 든 정기보고서 */
export const REGULAR_REPORT_PATTERNS = ["사업보고서", "분기보고서", "반기보고서"] as const;

/** 주석 목록을 만들 때 뒤져 볼 최근 정기보고서의 수. 저장소에서 내려받는 수를 묶는다 */
export const NOTE_SECTION_REPORT_CANDIDATES = 5;
