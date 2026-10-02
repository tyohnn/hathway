import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import type { Company, Filing } from "@investment/schema";
import type { FinPeriodRow, RawSection } from "@investment/market/domain/rows";
import { FilingDocuments } from "@investment/market/ports/MarketStore";
import { marketMemory, type MarketSeed } from "@investment/market/testing/marketMemory";

import { companyPage, filingSection, noteSections } from "./market";

const company: Company = {
    corp_code: "C1", name: "크래프톤", stock_code: "259960", market: "KOSPI", sector_code: "5821",
    fiscal_month: 12, ceo: "김창한", established: "2007-03-26",
};

const period = (over: Partial<FinPeriodRow>): FinPeriodRow => ({
    corp_code: "C1", period_key: "2024A", fs_div: "CFS", bsns_year: 2024, period_type: "A", values: {}, ...over,
});

const report = (n: number, rcept_dt: string): Filing => ({
    rcept_no: `R${n}`, corp_code: "C1", report_nm: "사업보고서", flr_nm: null, rcept_dt, rm: null, is_correction: false,
});

const section = (rcept_no: string, sec_no: number): RawSection => ({
    rcept_no, sec_no, title: "주석", content: "본문", is_note: true, is_biz: false,
});

const run = <A, E>(seed: MarketSeed, program: Effect.Effect<A, E, Layer.Success<ReturnType<typeof marketMemory>>>) =>
    Effect.runPromise(program.pipe(Effect.provide(marketMemory(seed))));

describe("종목 화면의 조립", () =>
{
    it("없는 종목코드면 null 이다. 화면은 404 를 그린다", async () =>
    {
        expect(await run({}, companyPage("000000", ["revenue"]))).toBeNull();
    });

    it("연간 요약과 투자 현금흐름과 재무 격자가 같은 기간에서 나온다", async () =>
    {
        const page = await run(
            {
                companies: [company],
                periods: [
                    period({ values: { revenue: 100, cf_investing: -7 } }),
                    period({ period_key: "2024Q1", period_type: "Q1", values: { revenue: 20 } }),
                    period({ period_key: "2024TTM", period_type: "TTM", values: { revenue: 999 } }),
                ],
            },
            companyPage("259960", ["revenue"]),
        );

        expect(page?.company.name).toBe("크래프톤");
        expect(page?.annual.map((row) => row.revenue)).toEqual([100]);
        expect(page?.cfInvesting).toEqual([{ bsns_year: 2024, amount: -7 }]);
        expect(page?.guideFin.annual.map((p) => p.values)).toEqual([{ revenue: 100 }]);
        expect(page?.guideFin.quarters.map((p) => p.periodKey)).toEqual(["2024Q1"]);
    });

    it("공시 조각은 그 공시의 회사 자리에서 찾는다. 공시가 없으면 null 이다", async () =>
    {
        const seed = { companies: [company], filings: [report(1, "2026-03-20")], sections: { "C1/R1": [section("R1", 3)] } };

        expect((await run(seed, filingSection("R1", 3)))?.content).toBe("본문");
        expect(await run(seed, filingSection("R1", 9))).toBeNull();
        expect(await run(seed, filingSection("R404", 3))).toBeNull();
    });

    it("주석 목록은 한도가 차면 다음 보고서를 내려받지 않는다. 내려받기가 가장 비싸다", async () =>
    {
        const asked: string[] = [];
        const counting = Layer.succeed(FilingDocuments, FilingDocuments.of({
            sections: (_corp, rceptNo) => Effect.sync(() =>
            {
                asked.push(rceptNo);

                return [section(rceptNo, 1), section(rceptNo, 2)];
            }),
        }));
        const seed = { companies: [company], filings: [report(1, "2025-03-20"), report(2, "2026-03-20"), report(3, "2024-03-20")] };

        const list = await Effect.runPromise(
            noteSections("C1", 2).pipe(Effect.provide(Layer.merge(marketMemory(seed), counting))),
        );

        expect(list.map((row) => row.rcept_no)).toEqual(["R2", "R2"]);
        expect(asked).toEqual(["R2"]);
    });
});
