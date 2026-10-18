import { defineConfig, devices } from "@playwright/test";

/**
 * e2e 는 프로덕션 서버 **둘**을 상대로 돈다. 같은 빌드에서 나오고 다른 것은 로컬 계정 문뿐이다.
 *
 *   · 닫힌 서버(4410): 배포와 같은 모양. 「그 칸이 없다」를 지키는 스모크가 여기서 돈다
 *   · 열린 서버(4411): `ALLOW_LOCAL_ACCOUNTS=1`. 로그인해야 닿는 화면의 e2e 가 여기서 돈다
 *
 * ⚠ **문을 연 서버에서 닫힘을 잴 수 없고 그 반대도 마찬가지다.** 한 서버로 둘을 다 재려다 스모크의
 *    단언을 지우게 되는 것이 이 구조를 고른 이유다.
 * ⚠ **시드에 기댄다.** `supabase/seed.sql` 과 `supabase/seeds/10-notes.sql` 이 심은 계정과 쪽지를 단언한다.
 *    대화는 스펙마다 새로 열고 정리하지 않는다(데이터로 격리한다).
 * ⚠ **e2e 는 연습 모델로 돈다.** 워크플로 · 스텝 · 도구 · 장부는 실물과 같은 길로 돌고 모델 호출만 정해진 답을
 *    낸다. 실물 모델로 돌리려면 `E2E_RUNNER=workflow` 를 주고 키는 `.env.local` 의 `AI_GATEWAY_API_KEY` 가 준다.
 *    그때 연습 모델의 정해진 답을 재는 단언은 빨개지는 것이 옳다.
 */
const CLOSED_PORT = 4410;
const OPEN_PORT = 4411;
const CLOSED_URL = `http://127.0.0.1:${CLOSED_PORT}`;
const OPEN_URL = `http://127.0.0.1:${OPEN_PORT}`;

/** 두 서버가 함께 쓰는 값. 로컬 스택 기본값을 깔되 밖에서 준 값이 있으면 그것을 쓴다 */
const SHARED_ENV = {
    EXPOSE_TESTING_API: "1",
    AGENT_RUNNER: process.env.E2E_RUNNER ?? "rehearsal",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54361",
    // 로컬 스택의 anon 키는 고정값이고 비밀이 아니다(`.env.example`)
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
    AGENT_DATABASE_URL: process.env.AGENT_DATABASE_URL ?? "postgresql://agent_app:postgres@127.0.0.1:54362/postgres",
};

const chromium = {
    ...devices["Desktop Chrome"],
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
        ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
        : {}),
};

export default defineConfig({
    testDir: "./e2e",
    timeout: 60_000,
    expect: { timeout: 15_000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

    use: {
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },

    // ⚠ chromium 단독이다. 클라우드 개발 환경에는 chromium 만 있다
    projects: [
        { name: "closed", testMatch: /smoke\.spec\.ts/, use: { ...chromium, baseURL: CLOSED_URL } },
        { name: "open", testIgnore: /smoke\.spec\.ts/, use: { ...chromium, baseURL: OPEN_URL } },
    ],

    // ⚠ `.env.development.local` 은 `next dev` 전용이다. build/start 는 읽지 않으므로 여기서 넘긴다.
    // ⚠ e2e 전에 같은 포트의 개발 서버를 내린다. `reuseExistingServer` 가 개발 서버를 재면 스모크가 빨개진다
    webServer: [
        {
            command: "npm run build && npm run start",
            url: CLOSED_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
            env: SHARED_ENV,
        },
        {
            command: "node scripts/startOpenServer.mjs",
            url: OPEN_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
            env: { ...SHARED_ENV, ALLOW_LOCAL_ACCOUNTS: "1" },
        },
    ],
});
