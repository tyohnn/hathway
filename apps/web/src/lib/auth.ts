import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Effect, Layer } from "effect";

import { accountDirectoryPostgresLayer } from "@investment/adapters-postgres/org/AccountDirectoryPostgres";
import { authSettingsSupabaseLayer } from "@investment/adapters-storage/AuthSettingsSupabase";
import { signedInUserOf, type SignedInUser } from "@investment/access/access/accountLink";
import { actorForApp } from "@investment/access/access/actorForApp";
import { resolveAccountFacts } from "@investment/access/access/resolveAccount";
import { poolExecutor, postgresPool } from "@investment/adapters-postgres/connection";
import { ActorResolver, NoSession, NotAppMember } from "@investment/access/ports/ActorResolver";

/**
 * 요청 하나의 행위자 확정(`ActorResolver` 의 어댑터).
 *
 * 인증 세 계층 가운데 **앞의 둘**이 여기다.
 *
 *   ① 세션: 로그인했는가              → 실패하면 `NoSession` → `/login`
 *   ② 소속: 이 앱을 쓸 수 있는 사람인가 → 실패하면 `NotAppMember` → `/no-access`
 *   ③ 행: 이 행을 볼 수 있는가         → **여기가 아니다.** 조회와 쓰기마다 도메인 술어(`canSeeNote`)가 한다
 *
 * ⚠ **`getUser()` 를 쓴다. `getSession()` 이 아니다.** 후자는 쿠키에 든 것을 그대로 돌려주므로 위조된 쿠키를
 *    그대로 믿는다. 전자는 Auth 서버에 물어 토큰을 검증한다. 서버에서는 이것만 쓴다.
 * ⚠ **권한 축을 세션에서 읽지 않는다.** 역할과 테넌트는 ②에서 `org` 을 읽어 확정한다. JWT 클레임을 믿으면
 *    토큰을 쥔 사람이 자기 권한을 적어 넣는 것과 같다.
 * ⚠ **요청 스코프다.** 모듈 스코프 런타임에 올리지 말 것. 서버 렌더가 동시에 돌면 요청 간 교차 오염이 난다
 *    (`runtime.ts` 의 경고). 관문(`action.ts`)이 액션마다 새로 만들어 준다.
 * ⚠ **익명 폴백이나 개발용 우회를 두지 말 것.** 두면 그 우회가 배포까지 따라간다.
 */
const requiredEnv = (name: string): Effect.Effect<string, NoSession> =>
{
    const value = process.env[name];

    return value === undefined || value === ""
        ? Effect.fail(new NoSession({ reason: `${name} 이 설정되지 않았다` }))
        : Effect.succeed(value);
};

/**
 * 세션에서 인증 서버가 확인한 사람을 얻는다. 첫째 계층이다.
 *
 * ⚠ **주소와 확인 시각을 함께 꺼낸다.** 계정이 아직 이어지지 않은 사람을 주소로 찾아 잇는 데 쓴다
 *    (INV-ACCESS-08). 둘 다 `getUser()` 가 Auth 서버에 물어 받은 값이라 쿠키를 고친 사람이 적어 넣지 못한다.
 */
const signedInUser = Effect.gen(function*()
{
    const url = yield* requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = yield* requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    const store = yield* Effect.tryPromise({
        try: () => cookies(),
        catch: (cause) => new NoSession({ reason: `쿠키를 읽지 못했다: ${String(cause)}` }),
    });

    const client = createServerClient(url, anonKey, {
        cookies: {
            getAll: () => store.getAll(),
            // ⚠ 서버 액션·라우트 핸들러 밖(서버 컴포넌트)에서는 쿠키를 쓸 수 없다. 갱신된 토큰을 못 적는 것은
            //    미들웨어가 대신 하므로 여기서는 조용히 넘긴다: 던지면 렌더가 통째로 깨진다
            setAll: (items) =>
            {
                try
                {
                    for (const item of items)
                    {
                        store.set(item.name, item.value, item.options);
                    }
                }
                catch
                {
                    // 읽기 전용 컨텍스트다. 갱신은 미들웨어의 몫이다
                }
            },
        },
    });

    const result = yield* Effect.tryPromise({
        try: () => client.auth.getUser(),
        catch: (cause) => new NoSession({ reason: `세션 확인 실패: ${String(cause)}` }),
    });

    if (result.error !== null || result.data.user === null)
    {
        return yield* new NoSession({ reason: "로그인하지 않았다" });
    }

    return signedInUserOf(result.data.user);
});

/** 행위자를 세울 때 쓰는 접속이다. 앱의 롤(`web_app`)로 붙는다 */
export const executor = () =>
    Effect.map(
        requiredEnv("WEB_DATABASE_URL").pipe(
            Effect.mapError((error) => new NotAppMember({ reason: error.reason })),
        ),
        (connectionString) => poolExecutor(postgresPool(connectionString)),
    );

/**
 * 로그인한 사람으로 행위자를 세운다. 둘째 계층이다.
 *
 * ⚠ **세션으로 찾지 못하면 주소로 찾아 한 번 잇는다**(INV-ACCESS-08). 운영이 먼저 세운 사람이 처음
 *    들어오는 길이다.
 */
export const actorForSession = (user: SignedInUser) =>
    Effect.gen(function*()
    {
        // 잇기 직전에만 인증 서버의 이메일 확인을 묻는다. 꺼져 있으면 잇지 않는다(INV-ACCESS-08)
        const [url, apiKey] = yield* Effect.all([
            requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
            requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        ]).pipe(Effect.mapError((error) => new NotAppMember({ reason: error.reason })));
        const account = yield* resolveAccountFacts(user).pipe(
            Effect.provide(Layer.mergeAll(
                accountDirectoryPostgresLayer(yield* executor()),
                authSettingsSupabaseLayer({ url, apiKey }),
            )),
        );

        // 이 앱의 문을 지날 수 있는지는 packages/access 가 정한다. 앱은 자기 이름만 넘긴다
        return yield* actorForApp({ app: "web", account });
    });

export const actorResolverLayer = (): Layer.Layer<ActorResolver> =>
    Layer.sync(ActorResolver, () =>
        ActorResolver.of({
            current: Effect.flatMap(signedInUser, actorForSession),
        }));
