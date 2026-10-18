/**
 * 분석에 대한 그 사람의 동의. 브라우저의 쿠키(`CONSENT_COOKIE`)가 갖고, 서버와 브라우저가 같은 값을 읽는다.
 *
 * ⚠ **고르지 않은 것(`unknown`)은 동의가 아니다**(INV-ANALYTICS-01). 배너가 서 있는 동안은 아무것도 보내지 않는다.
 * ⚠ **PostHog 의 저장소가 아니라 우리 쿠키다.** PostHog 는 동의를 브라우저 저장소에 두어 서버가 읽지 못한다.
 *    우리 쿠키가 정본이고, 브라우저는 그 값으로 PostHog 의 `opt_in_capturing` · `opt_out_capturing` 을 부른다.
 */
export type Consent = "granted" | "denied" | "unknown";

export const CONSENT_COOKIE = "analytics_consent";

/** 쿠키에 적는 값. 이 둘 말고는 모두 `unknown` 이다 */
export const CONSENT_VALUES = ["granted", "denied"] as const;

/** 1년. 그 뒤에는 다시 묻는다 */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const parseConsent = (value: string | null | undefined): Consent =>
    value === "granted" || value === "denied" ? value : "unknown";
