import { Effect, Layer } from "effect";

import type { Company, CorrectionChain, DartEvent, Filing, OwnershipTxn, TrackingFact } from "@investment/schema";

import type { FinPeriodRow, RawSection } from "../domain/rows.ts";
import { CompanyDirectory, FilingDocuments, FilingLedger, FinancialPeriods } from "../ports/MarketStore.ts";
import { REGULAR_REPORT_PATTERNS, THEMED_FILING_PATTERNS } from "../rules/listing.ts";

/**
 * 시장 데이터의 메모리 구현. 계약이 도커 없이 도는 자리이고, 앱의 조립 검사가 이것을 쓴다.
 *
 * ⚠ **조건과 차례를 SQL 과 같은 뜻으로 적는다.** Postgres 구현은 같은 것을 문장으로 적고, 둘이 갈라지는지를
 *    계약 테스트가 잰다.
 */
export interface MarketSeed
{
    readonly companies?: ReadonlyArray<Company>;
    readonly periods?: ReadonlyArray<FinPeriodRow>;
    readonly filings?: ReadonlyArray<Filing>;
    readonly events?: ReadonlyArray<DartEvent>;
    readonly ownershipTxns?: ReadonlyArray<OwnershipTxn>;
    readonly trackings?: ReadonlyArray<TrackingFact>;
    /** 열쇠는 `회사/접수번호` */
    readonly sections?: Readonly<Record<string, ReadonlyArray<RawSection>>>;
}

const MARKETS = ["KOSPI", "KOSDAQ", "KONEX"] as const;

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const desc = <T>(key: (row: T) => string) => (a: T, b: T): number => byText(key(b), key(a));

const baseName = (reportNm: string): string => reportNm.replace(/^(\[[^\]]+\])+\s*/, "");

const daysBetween = (later: string, earlier: string): number =>
    Math.round((Date.parse(later) - Date.parse(earlier)) / 86_400_000);

const chainsOf = (filings: ReadonlyArray<Filing>, corpCode: string): CorrectionChain[] =>
    filings.filter((filing) => filing.corp_code === corpCode && filing.is_correction).map((filing) =>
    {
        const original = filings
            .filter((other) => other.corp_code === corpCode && other.rcept_no < filing.rcept_no
                && baseName(other.report_nm) === baseName(filing.report_nm))
            .sort(desc((other) => other.rcept_no))[0];

        return {
            corp_code: corpCode,
            correction_rcept_no: filing.rcept_no,
            correction_dt: filing.rcept_dt,
            base_report_nm: baseName(filing.report_nm),
            original_rcept_no: original?.rcept_no ?? null,
            original_dt: original?.rcept_dt ?? null,
            days_after_original: original === undefined ? null : daysBetween(filing.rcept_dt, original.rcept_dt),
        };
    });

export const marketMemory = (seed: MarketSeed = {}): Layer.Layer<CompanyDirectory | FinancialPeriods | FilingLedger | FilingDocuments> =>
{
    const companies = seed.companies ?? [];
    const periods = seed.periods ?? [];
    const filings = seed.filings ?? [];
    const ofCorp = (corpCode: string) => filings.filter((filing) => filing.corp_code === corpCode);
    const matching = (corpCode: string, patterns: ReadonlyArray<string>) =>
        ofCorp(corpCode).filter((filing) => patterns.some((pattern) => filing.report_nm.includes(pattern)))
            .sort(desc((filing) => filing.rcept_dt));

    return Layer.mergeAll(
        Layer.succeed(CompanyDirectory, CompanyDirectory.of({
            listAll: () => Effect.succeed([...companies].sort((a, b) => byText(a.name, b.name))),

            index: () => Effect.succeed(
                companies.flatMap((company) => (company.stock_code === null
                    ? []
                    : [{
                        stock_code: company.stock_code,
                        name: company.name,
                        market: MARKETS.find((market) => market === company.market) ?? null,
                        sector_code: company.sector_code,
                    }])).sort((a, b) => byText(a.name, b.name)),
            ),

            findByStockCode: (stockCode) =>
                Effect.succeed(companies.find((company) => company.stock_code === stockCode) ?? null),

            findByStockCodes: (stockCodes) =>
                Effect.succeed(companies.filter((company) =>
                    company.stock_code !== null && stockCodes.includes(company.stock_code))),

            listedSectors: () => Effect.succeed(
                companies.filter((company) => company.market === "KOSPI" || company.market === "KOSDAQ")
                    .map((company) => ({ sector_code: company.sector_code, market: company.market })),
            ),
        })),

        Layer.succeed(FinancialPeriods, FinancialPeriods.of({
            periodsOf: (corpCode, types) => Effect.succeed(
                periods.filter((row) => row.corp_code === corpCode && (types as ReadonlyArray<string>).includes(row.period_type))
                    .sort((a, b) => byText(a.period_key, b.period_key)),
            ),

            annualOfMany: (corpCodes, years) => Effect.succeed(
                periods.filter((row) => row.period_type === "A" && corpCodes.includes(row.corp_code)
                    && years.includes(row.bsns_year)),
            ),
        })),

        Layer.succeed(FilingLedger, FilingLedger.of({
            recent: (corpCode, limit) =>
                Effect.succeed(ofCorp(corpCode).sort(desc((filing) => filing.rcept_dt)).slice(0, limit)),

            themed: (corpCode, limit) => Effect.succeed(matching(corpCode, THEMED_FILING_PATTERNS).slice(0, limit)),

            regularReports: (corpCode, limit) => Effect.succeed(
                matching(corpCode, REGULAR_REPORT_PATTERNS).slice(0, limit)
                    .map((filing) => ({ rcept_no: filing.rcept_no, report_nm: filing.report_nm, rcept_dt: filing.rcept_dt })),
            ),

            findByRceptNo: (rceptNo) => Effect.succeed(filings.find((filing) => filing.rcept_no === rceptNo) ?? null),

            correctionChains: (corpCode, limit) => Effect.succeed(
                chainsOf(filings, corpCode).sort(desc((chain) => chain.correction_dt)).slice(0, limit),
            ),

            events: (corpCode) => Effect.succeed(
                (seed.events ?? []).filter((event) => event.corp_code === corpCode)
                    .sort(desc((event) => event.rcept_no ?? "￿")),
            ),

            ownershipTxns: (corpCode, limit) => Effect.succeed(
                (seed.ownershipTxns ?? []).filter((txn) => txn.corp_code === corpCode)
                    .sort((a, b) => byText(b.rcept_dt ?? "￿", a.rcept_dt ?? "￿") || b.id - a.id)
                    .slice(0, limit),
            ),

            trackings: (corpCode) => Effect.succeed(
                (seed.trackings ?? []).filter((fact) => fact.corp_code === corpCode)
                    .sort((a, b) => byText(a.fact_date, b.fact_date)),
            ),
        })),

        Layer.succeed(FilingDocuments, FilingDocuments.of({
            sections: (corpCode, rceptNo) => Effect.succeed(seed.sections?.[`${corpCode}/${rceptNo}`] ?? null),
        })),
    );
};
