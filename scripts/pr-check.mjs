#!/usr/bin/env node

/**
 * PR 을 열기 전에 돌리는 로컬 점검이다. CLAUDE.md 「개발 과정」 3단계가 이 명령이다.
 *
 *   npm run pr:check                       # 기준 브랜치와 견줘 바뀐 것만
 *   npm run pr:check -- --base origin/main
 *   npm run pr:check -- --e2e full         # 바뀐 앱의 스펙을 모두 돌린다(통합 브랜치를 릴리스 브랜치에 올리기 전에 한 번)
 *   npm run pr:check -- --skip e2e="까닭"   # 못 돌린 칸은 까닭과 함께 표에 남는다
 *   npm run pr:check -- --foreign e2e="까닭" # 기준 브랜치에서도 빨간 칸은 돌리되 「남의 빨강」으로 적는다
 *   npm run pr:check -- --fresh            # 앞선 실행의 결과를 이어 쓰지 않고 e2e 와 vercel build 를 처음부터 돈다
 *
 * 이 저장소에 맞추는 값은 모두 `scripts/pr-check.config.mjs` 에 있다. 이 파일은 고치지 않는다.
 *
 * GitHub Actions CI 를 돌리지 않는 저장소에서 이 명령이 유일한 게이트다. 여기서 초록이 아니면 아무도 잡아 주지
 * 않는다. 칸은 일곱이고, 결과는 PR 본문에 그대로 붙일 마크다운 표로 찍는다. 같은 내용을
 * `.pr-check/result.md` 와 `progress-board` 가 읽는 꼴의 `.pr-check/result.json` 으로도 남긴다.
 *
 *   typecheck · test · build   `turbo run <작업> --affected`(runner: "turbo") 또는 `npm run <작업>`(runner: "npm")
 *   e2e                       바뀐 앱의 Playwright 중 바뀐 코드에 닿는 스펙만(`e2e-select.mjs`). 공용 패키지 · 마이그레이션 ·
 *                             앱 설정 · 레이아웃이 바뀌면 그 앱의 스펙 전체. 돈 스펙과 까닭은 표 아래에 적힌다
 *   vercel build              바뀐 앱마다 `vercel pull` 로 프리뷰 env 를 받아 Vercel 과 같은 빌드를 로컬에서 돌린다(config.vercel)
 *   화면 글                    바뀐 파일에 걸린 화면 글 검사기의 지적(config.copy)
 *   아이콘                     더한 줄이 디자인 시스템의 아이콘 대신 아이콘 라이브러리를 직접 부르는가(config.icons)
 *
 * 켜지 않은 칸(config 에 값이 없는 칸)은 「통과」로 적되 까닭에 「이 저장소는 쓰지 않음」이 남는다. 빈칸으로 두지 않는다.
 *
 * ⚠ **로컬 스택이 떠 있어야 한다**(config.stack). 계약 테스트와 e2e 가 거기 붙는다. 스택이 없으면 시작하지 않고 멈춘다.
 *    스택 없이 돌려 「계약 테스트를 건너뛰었다」는 초록을 만드는 것이 이 명령이 막으려는 일이다.
 * ⚠ **e2e 는 앱 포트가 비어 있어야 한다.** Playwright 설정이 로컬에서는 떠 있는 서버를 다시 쓰므로, 지난 빌드의
 *    서버가 남아 있으면 이번 코드가 아니라 그 서버를 잰다. 포트가 차 있으면 그 앱의 e2e 를 실패로 적는다.
 * ⚠ **Vercel 은 config.vercel.nodeMajor 로 빌드한다.** 로컬 Node 가 다르면 표에 그 차이를 적는다. 빌드가 같아지는 것은
 *    파이프라인과 env 와 `vercel.json` 까지이고 Node 판은 로컬의 것이다.
 *
 * 시간을 줄이는 장치가 셋이다. 어느 것도 검사를 덜 돌리지 않는다.
 *
 *   이어 돌리기   e2e 와 vercel build 의 결과를 코드의 지문과 함께 `.pr-check/state.json` 에 남긴다. 같은 코드로 다시 부르면
 *                앞에서 통과한 앱은 그 결과를 그대로 적고, 실패한 앱은 앞에서 실패한 검사만(`--last-failed`) 다시 돈다.
 *                도커가 e2e 도중에 죽어도 스택을 다시 올리고 같은 명령을 부르면 멈춘 자리부터 이어진다. 코드가 한 줄이라도
 *                바뀌면 지문이 달라져 처음부터 돈다
 *   스택 확인     앱마다 e2e 를 돌리기 전에 스택이 살아 있는지 본다. 죽었으면 남은 앱을 돌리지 않고 그 사실을 적는다.
 *                죽은 스택에 대고 수십 개가 시간 초과로 실패하기를 기다리지 않는다
 *   원격 캐시     `PR_CHECK_REMOTE_CACHE=1` 이면 클라우드 세션이 turbo 의 결과를 Vercel 원격 캐시로 나눠 쓴다. 세션마다 새
 *                컨테이너라 로컬 캐시가 늘 비어 있어, 바뀌지 않은 패키지의 typecheck 를 세션마다 다시 돌린다. 입력 해시가 같은
 *                작업만 받아 오므로 캐시가 검사를 바꾸지 않는다. ⚠ 기본은 꺼짐이다. Vercel 의 사용량과 비용에 닿는지 사람이
 *                정하기 전까지 켜지 않는다
 *
 * ⚠ **e2e 의 일꾼 수와 turbo 작업을 한데 돌리는 것은 재 보고 버렸다.** 4코어 컨테이너에서 e2e 를 일꾼 넷으로 돌리면
 *    5.6분이 6.4분이 되고 실패가 1에서 5로 늘었다. typecheck · test · build 를 turbo 한 번에 몰면 53초를 벌지만
 *    PDF 렌더 테스트가 부하에 시간 초과로 빨개졌다. 칸 셋을 차례로 도는 까닭이다.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { diskIo, readWorkspaces, selectSpecs } from "./e2e-select.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const configPath = join(repoRoot, "scripts/pr-check.config.mjs");

if (!existsSync(configPath))
{
    console.error("scripts/pr-check.config.mjs 가 없습니다. dev-playbook 의 scripts/pr-check.config.example.mjs 를 복사해 이 저장소에 맞춥니다.");
    process.exit(2);
}

/** 이 저장소에 맞추는 값이다. 모양은 `pr-check.config.example.mjs` 의 머리말이 정본이다 */
const { default: config } = await import(pathToFileURL(configPath).href);

