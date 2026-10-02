import "server-only";

import { Effect, Layer } from "effect";

import { poolExecutor, postgresPool } from "@investment/adapters-postgres/connection";
import { companyDirectoryPostgresLayer } from "@investment/adapters-postgres/market/CompanyDirectoryPostgres";
import { filingLedgerPostgresLayer } from "@investment/adapters-postgres/market/FilingLedgerPostgres";
import { financialPeriodsPostgresLayer } from "@investment/adapters-postgres/market/FinancialPeriodsPostgres";
import { filingDocumentsSupabaseLayer } from "@investment/adapters-storage/FilingDocumentsSupabase";
import {
    MarketStoreError,
    type CompanyDirectory,
    type FilingDocuments,
    type FilingLedger,
    type FinancialPeriods,
} from "@investment/market/ports/MarketStore";

import { supabaseServiceKey, supabaseUrl } from "./platform/supabase-env";
import { runtime } from "./runtime";

export type Market = CompanyDirectory | FinancialPeriods | FilingLedger | FilingDocuments;

/**
 * 시장 데이터 포트 넷의 구현을 묶는다. 표는 `pg` 로 앱의 롤(`web_app`)이 읽고, 공시 본문 조각만 저장소에서 읽는다.
 *
 * ⚠ **service role 키는 저장소에만 쓴다.** 표를 읽는 길에는 그 키가 없다. 롤이 읽을 수 있는 표는 GRANT 가 정한다.
 * ⚠ **접속 문자열이 없으면 실패로 답한다.** 로컬 기본값으로 떨어지지 않는다. 배포에서 값이 빠지면 엉뚱한 주소에
 *    붙으려다 시간만 쓰고, 원인이 오류에 드러나지 않는다.
 * ⚠ 요청과 무관한 어댑터라 풀과 층을 요청마다 다시 만들어도 같은 풀을 쓴다(`postgresPool` 이 주소로 기억한다).
 */
const marketLayer: Effect.Effect<Layer.Layer<Market>, MarketStoreError> = Effect.suspend(() =>
{
    const connectionString = process.env["WEB_DATABASE_URL"];

    if (connectionString === undefined || connectionString === "")
    {
        return Effect.fail(new MarketStoreError({ message: "WEB_DATABASE_URL 이 설정되지 않았다" }));
    }

    const sql = poolExecutor(postgresPool(connectionString));

    return Effect.succeed(Layer.mergeAll(
        companyDirectoryPostgresLayer(sql),
        financialPeriodsPostgresLayer(sql),
        filingLedgerPostgresLayer(sql),
        filingDocumentsSupabaseLayer({ url: supabaseUrl(), serviceKey: supabaseServiceKey() }),
    ));
});

/** 조회 하나를 돌린다. 실패하면 던진다. 화면이 그것을 잡을지는 화면이 정한다 */
export const runMarket = <A, E>(program: Effect.Effect<A, E, Market>): Promise<A> =>
    runtime.runPromise(Effect.flatMap(marketLayer, (layer) => program.pipe(Effect.provide(layer))));
