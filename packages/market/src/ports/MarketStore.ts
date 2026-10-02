import { Context, type Effect, Schema } from "effect";

import type { Company, CorrectionChain, DartEvent, Filing, OwnershipTxn, TrackingFact } from "@investment/schema";

import type { CompanyIndexRow, FinPeriodRow, ListedSectorRow, PeriodType, RawSection, ReportRef } from "../domain/rows.ts";

/**
 * 적재된 시장 데이터를 읽는 포트 넷. 구현은 메모리(`testing/marketMemory.ts`)와 Postgres
 * (`@investment/adapters-postgres/market/*`) 둘이고, 계약 테스트 한 벌이 둘을 함께 잰다.
 *
 * ⚠ **연산마다 메서드가 하나다.** 걸러 내는 조건과 차례와 한도가 메서드에 들어 있다. 화면이 조건을 조립하지 않는다.
 * ⚠ **읽기는 공개다.** 이 데이터는 공시된 것이라 누구에게나 보인다. 그래서 행위자를 받지 않는다.
 * ⚠ **쓰는 메서드가 없다.** 이 표들은 적재(`platform/ingest`)가 쓰고 앱은 읽기만 한다.
 */
export class MarketStoreError extends Schema.TaggedError<MarketStoreError>()(
    "MarketStoreError",
    { message: Schema.String },
)
{}

type Read<A> = Effect.Effect<A, MarketStoreError>;

export class CompanyDirectory extends Context.Service<CompanyDirectory, {
    /** 전부. 이름순 */
    readonly listAll: () => Read<ReadonlyArray<Company>>;
    /** 종목코드가 있는 회사의 가벼운 색인. 이름순이고 수에 한도가 없다 */
    readonly index: () => Read<ReadonlyArray<CompanyIndexRow>>;
    readonly findByStockCode: (stockCode: string) => Read<Company | null>;
    /** 빈 목록이면 묻지 않고 빈 목록으로 답한다 */
    readonly findByStockCodes: (stockCodes: ReadonlyArray<string>) => Read<ReadonlyArray<Company>>;
    /** KOSPI · KOSDAQ 상장사의 업종 코드와 시장 */
    readonly listedSectors: () => Read<ReadonlyArray<ListedSectorRow>>;
}>()("@investment/market/ports/CompanyDirectory")
{}

export class FinancialPeriods extends Context.Service<FinancialPeriods, {
    /** 그 회사의 기간. 고른 종류만, period_key 순 */
    readonly periodsOf: (corpCode: string, types: ReadonlyArray<PeriodType>) => Read<ReadonlyArray<FinPeriodRow>>;
    /** 여러 회사의 연간 행을 연도로 걸러 한 번에. 어느 쪽이든 비면 묻지 않는다 */
    readonly annualOfMany: (
        corpCodes: ReadonlyArray<string>,
        years: ReadonlyArray<number>,
    ) => Read<ReadonlyArray<FinPeriodRow>>;
}>()("@investment/market/ports/FinancialPeriods")
{}

export class FilingLedger extends Context.Service<FilingLedger, {
    /** 최근 접수일이 먼저 */
    readonly recent: (corpCode: string, limit: number) => Read<ReadonlyArray<Filing>>;
    /** 보고서 이름에 주제 낱말(`THEMED_FILING_PATTERNS`)이 든 공시. 최근 접수일이 먼저 */
    readonly themed: (corpCode: string, limit: number) => Read<ReadonlyArray<Filing>>;
    /** 정기보고서(`REGULAR_REPORT_PATTERNS`). 최근 접수일이 먼저 */
    readonly regularReports: (corpCode: string, limit: number) => Read<ReadonlyArray<ReportRef>>;
    readonly findByRceptNo: (rceptNo: string) => Read<Filing | null>;
    /** 정정 공시와 그 원본. 최근 정정이 먼저 */
    readonly correctionChains: (corpCode: string, limit: number) => Read<ReadonlyArray<CorrectionChain>>;
    /** 접수번호가 큰 것부터 */
    readonly events: (corpCode: string) => Read<ReadonlyArray<DartEvent>>;
    /** 최근 접수일이 먼저, 같은 날이면 나중에 적힌 것이 먼저 */
    readonly ownershipTxns: (corpCode: string, limit: number) => Read<ReadonlyArray<OwnershipTxn>>;
    /** 사실의 날짜순 */
    readonly trackings: (corpCode: string) => Read<ReadonlyArray<TrackingFact>>;
}>()("@investment/market/ports/FilingLedger")
{}

export class FilingDocuments extends Context.Service<FilingDocuments, {
    /** 공시 하나의 본문 조각 전부. 아직 추출되지 않았거나 읽지 못하면 `null` 이다 */
    readonly sections: (corpCode: string, rceptNo: string) => Read<ReadonlyArray<RawSection> | null>;
}>()("@investment/market/ports/FilingDocuments")
{}
