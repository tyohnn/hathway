import { assert, describe, it } from "@effect/vitest";
import { Effect, type Layer } from "effect";

import type { Company, DartEvent, Filing, OwnershipTxn, TrackingFact } from "@investment/schema";

import type { FinPeriodRow } from "../../domain/rows.ts";
import { CompanyDirectory, FilingLedger, FinancialPeriods } from "../../ports/MarketStore.ts";
import type { MarketSeed } from "../marketMemory.ts";

/**
 * 시장 데이터 저장소의 계약. 메모리 구현과 Postgres 구현이 **같은 코드로** 돈다.
 *
 * ⚠ **단언은 이 검사가 심은 회사만 본다.** Postgres 는 적재된 실제 회사와 다른 검사가 한 표를 함께 쓴다. 회사 코드는
 *    검사마다 새로 짓는다.
 * ⚠ 이름과 코드는 영문과 숫자로 짓는다. 이름순의 차례가 데이터베이스의 정렬 규칙에 기대지 않게 하려는 것이다.
 */
export type MakeMarket = (seed: MarketSeed) => Effect.Effect<Layer.Layer<CompanyDirectory | FinancialPeriods | FilingLedger>>;

const fresh = (): string => crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

const company = (corp: string, over: Partial<Company> = {}): Company => ({
    corp_code: corp,
    name: `ZZ-${corp}`,
    stock_code: `S${corp.slice(0, 5)}`,
    market: "KOSPI",
    sector_code: "5821",
    fiscal_month: 12,
    ceo: null,
    established: "2007-03-26",
    ...over,
});

const period = (corp: string, over: Partial<FinPeriodRow> = {}): FinPeriodRow => ({
    corp_code: corp,
    period_key: "2024A",
    fs_div: "CFS",
    bsns_year: 2024,
    period_type: "A",
    values: {},
    ...over,
});

const filing = (corp: string, n: number, over: Partial<Filing> = {}): Filing => ({
    rcept_no: `${corp}${String(n).padStart(6, "0")}`,
    corp_code: corp,
    report_nm: "주요사항보고서",
    flr_nm: null,
    rcept_dt: "2026-01-01",
    rm: null,
    is_correction: false,
    ...over,
});

