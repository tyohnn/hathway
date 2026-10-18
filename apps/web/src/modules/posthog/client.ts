"use client";

import type { PostHog } from "posthog-js";

import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS, parseConsent, type Consent } from "@hathway/analytics/domain/Consent";

import { posthogSettings } from "./config";

/**
 * 브라우저 쪽의 PostHog. 동의를 읽고 쓰는 일과, 실물(posthog-js)과 연습(메모리에 모음)을 한 모양으로 감싸는 일을 한다.
 *
 * ⚠ **동의의 정본은 우리 쿠키다**(`CONSENT_COOKIE`). 서버도 같은 쿠키를 읽는다. posthog-js 에는 그 값으로
 *    `opt_in_capturing` · `opt_out_capturing` 을 부를 뿐이다.
 * ⚠ **쿠키 없는 모드(`cookieless_mode: "on_reject"`)로 연다.** 고르기 전에는 아무것도 적지 않고, 거절하면 쿠키 없이
 *    방문 수만 센다(2026-09-30 사용자 결정). 거절을 셀 수 있으려면 PostHog 프로젝트 설정에서
 *    「Cookieless server hash mode」를 켜야 한다(`modules/posthog/module.md`).
 * ⚠ **posthog-js 는 필요할 때 불러온다.** 끔 · 연습에서는 번들에 싣지 않는다.
 */
export const readConsent = (): Consent =>
{
    const found = document.cookie.split("; ").find((pair) => pair.startsWith(`${CONSENT_COOKIE}=`));

    return parseConsent(found?.slice(CONSENT_COOKIE.length + 1));
};

export const writeConsent = (consent: "granted" | "denied"): void =>
{
    document.cookie = `${CONSENT_COOKIE}=${consent}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
};

/** 연습에서 모은 것. e2e 가 `window.__rehearsalAnalytics` 로 읽는다 */
export type RehearsalEntry =
    | { readonly type: "pageview"; readonly path: string }
    | { readonly type: "identify"; readonly accountId: string; readonly tenantId: string }
    | { readonly type: "consent"; readonly consent: "granted" | "denied" }
    | { readonly type: "reset" };

const record = (entry: RehearsalEntry): void =>
{
    const target = window as typeof window & { __rehearsalAnalytics?: Array<RehearsalEntry> };

    target.__rehearsalAnalytics ??= [];
    target.__rehearsalAnalytics.push(entry);
};

let opened: Promise<PostHog> | null = null;

const open = (): Promise<PostHog> =>
{
    const settings = posthogSettings();

    opened ??= import("posthog-js").then(({ default: posthog }) =>
    {
        posthog.init(settings.token, {
            api_host: "/ingest",
            ui_host: settings.uiHost,
            defaults: "2026-08-30",
            cookieless_mode: "on_reject",
            person_profiles: "identified_only",
        });

        return posthog;
    });

    return opened;
};

/** 화면이 뜰 때. 이미 고른 동의를 posthog-js 에 알린다 */
export const start = async (): Promise<void> =>
{
    const settings = posthogSettings();
    const consent = readConsent();

    if (settings.mode === "live")
    {
        const posthog = await open();

        if (consent === "granted")
        {
            posthog.opt_in_capturing();
        }
        else if (consent === "denied")
        {
            posthog.opt_out_capturing();
        }
    }
};

/** 배너에서 고른 것을 적고 알린다 */
export const choose = async (consent: "granted" | "denied"): Promise<void> =>
{
    const settings = posthogSettings();

    writeConsent(consent);

    if (settings.mode === "rehearsal")
    {
        record({ type: "consent", consent });

        if (consent === "granted")
        {
            record({ type: "pageview", path: window.location.pathname });
        }
    }
    else if (settings.mode === "live")
    {
        const posthog = await open();

        if (consent === "granted")
        {
            posthog.opt_in_capturing();
        }
        else
        {
            posthog.opt_out_capturing();
        }
    }
};

/** 화면이 바뀔 때. 실물은 posthog-js 가 스스로 센다(`defaults`) */
export const pageview = (path: string): void =>
{
    if (posthogSettings().mode === "rehearsal" && readConsent() === "granted")
    {
        record({ type: "pageview", path });
    }
};

/** 로그인한 사람. 동의한 사람만 계정 id 로 잇는다(INV-ANALYTICS-01 · 02) */
export const identify = async (accountId: string, tenantId: string): Promise<void> =>
{
    const settings = posthogSettings();

    if (settings.mode === "off" || readConsent() !== "granted")
    {
        return;
    }

    if (settings.mode === "rehearsal")
    {
        record({ type: "identify", accountId, tenantId });

        return;
    }

    const posthog = await open();

    posthog.identify(accountId);
    posthog.group("organization", tenantId);
};

/** 로그아웃한 뒤. 앞 사람과 다음 사람이 이어지지 않게 끊는다 */
export const reset = async (): Promise<void> =>
{
    const settings = posthogSettings();

    if (settings.mode === "rehearsal")
    {
        // 실물과 같게 이은 적이 있을 때만이다. 동의하지 않았으면 이은 적이 없다
        if (readConsent() === "granted")
        {
            record({ type: "reset" });
        }
    }
    else if (settings.mode === "live")
    {
        const posthog = await open();

        // 로그인한 적 없는 방문자까지 끊으면 로그인 화면을 열 때마다 새 방문자로 센다
        if (posthog.get_property("$user_state") === "identified")
        {
            posthog.reset();
        }
    }
};
