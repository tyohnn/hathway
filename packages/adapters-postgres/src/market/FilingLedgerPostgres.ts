import "server-only";

import { Effect, Layer } from "effect";

import { CorrectionChain, DartEvent, Filing, OwnershipTxn, TrackingFact } from "@investment/schema";
import type { ReportRef } from "@investment/market/domain/rows";
import { FilingLedger } from "@investment/market/ports/MarketStore";
import { REGULAR_REPORT_PATTERNS, THEMED_FILING_PATTERNS } from "@investment/market/rules/listing";

import type { SqlExecutor } from "../connection.ts";

import { parseAll, read, withNumericId } from "./rows.ts";

/**
 * 공시 장부의 Postgres 구현. `public.filings` 와 그 곁의 표(이벤트 · 지분 변동 · 사실 시계열)와 정정 체인 뷰를
 * web_app 으로 읽는다.
 *
 * ⚠ **접수일이 같은 공시의 차례를 접수번호로 정한다.** 옮기기 전에는 접수일로만 줄을 세워 같은 날의 차례가 그때그때
 *    달랐다. 한도에 걸리는 자리에서 어느 공시가 잘리는지가 흔들리지 않게 한다.
 * ⚠ 낱말로 거르는 조건은 `like any($n)` 에 값으로 넘긴다. 낱말의 목록은 도메인의 상수다.
 */
const FILING = "rcept_no, corp_code, report_nm, flr_nm, rcept_dt, rm, is_correction";

const RECENT = `
    select ${FILING} from public.filings
     where corp_code = $1
     order by rcept_dt desc, rcept_no desc
     limit $2
`;

const MATCHING = `
    select ${FILING} from public.filings
     where corp_code = $1
       and report_nm like any($2::text[])
     order by rcept_dt desc, rcept_no desc
     limit $3
`;

const FIND = `select ${FILING} from public.filings where rcept_no = $1`;

const CHAINS = `
    select corp_code, correction_rcept_no, correction_dt, base_report_nm, original_rcept_no, original_dt, days_after_original
      from public.filing_correction_chains
     where corp_code = $1
     order by correction_dt desc, correction_rcept_no desc
     limit $2
`;

const EVENTS = `
    select id, corp_code, event_type, rcept_no, rcept_dt, payload
      from public.events
     where corp_code = $1
     order by rcept_no desc
`;

const OWNERSHIP = `
    select id, corp_code, kind, rcept_no, rcept_dt, payload
      from public.ownership_txns
     where corp_code = $1
     order by rcept_dt desc, id desc
     limit $2
`;

const TRACKINGS = `
    select id, corp_code, topic, fact_date, date_precision, fact, value_text, source, rcept_no, tags
      from public.trackings
     where corp_code = $1
     order by fact_date, id
`;

const containing = (patterns: ReadonlyArray<string>): string[] => patterns.map((pattern) => `%${pattern}%`);

type IdRow = Record<string, unknown> & { id: string };

export const filingLedgerPostgresLayer = (sql: SqlExecutor): Layer.Layer<FilingLedger> =>
    Layer.succeed(FilingLedger, FilingLedger.of({
        recent: (corpCode, limit) =>
            read(sql, "공시", RECENT, [corpCode, limit]).pipe(Effect.map((rows) => parseAll(Filing, rows, "filings"))),

        themed: (corpCode, limit) =>
            read(sql, "주제 공시", MATCHING, [corpCode, containing(THEMED_FILING_PATTERNS), limit]).pipe(
                Effect.map((rows) => parseAll(Filing, rows, "themed_filings")),
            ),

        regularReports: (corpCode, limit) =>
            read(sql, "정기보고서", MATCHING, [corpCode, containing(REGULAR_REPORT_PATTERNS), limit]).pipe(
                Effect.map((rows) => parseAll(Filing, rows, "regular_reports").map((filing): ReportRef => ({
                    rcept_no: filing.rcept_no,
                    report_nm: filing.report_nm,
                    rcept_dt: filing.rcept_dt,
                }))),
            ),

        findByRceptNo: (rceptNo) =>
            read(sql, "공시 찾기", FIND, [rceptNo]).pipe(Effect.map((rows) => parseAll(Filing, rows, "filings")[0] ?? null)),

        correctionChains: (corpCode, limit) =>
            read(sql, "정정 체인", CHAINS, [corpCode, limit]).pipe(
                Effect.map((rows) => parseAll(CorrectionChain, rows, "correction_chains")),
            ),

        events: (corpCode) =>
            read<IdRow>(sql, "이벤트", EVENTS, [corpCode]).pipe(
                Effect.map((rows) => parseAll(DartEvent, rows.map(withNumericId), "events")),
            ),

        ownershipTxns: (corpCode, limit) =>
            read<IdRow>(sql, "지분 변동", OWNERSHIP, [corpCode, limit]).pipe(
                Effect.map((rows) => parseAll(OwnershipTxn, rows.map(withNumericId), "ownership_txns")),
            ),

        trackings: (corpCode) =>
            read<IdRow>(sql, "사실 시계열", TRACKINGS, [corpCode]).pipe(
                Effect.map((rows) => parseAll(TrackingFact, rows.map(withNumericId), "trackings")),
            ),
    }));
