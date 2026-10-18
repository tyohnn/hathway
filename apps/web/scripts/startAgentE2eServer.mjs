import { spawn } from "node:child_process";

/**
 * 에이전트 e2e(`e2e.config.ts`)가 상대하는 서버를 띄운다: 프로덕션 빌드 → `next start`.
 *
 * ⚠ e2e 러너는 명령을 **셸 없이** 띄운다. `build && start` 를 한 줄로 적을 수 없어서 이 파일이 둘을 잇는다.
 * ⚠ 러너는 `PATH` · `HOME` 과 설정의 `command.env` 만 넘긴다. 앱이 읽는 값은 전부 설정에 적는다.
 * ⚠ Playwright e2e 의 두 서버(4400 · 4401)와 포트를 나눠 쓴다. 같은 `.next` 를 쓰므로 둘을 한꺼번에 돌리지 않는다.
 */
const port = process.argv[2];

if (!port)
{
    console.error("포트를 인자로 주세요: node scripts/startAgentE2eServer.mjs <포트>");
    process.exit(1);
}

const run = (args) =>
    new Promise((resolve) =>
    {
        const child = spawn("npx", args, { stdio: "inherit", env: process.env });

        for (const signal of ["SIGINT", "SIGTERM"])
        {
            process.on(signal, () => child.kill(signal));
        }

        child.on("exit", (code) => resolve(code ?? 0));
    });

const built = await run(["next", "build"]);

if (built !== 0)
{
    process.exit(built);
}

process.exit(await run(["next", "start", "-p", port]));
