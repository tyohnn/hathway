import { Effect } from "effect";

import type { RawSection } from "@investment/market/domain/rows";
import { CompanyDirectory, FilingDocuments, FilingLedger, FinancialPeriods } from "@investment/market/ports/MarketStore";
import { divisionCountsOf, NOTE_SECTION_REPORT_CANDIDATES } from "@investment/market/rules/listing";
import { annualSummaryOf, conceptSeriesOf, guideGridOf, memberFinancialsOf } from "@investment/market/rules/periods";
import { noteSectionsOf, sectionOf } from "@investment/market/rules/sections";

/**
 * 종목 · 재무 · 공시 화면의 조립. 포트로 읽고 규칙으로 접는다.
 *
 * ⚠ **읽기는 공개다.** 공시된 데이터라 행위자를 받지 않는다. 가려야 할 조회가 생기면 술어를 도메인에 먼저 세운다.
 * ⚠ **접는 판단은 여기 없다.** 연결과 별도를 고르는 것, 계약의 칸만 싣는 것은 `@investment/market/rules` 가 한다.
 * ⚠ 한도의 기본값(공시 40 · 지분 변동 60 · 주제 공시 120 · 정정 10 · 주석 20)은 화면이 한 번에 그리는 양이다.
 */
const ALL_PERIODS = ["A", "Q1", "Q2", "Q3", "Q4"] as const;

export const companies = () => Effect.flatMap(CompanyDirectory, (directory) => directory.listAll());

export const companyIndex = () => Effect.flatMap(CompanyDirectory, (directory) => directory.index());

export const company = (stockCode: string) =>
    Effect.flatMap(CompanyDirectory, (directory) => directory.findByStockCode(stockCode));

export const companiesByStockCodes = (stockCodes: ReadonlyArray<string>) =>
    Effect.flatMap(CompanyDirectory, (directory) => directory.findByStockCodes(stockCodes));

export const listedDivisionCounts = () =>
    Effect.flatMap(CompanyDirectory, (directory) => directory.listedSectors()).pipe(Effect.map(divisionCountsOf));

export const annualSummary = (corpCode: string) =>
    Effect.flatMap(FinancialPeriods, (periods) => periods.periodsOf(corpCode, ["A"])).pipe(Effect.map(annualSummaryOf));

export const guideFinGrid = (corpCode: string, concepts: ReadonlyArray<string>) =>
    Effect.flatMap(FinancialPeriods, (periods) => periods.periodsOf(corpCode, ALL_PERIODS))
        .pipe(Effect.map((rows) => guideGridOf(rows, concepts)));

export const conceptSeries = (corpCode: string, concept: string) =>
    Effect.flatMap(FinancialPeriods, (periods) => periods.periodsOf(corpCode, ["A"]))
        .pipe(Effect.map((rows) => conceptSeriesOf(rows, concept)));

export const annualByCorpCodes = (corpCodes: ReadonlyArray<string>, years: ReadonlyArray<number>) =>
    Effect.flatMap(FinancialPeriods, (periods) => periods.annualOfMany(corpCodes, years)).pipe(Effect.map(memberFinancialsOf));

export const filings = (corpCode: string, limit = 40) =>
    Effect.flatMap(FilingLedger, (ledger) => ledger.recent(corpCode, limit));

export const themedFilings = (corpCode: string, limit = 120) =>
    Effect.flatMap(FilingLedger, (ledger) => ledger.themed(corpCode, limit));

export const filingByRceptNo = (rceptNo: string) =>
    Effect.flatMap(FilingLedger, (ledger) => ledger.findByRceptNo(rceptNo));

export const correctionChains = (corpCode: string, limit = 10) =>
    Effect.flatMap(FilingLedger, (ledger) => ledger.correctionChains(corpCode, limit));

export const events = (corpCode: string) => Effect.flatMap(FilingLedger, (ledger) => ledger.events(corpCode));

export const ownershipTxns = (corpCode: string, limit = 60) =>
    Effect.flatMap(FilingLedger, (ledger) => ledger.ownershipTxns(corpCode, limit));

export const trackings = (corpCode: string) => Effect.flatMap(FilingLedger, (ledger) => ledger.trackings(corpCode));

/** 공시 본문의 조각 하나. 조각은 그 공시를 낸 회사의 자리에 있어서 공시부터 찾는다 */
export const filingSection = (rceptNo: string, secNo: number) =>
    Effect.gen(function*()
    {
        const filing = yield* filingByRceptNo(rceptNo);

        if (filing === null)
        {
            return null;
        }

        const documents = yield* FilingDocuments;

        return sectionOf(yield* documents.sections(filing.corp_code, rceptNo), secNo);
    });

/**
 * 주석과 「사업의 내용」의 목록. 최근 정기보고서부터 차례로 내려받고 한도가 차면 멈춘다.
 *
 * ⚠ **한꺼번에 내려받지 않는다.** 조각 덩이는 공시마다 수백 KB 이고 대개 첫 보고서에서 한도가 찬다.
 */
export const noteSections = (corpCode: string, limit = 20) =>
    Effect.gen(function*()
    {
        const ledger = yield* FilingLedger;
        const documents = yield* FilingDocuments;
        const reports = yield* ledger.regularReports(corpCode, NOTE_SECTION_REPORT_CANDIDATES);
        const downloaded = new Map<string, ReadonlyArray<RawSection> | null>();

        for (const report of reports)
        {
            if (noteSectionsOf(reports, downloaded, limit).length >= limit)
            {
                break;
            }

            downloaded.set(report.rcept_no, yield* documents.sections(corpCode, report.rcept_no));
        }

        return noteSectionsOf(reports, downloaded, limit);
    });

/**
 * 종목 화면이 한 번에 읽는 묶음. 없는 종목코드면 `null` 이다.
 *
 * ⚠ **재무 기간은 한 번만 읽는다.** 연간 요약과 투자 현금흐름과 재무 격자가 같은 행에서 나온다. 따로 읽으면 같은 표를
 *    세 번 묻는다.
 */
export const companyPage = (stockCode: string, concepts: ReadonlyArray<string>) =>
    Effect.gen(function*()
    {
        const found = yield* company(stockCode);

        if (found === null)
        {
            return null;
        }

        const corpCode = found.corp_code;
        const periods = yield* FinancialPeriods;
        const [rows, recent, corrections, eventList, facts, sections, ownership, themed] = yield* Effect.all([
            periods.periodsOf(corpCode, ALL_PERIODS),
            filings(corpCode),
            correctionChains(corpCode),
            events(corpCode),
            trackings(corpCode),
            noteSections(corpCode),
            ownershipTxns(corpCode),
            themedFilings(corpCode),
        ], { concurrency: "unbounded" });

        return {
            company: found,
            annual: annualSummaryOf(rows),
            filings: recent,
            corrections,
            events: eventList,
            trackings: facts,
            sections,
            cfInvesting: conceptSeriesOf(rows, "cf_investing"),
            ownershipTxns: ownership,
            themedFilings: themed,
            guideFin: guideGridOf(rows, concepts),
        };
    });
