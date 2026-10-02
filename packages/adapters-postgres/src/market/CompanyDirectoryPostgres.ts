import "server-only";

import { Effect, Layer } from "effect";

import { Company } from "@investment/schema";
import type { CompanyIndexRow, ListedSectorRow } from "@investment/market/domain/rows";
import { CompanyDirectory } from "@investment/market/ports/MarketStore";

import type { SqlExecutor } from "../connection.ts";

import { parseAll, read } from "./rows.ts";

/**
 * 회사 명부의 Postgres 구현. `public.companies` 를 web_app 으로 읽는다.
 *
 * ⚠ **계약의 칸만 읽는다.** `profile`(jsonb)과 `updated_at` 은 화면이 쓰지 않는다. `select *` 로 실어 오지 않는다.
 * ⚠ **행 수에 한도가 없다.** 옮기기 전의 길(PostgREST)은 1000행에서 조용히 잘라 쪽을 넘겨 읽어야 했다. 직결에는 그 한도가 없다.
 */
const COLUMNS = "corp_code, name, stock_code, market, sector_code, fiscal_month, ceo, established";

const LIST_ALL = `select ${COLUMNS} from public.companies order by name`;

const INDEX = `
    select stock_code, name, market, sector_code
      from public.companies
     where stock_code is not null
     order by name
`;

const FIND = `select ${COLUMNS} from public.companies where stock_code = $1 limit 1`;

const FIND_MANY = `select ${COLUMNS} from public.companies where stock_code = any($1::text[])`;

const LISTED = `
    select sector_code, market
      from public.companies
     where market in ('KOSPI', 'KOSDAQ')
     order by stock_code
`;

type IndexRow = { stock_code: string; name: string; market: string | null; sector_code: string | null };

const MARKETS = ["KOSPI", "KOSDAQ", "KONEX"] as const;

const indexRowOf = (row: IndexRow): CompanyIndexRow => ({
    stock_code: row.stock_code,
    name: row.name,
    market: MARKETS.find((market) => market === row.market) ?? null,
    sector_code: row.sector_code,
});

export const companyDirectoryPostgresLayer = (sql: SqlExecutor): Layer.Layer<CompanyDirectory> =>
    Layer.succeed(CompanyDirectory, CompanyDirectory.of({
        listAll: () =>
            read(sql, "회사 목록", LIST_ALL).pipe(Effect.map((rows) => parseAll(Company, rows, "companies"))),

        index: () =>
            read<IndexRow>(sql, "회사 색인", INDEX).pipe(Effect.map((rows) => rows.map(indexRowOf))),

        findByStockCode: (stockCode) =>
            read(sql, "회사 찾기", FIND, [stockCode]).pipe(
                Effect.map((rows) => parseAll(Company, rows, "companies")[0] ?? null),
            ),

        findByStockCodes: (stockCodes) =>
            (stockCodes.length === 0
                ? Effect.succeed([])
                : read(sql, "회사 여럿 찾기", FIND_MANY, [[...stockCodes]]).pipe(
                    Effect.map((rows) => parseAll(Company, rows, "companies(byStockCodes)")),
                )),

        listedSectors: () => read<ListedSectorRow & Record<string, unknown>>(sql, "상장 분포", LISTED),
    }));
