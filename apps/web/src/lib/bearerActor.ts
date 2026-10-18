import "server-only";

import { createClient } from "@supabase/supabase-js";
import { Effect, Layer } from "effect";

import { signedInUserOf } from "@hathway/access/access/accountLink";
import { actorForApp } from "@hathway/access/access/actorForApp";
import { resolveAccountFacts } from "@hathway/access/access/resolveAccount";
import type { Actor } from "@hathway/access/domain/Actor";
import { NoSession, NotAppMember } from "@hathway/access/ports/ActorResolver";
import { accountDirectoryPostgresLayer } from "@hathway/adapters-postgres/org/AccountDirectoryPostgres";
import { authSettingsSupabaseLayer } from "@hathway/adapters-storage/AuthSettingsSupabase";

import { executor } from "./auth";

/**
 * Authorization 헤더의 토큰으로 행위자를 세운다. 브라우저 밖(MCP 클라이언트)에서 들어오는 요청의 자리다.
 *
 * 토큰은 Supabase Auth 의 OAuth 2.1 서버가 발급한다. 우리는 토큰을 만들지 않는다. 사람이 `/oauth/consent`
 * 에서 허용하면 클라이언트가 그 토큰을 들고 오고, 여기서 쿠키로 들어오는 `lib/auth.ts` 와 **같은 계층을 같은
 * 순서로** 지난다. 다른 것은 첫째 계층이 쿠키가 아니라 헤더라는 것뿐이다.
 *
 *   ① 세션: 토큰이 유효한가            → Auth 서버에 `getUser(token)` 으로 묻는다
 *   ② 소속: 이 앱을 쓸 수 있는 사람인가 → `canEnterApp` 이 정한다(`actorForApp`)
 *   ③ 행: 이 행을 볼 수 있는가         → 여기가 아니다. 도구가 부르는 유스케이스의 술어가 한다
 *
 * ⚠ **토큰을 직접 해독해 클레임을 믿지 않는다.** 권한 축은 ②에서 `org` 을 읽어 확정한다.
 * ⚠ **소속 판정을 건너뛰지 않는다.** 토큰이 살아 있어도 그 사람이 나갔으면 막힌다.
 */
export const bearerToken = (header: string | null): string | null =>
{
    if (header === null)
    {
        return null;
    }

    const match = /^bearer\s+(.+)$/i.exec(header.trim());
    const token = match?.[1]?.trim() ?? "";

    return token === "" ? null : token;
};

const requiredEnv = (name: string): Effect.Effect<string, NoSession> =>
{
    const value = process.env[name];

    return value === undefined || value === ""
        ? Effect.fail(new NoSession({ reason: `${name} 이 설정되지 않았다` }))
        : Effect.succeed(value);
};

export const actorForBearer = (token: string): Effect.Effect<Actor, NoSession | NotAppMember> =>
    Effect.gen(function*()
    {
        const url = yield* requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
        const anonKey = yield* requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

        const result = yield* Effect.tryPromise({
            try: () => createClient(url, anonKey).auth.getUser(token),
            catch: (cause) => new NoSession({ reason: `토큰 확인 실패: ${String(cause)}` }),
        });

        if (result.error !== null || result.data.user === null)
        {
            return yield* new NoSession({ reason: "쓸 수 없는 토큰이다" });
        }

        // 쿠키로 들어오는 길과 같은 유스케이스를 지난다. 붙은 계정이 없으면 주소로 찾아 한 번 잇는다(INV-ACCESS-08)
        const account = yield* resolveAccountFacts(signedInUserOf(result.data.user)).pipe(
            Effect.provide(Layer.mergeAll(
                accountDirectoryPostgresLayer(yield* executor()),
                authSettingsSupabaseLayer({ url, apiKey: anonKey }),
            )),
        );

        return yield* actorForApp({ app: "web", account });
    });
