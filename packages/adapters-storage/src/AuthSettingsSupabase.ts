// ⚠ 이 import 가 게이트다. 이 모듈이 쥐는 키는 클라이언트 번들에 섞이면 빌드가 깨져야 한다.
import "server-only";

import { Effect, Layer } from "effect";

import { emailConfirmationEnforced } from "@investment/access/access/authSettings";
import { AuthSettings, AuthSettingsUnavailable } from "@investment/access/ports/AuthSettings";

/**
 * `AuthSettings` 의 Supabase 구현. 인증 서버의 공개 설정(`/auth/v1/settings`)을 HTTP 로 읽는다.
 *
 * 첫 로그인에 계정을 잇기 직전에만 불린다(INV-ACCESS-08). 대시보드의 「Confirm email」 토글이 이
 * 응답의 `mailer_autoconfirm` 으로 드러나고, 그 값을 읽는 규칙은 `@investment/access` 의
 * `emailConfirmationEnforced` 하나가 갖는다.
 *
 * ⚠ **캐시하지 않는다.** 묻는 것은 한 사람당 첫 로그인 한 번이라 빈도가 낮고, 캐시를 두면 토글을
 *    되돌린 뒤에도 옛 값을 믿는 시간이 생긴다.
 * ⚠ **기다리는 시간을 자른다.** 인증 서버가 늦으면 로그인한 사람이 그만큼 흰 화면을 본다. 시간이
 *    지나면 읽지 못한 것으로 답하고, 부르는 쪽이 잇지 않는 쪽으로 닫는다.
 */
export interface AuthSettingsSupabaseConfig
{
    /** 프로젝트 주소. `NEXT_PUBLIC_SUPABASE_URL` 과 같은 값이다 */
    readonly url: string;
    /** 공개 키면 충분하다. 설정 엔드포인트는 공개되어 있다 */
    readonly apiKey: string;
}

const TIMEOUT_MS = 3_000;

const unavailable = (reason: string) => new AuthSettingsUnavailable({ reason });

export const authSettingsSupabaseLayer = (config: AuthSettingsSupabaseConfig): Layer.Layer<AuthSettings> =>
    Layer.succeed(AuthSettings, AuthSettings.of({
        emailConfirmationEnforced: Effect.gen(function*()
        {
            const response = yield* Effect.tryPromise({
                try: () => fetch(`${config.url}/auth/v1/settings`, {
                    headers: { apikey: config.apiKey },
                    signal: AbortSignal.timeout(TIMEOUT_MS),
                }),
                catch: (cause) => unavailable(`설정 요청 실패: ${String(cause)}`),
            });

            if (!response.ok)
            {
                return yield* unavailable(`설정 응답이 ${response.status} 이다`);
            }

            const body = yield* Effect.tryPromise({
                try: () => response.json() as Promise<unknown>,
                catch: (cause) => unavailable(`설정 응답을 읽지 못했다: ${String(cause)}`),
            });

            return emailConfirmationEnforced(body);
        }),
    }));
