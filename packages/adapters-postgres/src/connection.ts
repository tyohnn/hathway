// ⚠ 이 import 가 게이트다. 접속 문자열을 다루는 모듈은 클라이언트 번들로 새면 빌드가 깨져야 한다.
import "server-only";

import { Effect } from "effect";
import { Pool, types as pgTypes, type PoolClient, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

/**
 * 전송 층의 로그.
 *
 * 아래 세 자리는 전부 Effect 밖이다. 두 곳은 접속 문자열을 검사하는 순수 헬퍼 안이고
 * 하나는 Pool 의 EventEmitter 콜백이라 Effect 문맥을 물려받을 자리가 없다. 그래서
 * `runFork` 로 한 줄씩 띄운다.
 *
 * ⚠ 이 로그는 앱의 `ManagedRuntime` 밖에서 돌므로 거기 붙인 Logger 레이어를 타지 않고
 *    Effect 기본 로거로 나간다. 나중에 Sentry 같은 것을 Logger 로 붙이면 이 세 줄만
 *    그쪽에 실리지 않으므로, 그때는 접속 문자열 검사를 포트 초기화의 일부로 Effect 안에
 *    끌어올려 해결할 것.
 *
 * ⚠ 종전에는 `@investment/shared/lib/logger` 를 썼다(2026-09-11 제거). 파일 일곱 개에 1,100줄이
 *    드는 로거를 고정 문자열 두 줄과 오류 한 줄을 위해 들고 있었고, 그 로거의 마스킹·전송
 *    계층은 이 자리에서 하는 일이 없었다. `packages/core` 가 이미 Effect 로깅을 쓰므로
 *    축을 하나로 합친다.
 */
const logWarning = (message: string): void =>
{
    Effect.runFork(Effect.logWarning(message, { module: "db" }));
};

const logError = (message: string, error: unknown): void =>
{
    Effect.runFork(Effect.logError(message, { module: "db", error: String(error) }));
};

/**
 * 앱의 Postgres 커넥션: 전송 한 곳.
 *
 * **PostgREST(Data API)를 지나지 않고 SQL 로 직결한다.** 이유가 둘이다(resolv-ai 에서 정한 것).
 *
 * ① **트랜잭션.** PostgREST 는 요청 하나가 트랜잭션 하나다. 여러 표를 함께 넣으려면 plpgsql 함수를 두어야
 *    하는데, 그건 원자성을 얻으려고 **규칙을 DB 로 옮기는 것**이다. 앱이 문장을 조립하면 같은 원자성을 얻으면서
 *    규칙은 도메인에 남는다.
 * ② **표면.** `org`·`notes`·`agent` 를 Data API 노출 목록에서 뺄 수 있다. 이 스키마의 접근 모델은 "권한 판정은 서버 액션 안의
 *    도메인 함수" 이므로, HTTP 로 닿는 경로가 아예 없는 편이 모델과 맞는다.
 *
 * ## Vercel 서버리스 전제
 *
 * 앱은 Vercel 서버리스로 나간다. 그래서 상주 프로세스의 풀과 규칙이 다르다.
 *
 * ⚠ **이 파일은 도메인을 모른다.** 풀·TLS·트랜잭션은 앱이 붙는 방식이지 스키마의 성질이 아니다:
 *    앱이 다른 스키마를 더 읽게 되어도 접속 롤이 앱마다 하나이듯 이 전송도 하나다.
 *    도메인별 어댑터는 `src/<도메인>/` 아래에 두고 이 파일을 함께 쓴다.
 *
 * - **트랜잭션 모드 풀러(6543)를 쓴다.** 세션 모드(5432)는 클라이언트가 끊을 때까지 Postgres 커넥션을 붙잡는데,
 *   서버리스 인스턴스는 요청 사이에 **얼어 있을 뿐 끊지 않는다**: 얼어 있는 인스턴스 수만큼 커넥션이 잠긴다.
 *   트랜잭션 모드는 문장이 끝나면 뒤 커넥션을 돌려주므로 인스턴스가 늘어도 Postgres 의 `max_connections` 를
 *   직접 갉아먹지 않는다. 비로컬 접속이 5432 면 경고를 남긴다.
 * - ⚠ **이름 있는 prepared statement 를 쓰지 말 것.** `pg` 의 기본 경로는 이름 없는(unnamed) 문장이라 트랜잭션
 *   풀링과 맞지만, 질의에 `name` 을 주는 순간 뒤 커넥션이 바뀌면서 "prepared statement does not exist" 가 난다.
 *   같은 이유로 `set`(트랜잭션 밖)·`listen`·세션 수명 advisory lock 도 이 경로에서 쓰지 않는다.
 * - **풀은 모듈 전역에 둔다.** 따뜻한 인스턴스가 재사용하고, 얼어 있는 동안에도 소켓 하나만 든다.
 *
 * ## ⚠ 풀 설정으로 못 거는 것 (2026-09-09 로컬 Supavisor 실측)
 *
 * `statement_timeout`·`application_name` 같은 **클라이언트 시작 파라미터는 트랜잭션 모드에서 백엔드에 닿지 않는다.**
 * 시작 패킷은 풀러에서 끝나고 뒤 커넥션은 풀러가 자기 이름으로 연 것이기 때문이다. 그런데 **거부당하지도 않는다**:
 * 연결은 성공하고 값만 사라진다(실측: `statement_timeout=0`, `application_name=Supavisor`). 증상이 없는 설정이므로
 * 아예 두지 않는다.
 *
 * 같은 실측에서 **롤 설정(`alter role … set`)은 풀러를 통과했다.** 단 설정 시점 이후에 열린 백엔드부터 적용되므로
 * 풀이 한 번 돌아야 한다. 질의 상한을 실제로 걸 자리는 여기가 아니라 그쪽이고, 앱의 접속 롤을 배포에 세울 때
 * 함께 정한다(`docs/decisions/D-2026-09-09-06.md` 의 「남긴 과제」).
 */

/** `date` 는 시각이 아니라 달력의 하루다: OID 1082 */
const DATE_OID = 1082;

/**
 * 인스턴스 하나가 여는 커넥션 상한.
 *
 * 서버리스에서는 **인스턴스 수 × max** 가 실제 부하다. 풀러가 뒤를 다중화하므로 앞을 크게 잡을 이유가 없고,
 * 작게 잡아야 인스턴스가 늘어날 때 곱셈이 완만하다. 한 요청이 커넥션을 여러 개 잡지 않게 할 것.
 */
const POOL_MAX = 3;

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/** 로컬 도커 스택은 TLS 가 없다. 통합 검사가 도는 자리이므로 규칙을 여기서만 푼다 */
export const isLocalHost = (hostname: string): boolean => LOCAL_HOSTS.has(hostname);

/**
 * 접속 문자열의 TLS·포트를 검증·정규화한다.
 *
 * 두 함정을 막는다(실측):
 *
 * ① **Supabase 풀러는 평문 접속을 거부하지 않는다.** `sslmode` 를 빠뜨리면 DB 자격증명과 조회 결과가 평문으로
 *    흐른다 → 누락·`disable` 은 기동 자체를 실패시킨다(fail-close).
 * ② **`pg` v8.22+ 는 `sslmode=require` 를 `verify-full` 로 해석한다**(libpq 와 의미가 다르다). 풀러 인증서는
 *    Node 기본 신뢰 저장소로 검증되지 않아 `self-signed certificate in certificate chain` 으로 실패한다.
 *    `uselibpqcompat=true` 를 붙이면 libpq 의 `require` 의미(암호화하되 체인 미검증)가 된다.
 *
 * ⚠ 체인 미검증이라 MITM 은 막지 못한다. CA 핀닝은 MCP 와 같은 방식으로 뒤에 붙인다.
 */
export const normalizeConnectionString = (raw: string): string =>
{
    let url: URL;

    try
    {
        url = new URL(raw);
    }
    catch
    {
        throw new Error("접속 문자열을 URL 로 해석하지 못했습니다 (postgresql://… 형태여야 합니다)");
    }

    if (isLocalHost(url.hostname))
    {
        return url.toString();
    }

    const sslmode = url.searchParams.get("sslmode");

    if (sslmode === null || sslmode === "" || sslmode === "disable")
    {
        throw new Error(
            "접속 문자열에 sslmode 가 없거나 disable 입니다. "
            + "Supabase 풀러는 평문 접속을 거부하지 않으므로 반드시 명시해야 합니다 "
            + "(권장: ?uselibpqcompat=true&sslmode=require)",
        );
    }

    if (sslmode === "require" && url.searchParams.get("uselibpqcompat") !== "true")
    {
        url.searchParams.set("uselibpqcompat", "true");
        logWarning(
            "접속 문자열에 uselibpqcompat=true 를 자동 적용했다 — "
            + "pg v8.22+ 는 sslmode=require 를 verify-full 로 해석해 Supabase 풀러 연결이 실패한다",
        );
    }

    if (url.port === "5432")
    {
        logWarning(
            "접속 문자열이 5432(세션 모드)를 가리킨다 — 서버리스에서는 얼어 있는 인스턴스가 "
            + "Postgres 커넥션을 붙잡는다. 트랜잭션 모드 포트(6543)를 쓸 것",
        );
    }

    return url.toString();
};

/**
 * `date` 를 문자열 그대로 받는다.
 *
 * `pg` 기본 파서는 `date` 를 **로컬 시간대의 Date** 로 바꾼다. 서버가 KST(UTC+9)라 `2026-09-09` 가
 * `2026-09-08T15:00:00Z` 로 앉고, 그것을 다시 `toISOString().slice(0, 10)` 하면 **하루가 밀린다.**
 * 마감일은 시각이 아니라 달력의 하루이므로 원문 그대로 둔다.
 *
 * ⚠ 전역 `types.setTypeParser` 를 쓰지 않는다: 같은 프로세스의 다른 풀까지 바꾼다.
 */
const dateAsText = (value: string): string => value;

const TYPE_PARSERS: PoolConfig["types"] =
{
    getTypeParser: (oid: number, format?: unknown) =>
        (oid === DATE_OID
            ? dateAsText
            : pgTypes.getTypeParser(oid, format as Parameters<typeof pgTypes.getTypeParser>[1])),
};

/**
 * 풀 보관소.
 *
 * 모듈 전역이 아니라 `globalThis` 에 둔다: Next 개발 모드의 HMR 이 모듈을 다시 평가할 때마다 풀이 새로 생겨
 * 커넥션이 샌다. 접속 문자열을 키로 잡아 테스트가 Layer 를 여러 번 만들어도 풀은 하나다.
 */
interface PoolCache
{
    __impactersPostgresPools?: Map<string, Pool>;
}

const poolCache = (): Map<string, Pool> =>
{
    const store = globalThis as typeof globalThis & PoolCache;

    if (store.__impactersPostgresPools === undefined)
    {
        store.__impactersPostgresPools = new Map<string, Pool>();
    }

    return store.__impactersPostgresPools;
};

export const postgresPool = (rawConnectionString: string): Pool =>
{
    const connectionString = normalizeConnectionString(rawConnectionString);
    const pools = poolCache();
    const existing = pools.get(connectionString);

    if (existing !== undefined)
    {
        return existing;
    }

    const created = new Pool(
        {
            connectionString,
            max: POOL_MAX,
            // 따뜻한 인스턴스가 재사용할 만큼은 살려 두고(재연결 = TLS 핸드셰이크), 식은 인스턴스는 놓게 한다
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
            // 유휴 커넥션이 이벤트 루프를 붙잡아 함수가 끝나지 못하는 일을 막는다
            allowExitOnIdle: true,
            keepAlive: true,
            // ⚠ `statement_timeout`·`application_name` 을 여기 두지 말 것: 트랜잭션 모드 풀러에서 **조용히 사라진다**.
            //    거부당하지 않고 연결은 성공하므로 증상이 없다. 근거와 대안은 위 주석 「⚠ 풀 설정으로 못 거는 것」.
            types: TYPE_PARSERS,
        },
    );

    // 유휴 커넥션에서 터지는 오류는 잡지 않으면 프로세스를 죽인다
    created.on("error", (error) =>
    {
        logError("유휴 커넥션 오류", error);
    });

    pools.set(connectionString, created);

    return created;
};

/**
 * SQL 을 실행하는 대상: **풀일 수도, 트랜잭션 안의 커넥션일 수도** 있다.
 *
 * 어댑터가 `Pool` 을 직접 받으면 트랜잭션 안에서 재사용할 수 없다. 풀에서 커넥션을 새로 뽑아 버리므로 바깥
 * 트랜잭션과 다른 세션이 되고, 그러면 "저장과 기록은 함께"(「쓰기와 기록」)가 성립하지 않는다. 그래서 한 겹을 둔다.
 *
 * ⚠ **중첩 `begin` 은 조용히 위험하다.** 이미 트랜잭션 안에서 `begin` 을 또 열면 Postgres 는 경고만 내고
 *    무시하는데, 뒤이은 `commit` 이 **바깥 트랜잭션까지 커밋한다.** 그래서 트랜잭션 안의 실행자는
 *    `transact` 를 **그대로 실행**만 한다: 경계는 가장 바깥 하나다.
 */
export interface SqlExecutor
{
    readonly query: <R extends QueryResultRow>(
        sql: string,
        params?: ReadonlyArray<unknown>,
    ) => Promise<QueryResult<R>>;
    /** 트랜잭션으로 묶는다. 이미 안이면 그대로 실행한다 */
    readonly transact: <T>(fn: (tx: SqlExecutor) => Promise<T>) => Promise<T>;
    /** 지금 트랜잭션 안인가 */
    readonly inTransaction: boolean;
}

/** 트랜잭션 안의 커넥션을 감싼다: 경계를 새로 열지 않는다 */
export const clientExecutor = (client: PoolClient): SqlExecutor =>
{
    const executor: SqlExecutor = {
        query: (sql, params = []) => client.query(sql, [...params]),
        transact: (fn) => fn(executor),
        inTransaction: true,
    };

    return executor;
};

/**
 * 풀을 감싼다. `transact` 가 경계를 연다.
 *
 * ⚠ 트랜잭션 모드 풀러에서도 동작한다: `begin`~`commit` 동안 풀러가 뒤 커넥션 하나를 붙잡아 준다.
 *    대신 **트랜잭션을 연 채 밖을 기다리지 말 것**(외부 API 호출 등): 그동안 뒤 커넥션이 묶이고
 *    `idle_in_transaction_session_timeout` 에 걸린다.
 * ⚠ 왕복이 는다(begin + 본문 + commit). 쓰기 경로의 값이므로 받아들이되 **읽기를 트랜잭션에 넣지 말 것.**
 */
export const poolExecutor = (pool: Pool): SqlExecutor => ({
    query: (sql, params = []) => pool.query(sql, [...params]),

    transact: async (fn) =>
    {
        const client = await pool.connect();

        try
        {
            await client.query("begin");
            const result = await fn(clientExecutor(client));
            await client.query("commit");

            return result;
        }
        catch (error)
        {
            try
            {
                await client.query("rollback");
            }
            catch
            {
                // 이미 끊긴 커넥션이면 rollback 도 실패한다. 원래 오류를 살린다.
            }

            throw error;
        }
        finally
        {
            client.release();
        }
    },

    inTransaction: false,
});

/** 테스트·graceful shutdown 에서 부른다. 서버리스 요청 끝에서는 부르지 않는다: 재사용이 목적이다 */
export const closePostgresPools = async (): Promise<void> =>
{
    const pools = poolCache();
    const open = [...pools.values()];

    pools.clear();

    await Promise.all(open.map((pool) => pool.end()));
};