export const marketStoreContract = (name: string, make: MakeMarket): void =>
{
    const within = <A, E>(seed: MarketSeed, program: Effect.Effect<A, E, CompanyDirectory | FinancialPeriods | FilingLedger>) =>
        Effect.gen(function*()
        {
            const layer = yield* make(seed);

            return yield* program.pipe(Effect.provide(layer));
        });

    describe(`회사 명부 (${name})`, () =>
    {
        it.effect("회사는 종목코드로 찾는다. 없으면 null 이다", () =>
        {
            const corp = fresh();
            const seeded = company(corp);

            return within({ companies: [seeded] }, Effect.gen(function*()
            {
                const directory = yield* CompanyDirectory;

                assert.deepStrictEqual(yield* directory.findByStockCode(seeded.stock_code ?? ""), seeded);
                assert.isNull(yield* directory.findByStockCode(`NONE${fresh()}`));
            }));
        });

        it.effect("종목코드 여럿으로 한 번에 찾는다. 빈 목록이면 빈 목록으로 답한다", () =>
        {
            const [a, b] = [company(fresh()), company(fresh())];

            return within({ companies: [a, b, company(fresh())] }, Effect.gen(function*()
            {
                const directory = yield* CompanyDirectory;
                const found = yield* directory.findByStockCodes([a.stock_code ?? "", b.stock_code ?? ""]);

                assert.deepStrictEqual(found.map((row) => row.corp_code).sort(), [a.corp_code, b.corp_code].sort());
                assert.deepStrictEqual(yield* directory.findByStockCodes([]), []);
            }));
        });

        it.effect("색인에는 종목코드가 있는 회사만 온다. 비상장은 검색에 서지 않는다", () =>
        {
            const listed = company(fresh());
            const unlisted = company(fresh(), { stock_code: null, market: null });

            return within({ companies: [listed, unlisted] }, Effect.gen(function*()
            {
                const names = (yield* (yield* CompanyDirectory).index()).map((row) => row.name);

                assert.include(names, listed.name);
                assert.notInclude(names, unlisted.name);
            }));
        });

        it.effect("색인은 이름순이고 가벼운 칸 넷만 싣는다", () =>
        {
            const tag = fresh();
            const rows = [
                company(fresh(), { name: `ZZ-${tag}-B` }),
                company(fresh(), { name: `ZZ-${tag}-A`, market: "KOSDAQ", sector_code: null }),
            ];

            return within({ companies: rows }, Effect.gen(function*()
            {
                const mine = (yield* (yield* CompanyDirectory).index()).filter((row) => row.name.startsWith(`ZZ-${tag}`));

                assert.deepStrictEqual(mine, [
                    { stock_code: rows[1]?.stock_code ?? "", name: `ZZ-${tag}-A`, market: "KOSDAQ", sector_code: null },
                    { stock_code: rows[0]?.stock_code ?? "", name: `ZZ-${tag}-B`, market: "KOSPI", sector_code: "5821" },
                ]);
            }));
        });

        it.effect("상장 분포에는 KOSPI 와 KOSDAQ 만 든다. KONEX 와 비상장은 세지 않는다", () =>
        {
            const tag = `9${fresh().slice(0, 4)}`;
            const rows = [
                company(fresh(), { market: "KOSPI", sector_code: tag }),
                company(fresh(), { market: "KOSDAQ", sector_code: tag }),
                company(fresh(), { market: "KONEX", sector_code: tag }),
                company(fresh(), { market: null, stock_code: null, sector_code: tag }),
            ];

            return within({ companies: rows }, Effect.gen(function*()
            {
                const mine = (yield* (yield* CompanyDirectory).listedSectors()).filter((row) => row.sector_code === tag);

                assert.deepStrictEqual(mine.map((row) => row.market).sort(), ["KOSDAQ", "KOSPI"]);
            }));
        });
    });

    describe(`재무 기간 (${name})`, () =>
    {
        it.effect("기간은 그 회사의 것만, 고른 종류만, period_key 순으로 온다", () =>
        {
            const [corp, other] = [fresh(), fresh()];
            const rows = [
                period(corp, { period_key: "2024Q1", period_type: "Q1" }),
                period(corp, { period_key: "2024A" }),
                period(corp, { period_key: "2023A", bsns_year: 2023 }),
                period(corp, { period_key: "2024TTM", period_type: "TTM" }),
                period(other, { period_key: "2024A" }),
            ];

            return within({ companies: [company(corp), company(other)], periods: rows }, Effect.gen(function*()
            {
                const periods = yield* FinancialPeriods;

                assert.deepStrictEqual((yield* periods.periodsOf(corp, ["A"])).map((row) => row.period_key), ["2023A", "2024A"]);
                assert.deepStrictEqual(
                    (yield* periods.periodsOf(corp, ["A", "Q1", "Q2", "Q3", "Q4"])).map((row) => row.period_key),
                    ["2023A", "2024A", "2024Q1"],
                );
            }));
        });

        it.effect("숫자 칸은 수로 온다. 비어 있으면 null 이다", () =>
        {
            const corp = fresh();
            const rows = [period(corp, { values: { revenue: 3_330_000_000_000, opm_pct: 31.7, net_income: -12.5 } })];

            return within({ companies: [company(corp)], periods: rows }, Effect.gen(function*()
            {
                const [row] = yield* (yield* FinancialPeriods).periodsOf(corp, ["A"]);

                assert.strictEqual(row?.values["revenue"], 3_330_000_000_000);
                assert.strictEqual(row?.values["opm_pct"], 31.7);
                assert.strictEqual(row?.values["net_income"], -12.5);
                assert.isNull(row?.values["ebitda"] ?? null);
                assert.strictEqual(row?.fs_div, "CFS");
                assert.strictEqual(row?.bsns_year, 2024);
            }));
        });

        it.effect("연결과 별도가 함께 있으면 둘 다 온다. 접는 것은 규칙의 몫이다", () =>
        {
            const corp = fresh();
            const rows = [period(corp, { fs_div: "CFS" }), period(corp, { fs_div: "OFS" })];

            return within({ companies: [company(corp)], periods: rows }, Effect.gen(function*()
            {
                const found = yield* (yield* FinancialPeriods).periodsOf(corp, ["A"]);

                assert.deepStrictEqual(found.map((row) => row.fs_div).sort(), ["CFS", "OFS"]);
            }));
        });

        it.effect("여러 회사의 연간 행을 연도로 걸러 한 번에 읽는다. 어느 쪽이든 비면 빈 목록이다", () =>
        {
            const [a, b] = [fresh(), fresh()];
            const rows = [
                period(a, { period_key: "2024A", bsns_year: 2024 }),
                period(a, { period_key: "2021A", bsns_year: 2021 }),
                period(a, { period_key: "2024Q1", period_type: "Q1" }),
                period(b, { period_key: "2023A", bsns_year: 2023 }),
            ];

            return within({ companies: [company(a), company(b)], periods: rows }, Effect.gen(function*()
            {
                const periods = yield* FinancialPeriods;
                const found = yield* periods.annualOfMany([a, b], [2023, 2024]);

                assert.deepStrictEqual(found.map((row) => `${row.corp_code === a ? "a" : "b"}:${row.period_key}`).sort(), ["a:2024A", "b:2023A"]);
                assert.deepStrictEqual(yield* periods.annualOfMany([], [2024]), []);
                assert.deepStrictEqual(yield* periods.annualOfMany([a], []), []);
            }));
        });
    });

    describe(`공시 장부 (${name})`, () =>
    {
        it.effect("공시는 최근 접수일이 먼저이고 한도만큼만 온다", () =>
        {
            const corp = fresh();
            const rows = [
                filing(corp, 1, { rcept_dt: "2026-01-10" }),
                filing(corp, 2, { rcept_dt: "2026-03-01" }),
                filing(corp, 3, { rcept_dt: "2025-12-31" }),
            ];

            return within({ companies: [company(corp)], filings: rows }, Effect.gen(function*()
            {
                const found = yield* (yield* FilingLedger).recent(corp, 2);

                assert.deepStrictEqual(found.map((row) => row.rcept_dt), ["2026-03-01", "2026-01-10"]);
                assert.deepStrictEqual(found[0], rows[1]);
            }));
        });

        it.effect("주제 공시는 보고서 이름에 대량보유 · 주요주주 · 배당 · 자기주식 · 자사주가 든 것만이다", () =>
        {
            const corp = fresh();
            const rows = [
                filing(corp, 1, { report_nm: "주식등의대량보유상황보고서(일반)", rcept_dt: "2026-01-01" }),
                filing(corp, 2, { report_nm: "임원ㆍ주요주주특정증권등소유상황보고서", rcept_dt: "2026-01-02" }),
                filing(corp, 3, { report_nm: "현금ㆍ현물배당결정", rcept_dt: "2026-01-03" }),
                filing(corp, 4, { report_nm: "주요사항보고서(자기주식취득결정)", rcept_dt: "2026-01-04" }),
                filing(corp, 5, { report_nm: "자사주 소각", rcept_dt: "2026-01-05" }),
                filing(corp, 6, { report_nm: "사업보고서 (2025.12)", rcept_dt: "2026-01-06" }),
            ];

            return within({ companies: [company(corp)], filings: rows }, Effect.gen(function*()
            {
                const ledger = yield* FilingLedger;

                assert.deepStrictEqual((yield* ledger.themed(corp, 120)).map((row) => row.rcept_no), [5, 4, 3, 2, 1].map((n) => rows[n - 1]?.rcept_no));
                assert.lengthOf(yield* ledger.themed(corp, 2), 2);
            }));
        });

        it.effect("정기보고서는 사업 · 분기 · 반기보고서만이고 최근 것부터 한도만큼 온다", () =>
        {
            const corp = fresh();
            const rows = [
                filing(corp, 1, { report_nm: "사업보고서 (2024.12)", rcept_dt: "2025-03-20" }),
                filing(corp, 2, { report_nm: "분기보고서 (2025.03)", rcept_dt: "2025-05-15" }),
                filing(corp, 3, { report_nm: "[기재정정]반기보고서 (2025.06)", rcept_dt: "2025-08-14", is_correction: true }),
                filing(corp, 4, { report_nm: "주요사항보고서", rcept_dt: "2025-09-01" }),
            ];

            return within({ companies: [company(corp)], filings: rows }, Effect.gen(function*()
            {
                const found = yield* (yield* FilingLedger).regularReports(corp, 2);

                assert.deepStrictEqual(found, [
                    { rcept_no: rows[2]?.rcept_no, report_nm: "[기재정정]반기보고서 (2025.06)", rcept_dt: "2025-08-14" },
                    { rcept_no: rows[1]?.rcept_no, report_nm: "분기보고서 (2025.03)", rcept_dt: "2025-05-15" },
                ]);
            }));
        });

        it.effect("접수번호로 공시 하나를 찾는다. 없으면 null 이다", () =>
        {
            const corp = fresh();
            const row = filing(corp, 1, { flr_nm: "제출인", rm: "유" });

            return within({ companies: [company(corp)], filings: [row] }, Effect.gen(function*()
            {
                const ledger = yield* FilingLedger;

                assert.deepStrictEqual(yield* ledger.findByRceptNo(row.rcept_no), row);
                assert.isNull(yield* ledger.findByRceptNo(`NONE${fresh()}`));
            }));
        });

        it.effect("정정 체인은 정정 공시와 그 직전의 같은 이름 공시를 잇고 시차를 날로 센다", () =>
        {
            const corp = fresh();
            const rows = [
                filing(corp, 1, { report_nm: "사업보고서 (2024.12)", rcept_dt: "2025-03-20" }),
                filing(corp, 2, { report_nm: "[기재정정]사업보고서 (2024.12)", rcept_dt: "2025-04-19", is_correction: true }),
                filing(corp, 3, { report_nm: "[기재정정]단일판매ㆍ공급계약체결", rcept_dt: "2025-05-01", is_correction: true }),
            ];

            return within({ companies: [company(corp)], filings: rows }, Effect.gen(function*()
            {
                const chains = yield* (yield* FilingLedger).correctionChains(corp, 10);

                assert.deepStrictEqual(chains, [
                    {
                        corp_code: corp,
                        correction_rcept_no: rows[2]?.rcept_no ?? "",
                        correction_dt: "2025-05-01",
                        base_report_nm: "단일판매ㆍ공급계약체결",
                        original_rcept_no: null,
                        original_dt: null,
                        days_after_original: null,
                    },
                    {
                        corp_code: corp,
                        correction_rcept_no: rows[1]?.rcept_no ?? "",
                        correction_dt: "2025-04-19",
                        base_report_nm: "사업보고서 (2024.12)",
                        original_rcept_no: rows[0]?.rcept_no ?? "",
                        original_dt: "2025-03-20",
                        days_after_original: 30,
                    },
                ]);
            }));
        });

        it.effect("지분 변동은 최근 접수일이 먼저이고 같은 날이면 나중에 적힌 것이 먼저다. id 는 수로 온다", () =>
        {
            const corp = fresh();
            const txn = (rcept_dt: string, repror: string): Omit<OwnershipTxn, "id"> => ({
                corp_code: corp, kind: "elestock", rcept_no: null, rcept_dt, payload: { repror },
            });
            const rows = [txn("2026-01-01", "a"), txn("2026-02-01", "b"), txn("2026-02-01", "c")];

            return within({ companies: [company(corp)], ownershipTxns: rows.map((row, id) => ({ ...row, id: id + 1 })) }, Effect.gen(function*()
            {
                const found = yield* (yield* FilingLedger).ownershipTxns(corp, 2);

                assert.deepStrictEqual(found.map((row) => row.payload["repror"]), ["c", "b"]);
                assert.isNumber(found[0]?.id);
            }));
        });

        it.effect("이벤트는 접수번호가 큰 것부터 온다", () =>
        {
            const corp = fresh();
            const event = (rcept_no: string): Omit<DartEvent, "id"> => ({
                corp_code: corp, event_type: "자기주식취득결정", rcept_no, rcept_dt: null, payload: { aq_dd: "2026년 02월 09일" },
            });
            const rows = [event(`${corp}1`), event(`${corp}3`), event(`${corp}2`)];

            return within({ companies: [company(corp)], events: rows.map((row, id) => ({ ...row, id: id + 1 })) }, Effect.gen(function*()
            {
                const found = yield* (yield* FilingLedger).events(corp);

                assert.deepStrictEqual(found.map((row) => row.rcept_no), [`${corp}3`, `${corp}2`, `${corp}1`]);
                assert.deepStrictEqual(found[0]?.payload, { aq_dd: "2026년 02월 09일" });
                assert.isNumber(found[0]?.id);
            }));
        });

        it.effect("사실 시계열은 사실의 날짜순이다", () =>
        {
            const corp = fresh();
            const fact = (fact_date: string): Omit<TrackingFact, "id"> => ({
                corp_code: corp, topic: "증설", fact_date, date_precision: "month", fact: "착공",
                value_text: null, source: "사업보고서", rcept_no: null, tags: ["capex"],
            });
            const rows = [fact("2026-03-01"), fact("2025-01-01")];

            return within({ companies: [company(corp)], trackings: rows.map((row, id) => ({ ...row, id: id + 1 })) }, Effect.gen(function*()
            {
                const found = yield* (yield* FilingLedger).trackings(corp);

                assert.deepStrictEqual(found.map((row) => row.fact_date), ["2025-01-01", "2026-03-01"]);
                assert.deepStrictEqual(found[0]?.tags, ["capex"]);
                assert.strictEqual(found[0]?.date_precision, "month");
            }));
        });
    });
};
