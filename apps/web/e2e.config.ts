import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseEnv } from "node:util";

import { web } from "@e2e-dev/web";
import { gateway } from "ai";
import type { E2EConfig } from "e2e";

/**
 * 에이전트 e2e. Playwright e2e(`playwright.config.ts` · `e2e/*.spec.ts`) 옆에 나란히 선다.
 *
 *   · Playwright: 불변식을 정확히 잰다(「보이면 안 된다」). 모델을 부르지 않는다
 *   · 여기: 목표를 말로 주고(`agent.act`) 결과를 `expect` 로 못 박는다. 화면이 바뀌어도 에이전트가 길을 다시 찾는다
 *
 * ⚠ **`act` 바로 뒤에 `expect` 를 둔다.** 그 단언이 통과해야 행동이 `.e2e/cache/` 에 녹화되고, 다음 실행은
 *    모델을 부르지 않고 되풀이한다. `agent.assert` · `waitFor` · `extract` 는 녹화되지 않고 매번 모델을 부른다.
 * ⚠ 러너는 `.env` 를 읽지 않는다. 모델 키(`AI_GATEWAY_API_KEY`)는 아래에서 `.env.local` 을 찾아 올린다.
 * ⚠ Supabase 는 러너가 띄우지 않는다. `supabase start` 가 먼저다.
 */
const PORT = 4402;
const URL = `http://127.0.0.1:${PORT}`;

// 저장소 뿌리의 `.env.local`. 워크트리에서는 뿌리에 없으므로 원본 저장소까지 올라가며 찾는다
for (let dir = join(import.meta.dirname, "..", ".."), hops = 0; hops < 5; dir = dirname(dir), hops += 1)
{
    const file = join(dir, ".env.local");

    if (existsSync(file))
    {
        process.loadEnvFile(file);
        break;
    }
}

/**
 * 서버에 넘길 로컬 스택의 값. `.env.example` 이 정본이고 여기에 다시 적지 않는다(Supabase 주소와 anon 키 · DB 주소 ·
 * 키 없이 도는 연습 창구들). 같은 이름이 환경에 있으면 그 값을 쓴다.
 *
 * ⚠ 러너는 `PATH` · `HOME` 과 여기 적은 것만 서버에 넘긴다. 모델 키는 이름이 본보기에 없어 넘어가지 않는다.
 * ⚠ 모듈을 걷으면 본보기에서 그 모듈의 줄이 빠지므로 여기에는 모듈 표시가 없다.
 */
const LOCAL_STACK = Object.fromEntries(
    Object.entries(parseEnv(readFileSync(join(import.meta.dirname, ".env.example"), "utf8")))
        .flatMap(([name, value]) => (value === undefined ? [] : [[name, process.env[name] ?? value]])),
);

/**
 * 화면이 쓰는 말. 행동하는 모델과 판정하는 모델이 **둘 다** 읽는다.
 *
 * ⚠ 일하는 법(얼마나 꼼꼼히, 무엇을 누르지 말지)은 여기 적지 않는다. 그것은 `system` 이고 판정에는 닿지 않는다.
 * ⚠ 글을 바꾸면 프롬프트 캐시의 앞머리가 바뀐다. 테스트 하나만 아는 말은 그 테스트의 `agentContext` 에 둔다.
 */
const CONTEXT = [
    "화면 글은 한국어다. 단추와 칸은 화면에 적힌 이름 그대로 부른다.",
    "쪽지는 제목과 내용으로 된 글이다. 「쪽지」 화면 위쪽의 칸에 적고 「쪽지 쓰기」 단추로 저장하면 아래 목록에 선다.",
    "목록의 쪽지는 「열기」 로 연다. 연 화면에서 쓴 사람만 「보관하기」 를 누를 수 있고, 보관은 되돌릴 수 없어 확인 창을 한 번 거친다.",
    "시드가 심어 둔 쪽지와 계정(@example.test)은 결함이 아니다.",
    // 정적 껍데기(루트 `CLAUDE.md`): 주소로 바로 열면 틀이 먼저 서고 값이 뒤따라 채워진다. 탐색이 그 틈을 결함으로 읽는다
    "화면을 주소로 열거나 새로 고친 직후에는 틀만 먼저 선다. 제목이 비었거나 목록에 구분선만 있거나 칸이 꺼져 있으면 값이 채워지는 중이니, 화면을 다시 읽은 뒤에 판단한다. 그 틈은 결함이 아니다.",
].join(" ");

export default {
    tests: "e2e-agent/**/*.e2e.ts",

    targets: [
        {
            name: "web",
            engine: web(),
            app: {
                url: URL,
                // 포트가 바뀌어도 녹화가 같은 앱의 것으로 남는다
                identity: "hathway-web",
                command: {
                    executable: "node",
                    args: ["scripts/startAgentE2eServer.mjs", "{port}"],
                    // 빌드까지 기다린다
                    startupTimeout: 240_000,
                    // 로컬에서는 떠 있는 서버를 그대로 쓴다(CI 는 무시하고 새로 띄운다)
                    reuseExisting: true,
                    log: ".e2e/logs/app.log",
                    // 로컬 계정 칸과 테스트 API 는 e2e 서버에서만 연다(`playwright.config.ts` 의 열린 서버와 같다)
                    env: { ...LOCAL_STACK, ALLOW_LOCAL_ACCOUNTS: "1", EXPOSE_TESTING_API: "1" },
                },
            },
        },
    ],

    agents: {
        default: {
            // 싸고 새 모델. 입력 100만 토큰 $0.10 · 캐시에서 읽으면 $0.01. `E2E_MODEL` 로 한 번만 바꿔 돌릴 수 있다
            model: gateway(process.env.E2E_MODEL ?? "openai/gpt-6-luna"),
            system: "화면에 결과가 보인 뒤에 걸음을 끝낸다. 시키지 않은 것은 누르지 않는다.",
            context: CONTEXT,
        },
    },

    // 시드(`supabase/seed.sql`)가 넣은 로컬 전용 값이다
    credentials: {
        kim: { username: "kim@example.test", password: "hathway-local" },
    },
} satisfies E2EConfig;