const RUNNER = config.runner ?? "turbo";
const STACK_PORTS = config.stack?.ports ?? [];
const VERCEL_ORG = config.vercel?.org;
const VERCEL_PROJECTS = config.vercel?.projects ?? {};
const VERCEL_NODE_MAJOR = config.vercel?.nodeMajor;
const E2E_APPS = config.e2e?.apps ?? {};
const SCREEN_PATTERN = new RegExp(config.screens?.pattern ?? "^(apps\\/[^/]+\\/src)\\/.+\\.tsx?$");
const SCREEN_DIRS = config.screens?.dirs ?? ["apps"];
const COPY_PATTERN = new RegExp(config.screens?.copyPattern ?? "^(apps\\/[^/]+\\/src)\\/.+\\.(tsx?|mdx)$");

const CHECK_NAMES = ["typecheck", "test", "build", "e2e", "vercel build", "화면 글", "아이콘"];

const parseArgs = (argv) =>
{
    const options = { base: process.env.PR_CHECK_BASE ?? config.baseBranch ?? "origin/main", e2e: process.env.PR_CHECK_E2E ?? "affected", skip: new Map(), foreign: new Map(), fresh: false };

    for (let index = 0; index < argv.length; index += 1)
    {
        const arg = argv[index];

        if (arg === "--base")
        {
            const base = argv[index + 1] ?? "";

            // `-` 로 시작하는 값은 git 이 옵션으로 읽으므로 받지 않는다
            if (base === "" || base.startsWith("-"))
            {
                throw new Error("--base 에는 브랜치나 커밋을 넘깁니다(예: --base origin/main)");
            }

            options.base = base;
            index += 1;
        }
        else if (arg === "--e2e")
        {
            options.e2e = argv[index + 1] ?? "";
            index += 1;

            if (options.e2e !== "full" && options.e2e !== "affected")
            {
                console.error("--e2e 에는 full 이나 affected 를 적습니다(기본은 affected).");
                process.exit(2);
            }
        }
        else if (arg === "--fresh")
        {
            options.fresh = true;
        }
        else if (arg === "--skip" || arg === "--foreign")
        {
            const [name, ...reason] = (argv[index + 1] ?? "").split("=");
            const text = reason.join("=").trim();

            if (!CHECK_NAMES.includes(name))
            {
                console.error(`${arg} 의 칸 이름 「${name}」을 모릅니다. ${CHECK_NAMES.join(" · ")} 가운데 하나를 적습니다.`);
                process.exit(2);
            }

            if (text === "")
            {
                console.error(`${arg} ${name} 에 까닭이 없습니다. ${arg} ${name}="까닭" 꼴로 적습니다.`);
                process.exit(2);
            }

            (arg === "--skip" ? options.skip : options.foreign).set(name, text);
            index += 1;
        }
    }

    return options;
};

