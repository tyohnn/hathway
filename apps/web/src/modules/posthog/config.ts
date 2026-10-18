/**
 * PostHog 모듈의 설정. 서버와 브라우저가 함께 읽으므로 `NEXT_PUBLIC_` 값만 쓴다.
 *
 *   · `NEXT_PUBLIC_POSTHOG_SINK=rehearsal`  보내지 않고 모은다. 로컬과 e2e(`.env.example` · `playwright.config.ts`)
 *   · `NEXT_PUBLIC_POSTHOG_TOKEN=phc_…`     실물로 보낸다. 토큰은 공개해도 되는 값이다
 *   · 둘 다 없으면                           아무것도 하지 않는다. 배너도 서지 않는다
 *
 * ⚠ **`process.env.NEXT_PUBLIC_…` 를 글자 그대로 적는다.** Next 는 빌드 때 이 모양만 값으로 바꿔 넣는다. 구조 분해나
 *    변수 이름으로 읽으면 브라우저에서 `undefined` 가 된다.
 * ⚠ **리전은 빌드 때 정해진다**(`next.config.ts` 의 `/ingest` 도 같은 값을 읽는다). 바꾸면 다시 빌드한다.
 */
export type PosthogMode = "live" | "rehearsal" | "off";

export interface PosthogSettings
{
    readonly mode: PosthogMode;
    readonly token: string;
    /** 서버가 곧바로 보내는 곳 */
    readonly ingestHost: string;
    /** 브라우저가 링크를 만들 때 쓰는 PostHog 화면의 주소 */
    readonly uiHost: string;
}

export const settingsFrom = (env: {
    readonly sink: string | undefined;
    readonly token: string | undefined;
    readonly region: string | undefined;
}): PosthogSettings =>
{
    const token = env.token?.trim() ?? "";
    const eu = env.region === "eu";

    return {
        mode: env.sink === "rehearsal" ? "rehearsal" : token === "" ? "off" : "live",
        token,
        ingestHost: eu ? "https://eu.i.posthog.com" : "https://us.i.posthog.com",
        uiHost: eu ? "https://eu.posthog.com" : "https://us.posthog.com",
    };
};

export const posthogSettings = (): PosthogSettings =>
    settingsFrom({
        sink: process.env.NEXT_PUBLIC_POSTHOG_SINK,
        token: process.env.NEXT_PUBLIC_POSTHOG_TOKEN,
        region: process.env.NEXT_PUBLIC_POSTHOG_REGION,
    });
