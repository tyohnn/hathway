import { describe, expect, it } from "vitest";

import { divisionCountsOf } from "./listing.ts";
import { noteSectionsOf, sectionOf } from "./sections.ts";

describe("상장 분포", () =>
{
    it("KSIC 대분류로 접어 시장마다 센다. 많은 대분류가 먼저다", () =>
    {
        const counts = divisionCountsOf([
            { sector_code: "5821", market: "KOSPI" },
            { sector_code: "58211", market: "KOSDAQ" },
            { sector_code: "28202", market: "KOSDAQ" },
        ]);

        expect(counts.totalListed).toBe(3);
        expect(counts.divisions.map((d) => [d.kospi, d.kosdaq, d.total])).toEqual([[1, 1, 2], [0, 1, 1]]);
    });

    it("업종 코드가 없는 회사는 대분류에는 서지 않지만 상장사 수에는 든다", () =>
    {
        const counts = divisionCountsOf([{ sector_code: null, market: "KOSPI" }]);

        expect(counts).toEqual({ divisions: [], totalListed: 1 });
    });
});

const section = (over: Record<string, unknown> = {}) => ({
    rcept_no: "R1", sec_no: 1, title: "주석", content: "본문", is_note: true, is_biz: false, ...over,
});

describe("공시 본문 조각", () =>
{
    it("주석과 사업의 내용만 목록에 싣고 본문은 싣지 않는다. 목록은 가볍게 둔다", () =>
    {
        const list = noteSectionsOf(
            [{ rcept_no: "R1", report_nm: "사업보고서", rcept_dt: "2026-03-20" }],
            new Map([["R1", [section(), section({ sec_no: 2, is_note: false, title: "기타" }), section({ sec_no: 3, is_note: false, is_biz: true })]]]),
            20,
        );

        expect(list.map((s) => [s.sec_no, s.report_nm, s.filing_rcept_dt, "content" in s])).toEqual([
            [1, "사업보고서", "2026-03-20", false],
            [3, "사업보고서", "2026-03-20", false],
        ]);
    });

    it("한도만큼만 싣는다. 최근 보고서의 조각이 먼저다", () =>
    {
        const list = noteSectionsOf(
            [
                { rcept_no: "R2", report_nm: "분기보고서", rcept_dt: "2026-05-15" },
                { rcept_no: "R1", report_nm: "사업보고서", rcept_dt: "2026-03-20" },
            ],
            new Map([
                ["R2", [section({ rcept_no: "R2", sec_no: 1 }), section({ rcept_no: "R2", sec_no: 2 })]],
                ["R1", [section()]],
            ]),
            2,
        );

        expect(list.map((s) => s.rcept_no)).toEqual(["R2", "R2"]);
    });

    it("본문이 아직 추출되지 않은 보고서는 건너뛴다", () =>
    {
        const list = noteSectionsOf(
            [{ rcept_no: "R9", report_nm: "사업보고서", rcept_dt: "2026-03-20" }, { rcept_no: "R1", report_nm: "반기보고서", rcept_dt: "2025-08-14" }],
            new Map([["R9", null], ["R1", [section()]]]),
            20,
        );

        expect(list.map((s) => s.rcept_no)).toEqual(["R1"]);
    });

    it("조각 하나는 번호로 찾는다. 없으면 null 이다", () =>
    {
        expect(sectionOf([section()], 1)?.title).toBe("주석");
        expect(sectionOf([section()], 9)).toBeNull();
        expect(sectionOf(null, 1)).toBeNull();
    });
});