const run = (command, args, options = {}) =>
{
    const result = spawnSync(command, args, {
        cwd: options.cwd ?? repoRoot,
        env: { ...process.env, ...options.env },
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
        timeout: options.timeout,
        stdio: ["ignore", "pipe", "pipe"],
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

    if (!options.quiet)
    {
        process.stdout.write(output);
    }

    return {
        ok: result.status === 0,
        output,
        stdout: result.stdout ?? "",
        timedOut: result.error?.code === "ETIMEDOUT",
        spawnFailed: result.error?.code === "ENOENT",
    };
};

const portOpen = (port) =>
    new Promise((resolvePort) =>
    {
        const socket = createConnection({ host: "127.0.0.1", port });
        socket.once("connect", () =>
        {
            socket.destroy();
            resolvePort(true);
        });
        socket.once("error", () => resolvePort(false));
    });

const changedFiles = (base) =>
{
    const committed = run("git", ["diff", "--name-only", `${base}...HEAD`], { quiet: true }).output;
    const working = run("git", ["diff", "--name-only", "HEAD"], { quiet: true }).output;
    const untracked = run("git", ["ls-files", "--others", "--exclude-standard"], { quiet: true }).output;

    return [...new Set(`${committed}\n${working}\n${untracked}`.split("\n").map((line) => line.trim()).filter(Boolean))];
};

/** 바뀐 파일이 닿는 패키지와 그것에 의존하는 패키지다. `turbo ls --affected` 는 기준 커밋을 받지 않아서 `query` 를 쓴다 */
const affectedPackages = (base) =>
{
    // 패키지 하나짜리 저장소는 늘 전부가 바뀐 것으로 본다
    if (RUNNER === "npm")
    {
        return new Set([...Object.keys(E2E_APPS), ...Object.keys(VERCEL_PROJECTS)]);
    }

    const { ok, output, stdout } = run("npx", ["turbo", "query", "affected", `--base=${base}`, "--packages"], { quiet: true });

    if (!ok)
    {
        throw new Error(`바뀐 패키지를 고르지 못했습니다\n${output}`);
    }

    const items = JSON.parse(stdout).data.affectedPackages.items;

    return new Set(items.map((item) => item.name).filter((name) => name !== "//"));
};

/** `turbo run` 의 끝에 찍히는 요약에서 성공 수와 실패한 작업을 읽는다 */
const turboTask = (task, base) =>
{
    if (RUNNER === "npm")
    {
        const scripts = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).scripts ?? {};

        // 없는 스크립트를 조용히 통과시키지 않는다. 그 칸을 쓰지 않으려면 --skip 으로 까닭을 남긴다
        if (scripts[task] === undefined)
        {
            return { state: "fail", detail: `package.json 에 "${task}" 스크립트가 없음. 쓰지 않는 칸이면 --skip ${task}="까닭" 으로 적는다` };
        }

        console.log(`\n── npm run ${task} ──`);

        return run("npm", ["run", task]).ok ? { state: "pass", detail: `npm run ${task} 통과` } : { state: "fail", detail: "위 출력을 봅니다" };
    }

    console.log(`\n── turbo ${task} ──`);
    const { ok, output } = run("npx", ["turbo", "run", task, "--affected", "--continue", "--output-logs=errors-only"], {
        env: { TURBO_SCM_BASE: base, ...remoteCacheEnv() },
    });
    const total = output.match(/Tasks:\s+(\d+) successful, (\d+) total/);
    const failed = [...output.matchAll(/^\s*(?:Failed:)?\s+(\S+#\S+)\s*$/gm)].map((match) => match[1]).filter((name) => name.endsWith(`#${task}`));

    if (total === null)
    {
        return ok
            ? { state: "pass", detail: "돌릴 작업 없음(바뀐 패키지가 이 작업을 갖지 않음)" }
            : { state: "fail", detail: "turbo 가 요약 없이 끝났습니다. 위 출력을 봅니다" };
    }

    const detail = `${total[1]}/${total[2]} 작업 통과`;

    return ok
        ? { state: "pass", detail }
        : { state: "fail", detail: `${detail}. 실패: ${failed.join(", ") || "위 출력을 봅니다"}` };
};

/** turbo 원격 캐시를 붙이는 env 다. 켰을 때, 프록시가 진짜 토큰을 붙여 주는 클라우드 세션에서만 붙인다. 사람의 기계는 로컬 캐시가 이어지므로 건드리지 않는다 */
const remoteCacheEnv = () =>
{
    if (process.env.PR_CHECK_REMOTE_CACHE !== "1" || process.env.TURBO_TOKEN !== undefined || process.env.CCR_AGENT_PROXY_ENABLED !== "1")
    {
        return {};
    }

    return { TURBO_TOKEN: "proxy", TURBO_TEAMID: VERCEL_ORG, TURBO_API: "https://api.vercel.com" };
};

/**
 * 이번 코드의 지문이다. 앞선 실행의 결과를 이어 쓸 수 있는지를 이것으로 가른다. HEAD 와 기준의 갈림점과 커밋하지 않은
 * 변경(추적하지 않는 파일의 내용까지)이 모두 같아야 같은 지문이다.
 */
const codeFingerprint = (base) =>
{
    const hash = createHash("sha256");
    const untracked = run("git", ["ls-files", "--others", "--exclude-standard"], { quiet: true }).stdout.split("\n").filter(Boolean).sort();

    hash.update(run("git", ["rev-parse", "HEAD"], { quiet: true }).stdout);
    hash.update(run("git", ["merge-base", base, "HEAD"], { quiet: true }).stdout);
    hash.update(run("git", ["diff", "HEAD", "--binary"], { quiet: true }).stdout);

    for (const path of untracked)
    {
        hash.update(path);

        try
        {
            hash.update(readFileSync(join(repoRoot, path)));
        }
        catch
        {
            hash.update("(읽지 못함)");
        }
    }

    return hash.digest("hex");
};

const STATE_PATH = join(repoRoot, ".pr-check/state.json");
const LAST_RUN_DIR = join(repoRoot, ".pr-check/last-run");

/** 앱마다 남겨 두는 Playwright 의 `.last-run.json` 사본이다. 이어 돌 때 `--last-failed` 가 이것을 읽는다 */
const lastRunCopy = (name) => join(LAST_RUN_DIR, `${name.replace(/\W+/g, "_")}.json`);

const emptyState = (fingerprint) => ({ fingerprint, e2e: {}, vercel: {} });

/** 앞선 실행이 남긴 결과다. 지문이 다르면 빈 것으로 본다 */
const readState = (fingerprint) =>
{
    try
    {
        const state = JSON.parse(readFileSync(STATE_PATH, "utf8"));

        if (state.fingerprint === fingerprint)
        {
            return state;
        }
    }
    catch
    {
        // 처음 돌리거나 파일이 깨졌으면 처음부터 돈다
    }

    return emptyState(fingerprint);
};

const writeState = (state) =>
{
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 4)}\n`);
};

/** 계약 테스트와 e2e 가 붙는 자리(config.stack.ports)다. 하나도 적지 않았으면 스택이 필요 없는 저장소다 */
const stackAlive = async () =>
{
    for (const port of STACK_PORTS)
    {
        if (!(await portOpen(port)))
        {
            return false;
        }
    }

    return true;
};

const STACK_DOWN = "로컬 스택이 내려가 있음. 스택을 다시 올리고 같은 명령을 부르면 여기서부터 이어 돕니다";

const chromiumPath = () =>
{
    if (process.env.PLAYWRIGHT_CHROMIUM_PATH || !existsSync("/opt/pw-browsers"))
    {
        return process.env.PLAYWRIGHT_CHROMIUM_PATH;
    }

    const build = readdirSync("/opt/pw-browsers").filter((name) => name.startsWith("chromium-")).sort().pop();
    const candidate = build === undefined ? undefined : `/opt/pw-browsers/${build}/chrome-linux/chrome`;

    return candidate !== undefined && existsSync(candidate) ? candidate : undefined;
};

const e2eApp = async (name, app, specs, onlyLastFailed) =>
{
    const busy = [];

    for (const port of app.ports)
    {
        if (await portOpen(port))
        {
            busy.push(port);
        }
    }

    if (busy.length > 0)
    {
        return { ok: false, summary: `${name}: 포트 ${busy.join(", ")} 에 지난 서버가 떠 있어 돌리지 않음` };
    }

    console.log(`\n── e2e ${name}${onlyLastFailed ? " (앞선 실행의 실패만)" : ""} ──`);
    const browser = chromiumPath();
    // 스펙 경로는 앱 폴더 기준이다. Playwright 는 위치 인자를 파일 이름의 부분 일치로 거른다
    const filters = specs === undefined ? [] : specs.map((spec) => spec.slice(`${app.dir}/`.length));
    // Playwright 는 실패한 검사를 `test-results/.last-run.json` 에 적는다. 지난 코드의 것이 남아 있으면 `--last-failed` 가
    // 엉뚱한 검사를 고르므로 돌기 전에 지우고, 이어 돌 때만 이번 지문으로 남겨 둔 것을 되돌려 놓는다
    const lastRun = join(repoRoot, app.dir, "test-results/.last-run.json");
    const saved = lastRunCopy(name);

    rmSync(lastRun, { force: true });

    if (onlyLastFailed)
    {
        mkdirSync(dirname(lastRun), { recursive: true });
        copyFileSync(saved, lastRun);
    }

    // 모노레포는 워크스페이스 이름으로, 패키지 하나짜리 저장소는 앱 폴더에서 부른다
    const { ok, output } = run("npm", ["run", "e2e", ...(RUNNER === "npm" ? [] : ["-w", name]), "--", ...filters, ...(onlyLastFailed ? ["--last-failed"] : [])], {
        cwd: RUNNER === "npm" ? join(repoRoot, app.dir) : undefined,
        env: browser === undefined ? {} : { PLAYWRIGHT_CHROMIUM_PATH: browser },
    });

    // 스택이 죽은 실행의 목록은 남기지 않는다. 죽은 뒤에 돌지 못한 검사가 빠져 있어서, 다음 실행이 그것을 읽으면 그 검사를
    // 건너뛴다. 사본이 없으면 다음 실행은 고른 스펙을 모두 돈다
    const stackDown = !ok && !(await stackAlive());

    mkdirSync(LAST_RUN_DIR, { recursive: true });
    rmSync(saved, { force: true });

    if (!stackDown && existsSync(lastRun))
    {
        copyFileSync(lastRun, saved);
    }

    const count = (word) => Number(output.match(new RegExp(`(\\d+) ${word}`))?.[1] ?? 0);
    const failedSpecs = [...new Set([...output.matchAll(/^\s+\d+\) \[\w+\] › (\S+?):\d+/gm)].map((match) => match[1]))];
    const summary = `${name}: ${specs === undefined ? "스펙 전체" : `스펙 ${specs.length}`}${onlyLastFailed ? " 가운데 앞선 실행의 실패만" : ""} · ${count("passed")} 통과`
        + (count("failed") > 0 ? `, ${count("failed")} 실패(${failedSpecs.join(", ")})` : "")
        + (count("flaky") > 0 ? `, ${count("flaky")} 흔들림` : "");

    // 실패한 뒤 스택이 없으면 그 실패는 코드가 아니라 스택의 것일 수 있다
    if (stackDown)
    {
        return { ok, stackDown: true, summary: `${summary}. 도중에 ${STACK_DOWN}` };
    }

    return { ok, summary };
};

/**
 * Vercel CLI 는 PATH 에 기대지 않고 버전을 고정해 `npx` 로 부른다. 클라우드 세션에는 CLI 가 깔려 있지 않고,
 * 올려 둔 버전이 제각각이면 같은 코드가 세션마다 다르게 빌드되기 때문이다. 버전을 올릴 때는 이 값만 고친다.
 */
const VERCEL_CLI = config.vercel?.cli ?? ["npx", "--yes", "vercel@64.3.1"];

/** pull 은 네트워크 한 번이라 짧게, build 는 앱 하나를 통째로 짓기에 길게 잡는다. 넘기면 멈춘 것으로 보고 칸을 실패로 적는다 */
const VERCEL_PULL_TIMEOUT_MS = 3 * 60 * 1000;
const VERCEL_BUILD_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * 토큰은 vercel CLI 가 `VERCEL_TOKEN` 에서 직접 읽는다. 인자로 넘기면 같은 호스트의 `ps` 에 보인다.
 * 토큰이 없으면 CLI 가 브라우저 기기 로그인을 시작하고 사람이 코드를 넣을 때까지 기다린다. 클라우드 세션에서는
 * 그 대기가 곧 멈춤이므로, 프록시가 진짜 토큰을 붙여 주는 환경(`CCR_AGENT_PROXY_ENABLED`)이면 자리표시자를 넣고
 * 아니면 시작 전에 실패로 적는다.
 */
const vercelEnv = () =>
{
    const token = process.env.VERCEL_TOKEN ?? (process.env.CCR_AGENT_PROXY_ENABLED === "1" ? "proxy" : undefined);

    return {
        ...(token === undefined ? {} : { VERCEL_TOKEN: token }),
        CI: "1",
        VERCEL_TELEMETRY_DISABLED: "1",
        NO_UPDATE_NOTIFIER: "1",
    };
};

const vercelBuild = (name, project) =>
{
    const env = vercelEnv();

    if (env.VERCEL_TOKEN === undefined)
    {
        return `${name}: VERCEL_TOKEN 이 없음(클라우드가 아니면 토큰을 내보내고, 클라우드면 VERCEL_TOKEN=proxy)`;
    }

    const cwd = join(repoRoot, project.dir);
    const linkDir = join(cwd, ".vercel");
    const [command, ...base] = VERCEL_CLI;

    mkdirSync(linkDir, { recursive: true });
    writeFileSync(join(linkDir, "project.json"), JSON.stringify({ projectId: project.id, orgId: VERCEL_ORG }));

    console.log(`\n── vercel build ${name} ──`);
    const pull = run(command, [...base, "pull", "--yes", "--environment=preview"], {
        cwd,
        env,
        quiet: true,
        timeout: VERCEL_PULL_TIMEOUT_MS,
    });

    if (!pull.ok)
    {
        process.stdout.write(pull.output);

        return `${name}: 프리뷰 env 를 받지 못함(vercel pull${pull.timedOut ? ", 시간 초과" : pull.spawnFailed ? ", npx 를 못 찾음" : ""})`;
    }

    const build = run(command, [...base, "build", "--yes"], { cwd, env, timeout: VERCEL_BUILD_TIMEOUT_MS });

    return build.ok ? null : `${name}: vercel build ${build.timedOut ? "시간 초과" : "실패"}`;
};

/** 아이콘을 직접 고르는 라이브러리다(config.icons.libraries). 화면은 디자인 시스템의 아이콘 이름만 쓴다 */
const ICON_LIBRARY = config.icons == null
    ? undefined
    : new RegExp(`from\\s+["'](${config.icons.libraries.join("|")})["']`);

/**
 * 이번에 **더한 줄**에서 아이콘 라이브러리를 직접 부르는 자리를 찾는다. 이미 있던 import 는 세지 않는다.
 * 그것까지 막으면 그 파일을 고치는 PR 마다 남의 빚을 갚아야 한다. 추적하지 않는 새 파일은 통째로 더한 줄이다.
 */
const iconScan = (base, files) =>
{
    if (ICON_LIBRARY === undefined)
    {
        return { state: "pass", detail: "이 저장소는 아이콘 규칙을 쓰지 않음(config.icons 가 없음)" };
    }

    const screen = (file) => SCREEN_PATTERN.test(file);
    const mergeBase = run("git", ["merge-base", base, "HEAD"], { quiet: true }).stdout.trim();
    const diff = run("git", ["diff", "-U0", mergeBase, "--", ...SCREEN_DIRS], { quiet: true }).stdout;
    const hits = [];
    let file = "";

    for (const line of diff.split("\n"))
    {
        if (line.startsWith("+++ "))
        {
            file = line.replace(/^\+\+\+ (b\/)?/, "");
        }
        else if (line.startsWith("+") && screen(file) && ICON_LIBRARY.test(line))
        {
            hits.push(file);
        }
    }

    const untracked = run("git", ["ls-files", "--others", "--exclude-standard"], { quiet: true }).stdout.split("\n");

    for (const path of untracked.filter((path) => screen(path) && files.includes(path)))
    {
        if (ICON_LIBRARY.test(readFileSync(join(repoRoot, path), "utf8")))
        {
            hits.push(path);
        }
    }

    const unique = [...new Set(hits)];

    return unique.length === 0
        ? { state: "pass", detail: "더한 줄에 아이콘 라이브러리 직접 import 없음" }
        : { state: "fail", detail: `${config.icons.hint ?? "디자인 시스템의 아이콘"} 대신 라이브러리를 직접 부름: ${unique.join(", ")}` };
};

const copyScan = (files) =>
{
    if (config.copy == null)
    {
        return { state: "pass", detail: "이 저장소는 화면 글 검사기를 쓰지 않음(config.copy 가 없음)" };
    }

    const screenFiles = files.filter((file) => COPY_PATTERN.test(file) && existsSync(join(repoRoot, file)));

    if (screenFiles.length === 0)
    {
        return { state: "pass", detail: "화면 파일이 바뀌지 않음" };
    }

    const roots = [...new Set(screenFiles.map((file) => file.split("/").slice(0, 3).join("/")))];
    const { output } = run(config.copy.command[0], [...config.copy.command.slice(1), ...roots], { quiet: true });
    const hits = output.split("\n").filter((line) => screenFiles.some((file) => line.startsWith(`${file}:`)));

    if (hits.length === 0)
    {
        return { state: "pass", detail: `바뀐 화면 파일 ${screenFiles.length}개에 지적 없음` };
    }

    console.log(`\n── 화면 글 ──\n${hits.join("\n")}`);

    return { state: "fail", detail: `바뀐 화면 파일에 ${hits.length}곳. \`scan-copy.mjs\` 출력을 봅니다` };
};

const STATE_MARK = { pass: "✓ 통과", fail: "✗ 실패", foreign: "△ 남의 빨강", skipped: "◌ 못 돌림" };

const main = async () =>
{
    const startedAt = Date.now();
    const options = parseArgs(process.argv.slice(2));
    const checks = [];
    const record = async (name, check) =>
    {
        if (options.skip.has(name))
        {
            checks.push({ name, state: "skipped", detail: options.skip.get(name) });
            return;
        }

        const started = Date.now();
        const result = await check();
        const seconds = Math.round((Date.now() - started) / 1000);

        // 남의 빨강이라고 적은 칸도 돌린다. 초록이면 그대로 통과로 적어 낡은 까닭이 표에 남지 않는다
        checks.push(result.state === "fail" && options.foreign.has(name)
            ? { name, seconds, state: "foreign", detail: `${result.detail}. ${options.foreign.get(name)}` }
            : { name, seconds, ...result });
    };

    if (!(await stackAlive()))
    {
        console.error(`로컬 스택이 없습니다. ${config.stack?.startHint ?? "스택을 띄운 뒤"} 다시 돌립니다.`);
        process.exit(2);
    }

    run("git", ["fetch", "--quiet", "origin", options.base.replace(/^origin\//, "")], { quiet: true });

    const files = changedFiles(options.base);
    const affected = affectedPackages(options.base);
    const fingerprint = codeFingerprint(options.base);
    const state = options.fresh ? emptyState(fingerprint) : readState(fingerprint);
    const resumed = Object.keys(state.e2e).length + Object.keys(state.vercel).length > 0;
    console.log(`기준 ${options.base} · 바뀐 파일 ${files.length}개 · 바뀐 패키지 ${affected.size}개${resumed ? " · 같은 코드의 앞선 실행을 이어 씀(--fresh 로 끔)" : ""}`);

    for (const task of ["typecheck", "test", "build"])
    {
        await record(task, () => turboTask(task, options.base));
    }

    const e2ePlans = [];

    await record("e2e", async () =>
    {
        const targets = Object.entries(E2E_APPS).filter(([name]) => affected.has(name));
        const tracked = run("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { quiet: true }).stdout.split("\n").filter(Boolean);
        const io = diskIo(repoRoot, tracked);
        const workspaces = readWorkspaces(repoRoot, tracked);
        const results = [];
        let stackDown = false;

        for (const [name, app] of targets)
        {
            // select: false 인 앱은 스펙을 고르지 않고 늘 전체를 돈다(monorepo 가 아니거나 Next 앱 라우터가 아닐 때)
            const plan = app.select === false
                ? { mode: "full", specs: [{ file: "(전체)", why: "스펙 선택을 끈 앱" }], skipped: [], reason: "스펙 선택을 끈 앱이라 늘 전체를 돎" }
                : selectSpecs({ app: { name, dir: app.dir }, changed: files, workspaces, io, full: options.e2e === "full" });
            const total = plan.specs.length + plan.skipped.length;
            const specs = plan.mode === "full" ? undefined : plan.specs.map((spec) => spec.file);
            // 같은 지문이라도 고른 스펙이 다르면(--e2e full 과 affected) 앞선 결과를 쓰지 않는다
            const planKey = specs === undefined ? "full" : specs.join(",");
            const previous = state.e2e[name]?.planKey === planKey ? state.e2e[name] : undefined;
            const tail = app.select === false ? `(${plan.reason})` : `(전체 ${total}개 중${plan.mode === "full" ? " 전부" : ""}, ${plan.reason})`;

            if (app.select !== false)
            {
                e2ePlans.push({ name, ...plan, total });
            }

            if (plan.specs.length === 0)
            {
                results.push({ ok: true, summary: `${name}: 스펙 0/${total} · ${plan.reason}` });
                continue;
            }

            if (previous?.ok)
            {
                results.push({ ok: true, summary: `${previous.summary} ${tail}. 같은 코드로 앞선 실행에서 통과해 다시 돌지 않음` });
                continue;
            }

            if (stackDown || !(await stackAlive()))
            {
                stackDown = true;
                results.push({ ok: false, summary: `${name}: 돌리지 않음. ${STACK_DOWN}` });
                continue;
            }

            const onlyLastFailed = previous !== undefined && existsSync(lastRunCopy(name));
            const result = await e2eApp(name, app, specs, onlyLastFailed);
            // 실패만 다시 돈 앱은 앞선 실행의 숫자를 함께 적는다. 다시 돈 몇 개만 적으면 그 앱이 몇 개만 도는 것처럼 읽힌다
            const before = onlyLastFailed ? ` (앞선 실행: ${previous.summary.replace(/^[^:]+: /, "")})` : "";
            const summary = `${result.summary}${before}`;

            stackDown = result.stackDown === true;

            // 스택이 죽어 실패한 결과는 남기지 않는다. 남기면 다음 실행이 실패만 골라 돌다가 죽기 전에 돌지 못한 검사를 빠뜨린다
            if (stackDown)
            {
                delete state.e2e[name];
            }
            else
            {
                state.e2e[name] = { planKey, ok: result.ok, summary };
            }

            writeState(state);
            results.push({ ...result, summary: `${summary} ${tail}` });
        }

        if (Object.keys(E2E_APPS).length === 0)
        {
            return { state: "pass", detail: "이 저장소는 e2e 를 쓰지 않음(config.e2e.apps 가 비어 있음)" };
        }

        if (targets.length === 0)
        {
            return { state: "pass", detail: "e2e 가 있는 앱이 바뀌지 않음" };
        }

        return {
            state: results.every((result) => result.ok) ? "pass" : "fail",
            detail: results.map((result) => result.summary).join(" / "),
        };
    });

    await record("vercel build", () =>
    {
        // Vercel 은 ignoreCommand 가 256자를 넘으면 빌드 전에 배포를 실패로 적는다. `vercel build` 는 그것을 재지 않고,
        // 컨테이너인 pdf-converter 는 로컬에서 빌드하지 않으므로 여기서 모든 앱의 vercel.json 을 직접 잰다
        if (config.vercel == null)
        {
            return { state: "pass", detail: "이 저장소는 Vercel 을 쓰지 않음(config.vercel 이 없음)" };
        }

        const appsDir = config.vercel.appsDir ?? "apps";
        const tooLong = (existsSync(join(repoRoot, appsDir)) ? readdirSync(join(repoRoot, appsDir)) : [])
            .map((app) => join(appsDir, app, "vercel.json"))
            .filter((path) => existsSync(join(repoRoot, path)))
            .filter((path) => (JSON.parse(readFileSync(join(repoRoot, path), "utf8")).ignoreCommand ?? "").length > 256);

        if (tooLong.length > 0)
        {
            return { state: "fail", detail: `ignoreCommand 가 256자를 넘음: ${tooLong.join(", ")}` };
        }

        const targets = Object.entries(VERCEL_PROJECTS).filter(([name]) => affected.has(name));
        const reused = targets.filter(([name]) => state.vercel[name] === true).map(([name]) => name);
        const failures = targets
            .filter(([name]) => !reused.includes(name))
            .map(([name, project]) =>
            {
                const failure = vercelBuild(name, project);

                state.vercel[name] = failure === null;
                writeState(state);

                return failure;
            })
            .filter((failure) => failure !== null);
        const reuseNote = reused.length === 0 ? "" : ` · ${reused.join(", ")} 는 같은 코드로 앞선 실행에서 통과해 다시 짓지 않음`;
        const nodeMajor = Number(process.versions.node.split(".")[0]);
        const nodeNote = nodeMajor === VERCEL_NODE_MAJOR ? "" : ` (로컬 Node ${nodeMajor}, Vercel ${VERCEL_NODE_MAJOR})`;
        const containers = (config.vercel.containerPackages ?? []).filter((name) => affected.has(name));
        const container = containers.length > 0 ? ` · ${containers.join(", ")} 는 컨테이너라 로컬에서 재현하지 않음` : "";

        if (targets.length === 0)
        {
            return { state: "pass", detail: `배포되는 앱이 바뀌지 않음${container}` };
        }

        return failures.length === 0
            ? { state: "pass", detail: `${targets.map(([name]) => name).join(", ")} 통과${nodeNote}${container}${reuseNote}` }
            : { state: "fail", detail: `${failures.join(" / ")}${nodeNote}${container}${reuseNote}` };
    });

    await record("화면 글", () => copyScan(files));
    await record("아이콘", () => iconScan(options.base, files));

    // 어느 칸이 시간을 먹는지 보이려고 칸마다 걸린 시간을 적는다
    const clock = (seconds) => (seconds === undefined ? "-" : seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${seconds % 60}초`);
    const totalSeconds = Math.round((Date.now() - startedAt) / 1000);
    const table = [
        "| 칸 | 결과 | 시간 | 내용 |",
        "|---|---|---|---|",
        ...checks.map((check) => `| ${check.name} | ${STATE_MARK[check.state]} | ${clock(check.seconds)} | ${check.detail} |`),
        `| 합계 | | ${clock(totalSeconds)} | |`,
    ].join("\n");

    // 어느 스펙이 왜 돌았는지와 건너뛴 스펙이다. 앱 하나가 접힌 목록 하나다
    const planText = e2ePlans.map((plan) =>
    {
        const short = (file) => file.split("/").pop().replace(/\.spec\.[jt]sx?$/, "");
        const lines = plan.specs.map((spec) => `- ${short(spec.file)}: ${spec.why}`);
        const skipped = plan.skipped.length === 0 ? "" : `\n- 건너뜀 ${plan.skipped.length}: ${plan.skipped.map(short).join(", ")}`;

        return `<details><summary>e2e ${plan.name}: ${plan.specs.length}/${plan.total} 스펙 · ${plan.reason}</summary>\n\n${lines.join("\n")}${skipped}\n\n</details>`;
    }).join("\n\n");
    const markdown = planText === "" ? `${table}\n` : `${table}\n\n${planText}\n`;

    mkdirSync(join(repoRoot, ".pr-check"), { recursive: true });
    writeFileSync(join(repoRoot, ".pr-check/result.md"), markdown);
    writeFileSync(join(repoRoot, ".pr-check/result.json"), `${JSON.stringify({ base: options.base, checks, e2e: e2ePlans }, null, 4)}\n`);

    console.log(`\n${markdown}\n표는 .pr-check/result.md 에도 남겼습니다. 4단계 규약 점검의 칸은 사람이 채웁니다.`);
    process.exit(checks.some((check) => check.state === "fail") ? 1 : 0);
};

main().catch((error) =>
{
    console.error(error);
    process.exit(2);
});
