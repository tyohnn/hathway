import { Context, type Effect, Schema } from "effect";

/**
 * 인증 서버의 설정을 묻는 포트. 첫 로그인에 계정을 잇기 직전에만 부른다(INV-ACCESS-08).
 *
 * ⚠ **꺼진 것과 읽지 못한 것을 섞지 않는다.** 읽지 못하면 `AuthSettingsUnavailable` 로 답하고,
 *    부르는 쪽이 둘 다 잇지 않는 쪽으로 닫는다. 어댑터가 읽지 못한 것을 `false` 로 접으면 그 까닭이
 *    서버 기록에서 사라진다.
 */
export class AuthSettingsUnavailable extends Schema.TaggedError<AuthSettingsUnavailable>()(
    "AuthSettingsUnavailable",
    { reason: Schema.String },
)
{}

export class AuthSettings extends Context.Service<AuthSettings, {
    /** 이메일 확인이 켜져 있는가. 켜졌다고 확실할 때만 `true` 다 */
    readonly emailConfirmationEnforced: Effect.Effect<boolean, AuthSettingsUnavailable>;
}>()("@investment/access/ports/AuthSettings")
{}
