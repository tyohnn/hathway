import { afterAll, assert, describe, it } from "vitest";
import { Effect, Layer } from "effect";
import { Pool } from "pg";

import { FIN_PERIOD_COLUMNS } from "@investment/market/domain/rows";
import { CompanyDirectory } from "@investment/market/ports/MarketStore";
import { marketStoreContract } from "@investment/market/testing/contracts/market-store";
import type { MarketSeed } from "@investment/market/testing/marketMemory";

import { closePostgresPools, poolExecutor, postgresPool } from "../connection.ts";
import { localDb } from "../testing/local-db.ts";

import { companyDirectoryPostgresLayer } from "./CompanyDirectoryPostgres.ts";
import { filingLedgerPostgresLayer } from "./FilingLedgerPostgres.ts";
import { financialPeriodsPostgresLayer } from "./FinancialPeriodsPostgres.ts";

/**
 * 시장 데이터 저장소의 계약을 Postgres 구현으로 돌리고, GRANT 가 막기로 된 것을 잰다.
 *
 * ⚠ **재는 질의는 앱의 롤(`web_app`)이 낸다.** 행을 심는 일만 소유자가 한다. 이 표들은 적재가 쓰는 표라 앱의 롤에
 *    쓰기가 없다.
 * ⚠ **심은 회사는 끝나고 지운다.** 지우지 않으면 개발 중인 화면의 종목 검색에 검사용 회사가 쌓인다.
 */
const db = localDb("WEB_DATABASE_URL");
const owner = new Pool({ connectionString: process.env["OWNER_DATABASE_URL"] as string });
const planted = new Set<string>();

const plant = async (seed: MarketSeed): Promise<void> =>
{
    for (const company of seed.companies ?? [])
    {
        planted.add(company.corp_code);
        await owner.query(
            `insert into public.companies (corp_code, name, stock_code, market, sector_code, fiscal_month, ceo, established)
             values ($1, $2, $3, $4, $5, $6, $7, $8::date)`,
            [company.corp_code, company.name, company.stock_code, company.market, company.sector_code,
                company.fiscal_month, company.ceo, company.established],
        );
    }

    for (const period of seed.periods ?? [])
    {
        const columns = FIN_PERIOD_COLUMNS.filter((column) => period.values[column] !== undefined);

        await owner.query(
            `insert into public.fin_periods (corp_code, period_key, fs_div, bsns_year, period_type${columns.map((c) => `, ${c}`).join("")})
             values ($1, $2, $3, $4, $5${columns.map((_, index) => `, $${index + 6}`).join("")})`,
            [period.corp_code, period.period_key, period.fs_div, period.bsns_year, period.period_type,
                ...columns.map((column) => period.values[column])],
        );
    }

    for (const filing of seed.filings ?? [])
    {
        await owner.query(
            `insert into public.filings (rcept_no, corp_code, report_nm, flr_nm, rcept_dt, rm, is_correction)
             values ($1, $2, $3, $4, $5::date, $6, $7)`,
            [filing.rcept_no, filing.corp_code, filing.report_nm, filing.flr_nm, filing.rcept_dt, filing.rm, filing.is_correction],
        );
    }

    // id 는 표가 짓는다. 심는 차례가 곧 id 의 차례다
    for (const event of seed.events ?? [])
    {
        await owner.query(
            "insert into public.events (corp_code, event_type, rcept_no, rcept_dt, payload) values ($1, $2, $3, $4::date, $5::jsonb)",
            [event.corp_code, event.event_type, event.rcept_no, event.rcept_dt, JSON.stringify(event.payload)],
        );
    }

    for (const txn of seed.ownershipTxns ?? [])
    {
        await owner.query(
            "insert into public.ownership_txns (corp_code, kind, rcept_no, rcept_dt, payload) values ($1, $2, $3, $4::date, $5::jsonb)",
            [txn.corp_code, txn.kind, txn.rcept_no, txn.rcept_dt, JSON.stringify(txn.payload)],
        );
    }

    for (const fact of seed.trackings ?? [])
    {
        await owner.query(
            `insert into public.trackings (corp_code, topic, fact_date, date_precision, fact, value_text, source, rcept_no, tags)
             values ($1, $2, $3::date, $4, $5, $6, $7, $8, $9::text[])`,
            [fact.corp_code, fact.topic, fact.fact_date, fact.date_precision, fact.fact, fact.value_text, fact.source,
                fact.rcept_no, fact.tags],
        );
    }
};

const uproot = async (): Promise<void> =>
{
    const corps = [...planted];

    for (const table of ["trackings", "ownership_txns", "events", "fin_periods", "filings", "companies"])
    {
        await owner.query(`delete from public.${table} where corp_code = any($1::text[])`, [corps]);
    }
};

afterAll(async () =>
{
    await uproot();
    await owner.end();
    await closePostgresPools();
});

if (!db.ok)
{
    describe("시장 데이터 저장소 (postgres)", () =>
    {
        throw new Error(db.reason);
    });
}
else
{
    const sql = poolExecutor(postgresPool(db.url));
    const layer = Layer.mergeAll(
        companyDirectoryPostgresLayer(sql),
        financialPeriodsPostgresLayer(sql),
        filingLedgerPostgresLayer(sql),
    );

    marketStoreContract("postgres · web_app", (seed) => Effect.promise(() => plant(seed)).pipe(Effect.as(layer)));

    describe("시장 데이터 표의 성질 (Postgres)", () =>
    {
        it("web_app 은 시장 데이터를 읽기만 한다. 쓰지 못한다", async () =>
        {
            const role = new Pool({ connectionString: db.url });
            const refusals = await Promise.all([
                "insert into public.companies (corp_code, name) values ('X', 'X')",
                "update public.fin_periods set revenue = revenue where false",
                "delete from public.filings where false",
                "update public.events set payload = payload where false",
                "delete from public.ownership_txns where false",
                "update public.trackings set fact = fact where false",
            ].map((statement) => role.query(statement).then(() => "허용됨", (cause: unknown) => String(cause))));

            await role.end();

            for (const refusal of refusals)
            {
                assert.include(refusal, "permission denied");
            }
        });

        it("web_app 은 앱이 읽지 않는 표를 읽지 못한다. 원본 사실과 적재 진행은 열지 않았다", async () =>
        {
            const role = new Pool({ connectionString: db.url });
            const refusals = await Promise.all([
                "select 1 from public.financial_facts limit 1",
                "select 1 from public.report_items limit 1",
            ].map((statement) => role.query(statement).then(() => "허용됨", (cause: unknown) => String(cause))));

            await role.end();

            for (const refusal of refusals)
            {
                assert.include(refusal, "permission denied");
            }
        });

        it("색인은 1000행에서 잘리지 않는다. 옮기기 전의 길은 거기서 조용히 잘랐다", async () =>
        {
            const tag = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();

            await owner.query(
                `insert into public.companies (corp_code, name, stock_code, market)
                 select 'B' || $1 || n, 'ZZBULK-' || $1 || '-' || n, 'B' || $1 || n, 'KOSDAQ'
                   from generate_series(1, 1001) as n`,
                [tag],
            );

            try
            {
                const index = await Effect.runPromise(
                    Effect.flatMap(CompanyDirectory, (directory) => directory.index()).pipe(Effect.provide(layer)),
                );

                assert.lengthOf(index.filter((row) => row.name.startsWith(`ZZBULK-${tag}-`)), 1001);
            }
            finally
            {
                await owner.query("delete from public.companies where corp_code like $1", [`B${tag}%`]);
            }
        });
    });
}
