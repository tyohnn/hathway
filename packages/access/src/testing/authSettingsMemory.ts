import { Effect, Layer, Ref } from "effect";

import { AuthSettings, AuthSettingsUnavailable } from "../ports/AuthSettings.ts";

/**
 * 인증 서버 설정의 메모리 구현. 유스케이스가 설정을 언제 묻는지를 재는 자리다.
 *
 * `"unavailable"` 은 응답을 받지 못한 경우를 흉내 낸다.
 */
export interface AuthSettingsMemory
{
    readonly layer: Layer.Layer<AuthSettings>;
    /** 설정을 몇 번 물었는가 */
    readonly reads: Effect.Effect<number>;
}

export const authSettingsMemory = (state: boolean | "unavailable" = true): Effect.Effect<AuthSettingsMemory> =>
    Effect.gen(function*()
    {
        const reads = yield* Ref.make(0);

        const layer = Layer.succeed(AuthSettings, AuthSettings.of({
            emailConfirmationEnforced: Ref.update(reads, (count) => count + 1).pipe(Effect.andThen(
                state === "unavailable"
                    ? Effect.fail(new AuthSettingsUnavailable({ reason: "설정을 받지 못했다" }))
                    : Effect.succeed(state),
            )),
        }));

        return { layer, reads: Ref.get(reads) };
    });
