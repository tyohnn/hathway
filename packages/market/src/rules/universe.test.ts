import { describe, expect, it } from "vitest";

import type { Company } from "@hathway/schema";

import type { CompanyIndexRow, MemberFinancials } from "../domain/rows.ts";
import { findCompanies, peerPoolOf, pickPeers, screenOf } from "./universe.ts";

const row = (stock_code: string, name: string, sector_code: string | null, market: CompanyIndexRow["market"] = "KOSPI"): CompanyIndexRow =>
    ({ stock_code, name, market, sector_code });

const INDEX: ReadonlyArray<CompanyIndexRow> = [
    row("259960", "크래프톤", "5821"),
    row("251270", "넷마블", "5821"),
    row("263750", "펄어비스", "58211", "KOSDAQ"),
    row("462870", "시프트업", "58212"),
    row("036570", "엔씨소프트", "582"),
    row("999990", "비상장게임", "5821", null),
    row("247540", "에코프로비엠", "28202", "KOSDAQ"),
    row("086520", "에코프로", "28202", "KOSDAQ"),
];

describe("종목 찾기", () =>
{
    it("종목코드가 같으면 그 종목 하나다", () =>
    {
        expect(findCompanies(INDEX, "259960", 10).map((hit) => hit.name)).toEqual(["크래프톤"]);
    });

    it("영문이 섞인 종목코드는 대소문자를 가리지 않는다", () =>
    {
        const index = [...INDEX, row("0088M0", "새상장", "5821")];

        expect(findCompanies(index, "0088m0", 10).map((hit) => hit.name)).toEqual(["새상장"]);
    });

    it("이름은 띄어쓰기와 대소문자를 가리지 않고, 이름이 그 말로 시작하는 것이 먼저다", () =>
    {
        expect(findCompanies(INDEX, " 에코 프로 ", 10).map((hit) => hit.name)).toEqual(["에코프로", "에코프로비엠"]);
        expect(findCompanies(INDEX, "소프트", 10).map((hit) => hit.name)).toEqual(["엔씨소프트"]);
    });

    it("빈 말은 아무것도 찾지 않고, 한도를 넘지 않는다", () =>
    {
        expect(findCompanies(INDEX, "  ", 10)).toEqual([]);
        expect(findCompanies(INDEX, "에코", 1)).toHaveLength(1);
    });
});

describe("피어", () =>
{
    it("피어 후보는 업종 코드 앞 세 자리가 같은 상장사다. 깊이가 다른 코드도 잡는다", () =>
    {
        const pool = peerPoolOf(INDEX, row("259960", "크래프톤", "5821"));

        expect(pool.map((hit) => hit.name).sort()).toEqual(["넷마블", "시프트업", "엔씨소프트", "펄어비스"]);
    });

    it("업종 코드가 세 자리보다 짧거나 없으면 후보가 없다", () =>
    {
        expect(peerPoolOf(INDEX, row("1", "가", "58"))).toEqual([]);
        expect(peerPoolOf(INDEX, row("1", "가", null))).toEqual([]);
    });

    it("피어는 같은 해 매출이 큰 순으로 고르고, 매출이 없는 회사는 뒤로 간다", () =>
    {
        const picked = pickPeers([
            { corpCode: "a", revenue: 10 },
            { corpCode: "b", revenue: null },
            { corpCode: "c", revenue: 30 },
            { corpCode: "d", revenue: 20 },
        ], 3);

        expect(picked.map((peer) => peer.corpCode)).toEqual(["c", "d", "a"]);
    });
});

const company = (corp_code: string, name: string, sector_code: string, market: Company["market"] = "KOSPI"): Company => ({
    corp_code, name, stock_code: corp_code, market, sector_code, fiscal_month: 12, ceo: null, established: null,
});

const years = (rows: ReadonlyArray<[number, number | null, number | null, number | null]>): MemberFinancials[] =>
    rows.map(([bsns_year, revenue, opm_pct, roe_pct]) => ({ bsns_year, fs_div: "CFS", revenue, opm_pct, roe_pct, debt_ratio_pct: null }));

describe("스크리너", () =>
{
    const companies = [company("a", "가", "5821"), company("b", "나", "58211", "KOSDAQ"), company("c", "다", "28202"), company("d", "라", "5821")];
    const financials = new Map([
        ["a", years([[2022, 100, 10, 5], [2025, 133.1, 30, 20]])],
        ["b", years([[2022, 100, 10, 5], [2025, 300, 25, 10]])],
        ["c", years([[2025, 500, 40, 30]])],
        ["d", years([[2024, 100, 50, 50]])],
    ]);

    it("조건을 모두 지나는 상장사만 남기고 고른 잣대가 높은 순이다", () =>
    {
        const screened = screenOf(companies, financials, { sectorPrefix: "582", minOpmPct: 20, sortBy: "opm", limit: 10 }, 2025);

        expect(screened.rows.map((hit) => hit.company.name)).toEqual(["가", "나"]);
        expect(screened.total).toBe(2);
    });

    it("매출 CAGR 은 기준 해와 3년 전 매출로 잰다", () =>
    {
        const screened = screenOf(companies, financials, { sectorPrefix: "582", sortBy: "revenueCagr", limit: 10 }, 2025);

        expect(screened.rows.map((hit) => [hit.company.name, hit.revenueCagrPct])).toEqual([["나", 44.2], ["가", 10]]);
    });

    it("기준 해의 재무가 없는 회사는 빠지고, 한도를 넘는 줄은 세기만 한다", () =>
    {
        const screened = screenOf(companies, financials, { sortBy: "revenue", limit: 1 }, 2025);

        expect(screened.rows.map((hit) => hit.company.name)).toEqual(["다"]);
        expect(screened.total).toBe(3);
    });

    it("CAGR 을 잴 수 없는 회사는 CAGR 조건을 지나지 못한다", () =>
    {
        const screened = screenOf(companies, financials, { minRevenueCagrPct: 0, sortBy: "opm", limit: 10 }, 2025);

        expect(screened.rows.map((hit) => hit.company.name)).toEqual(["가", "나"]);
    });
});
