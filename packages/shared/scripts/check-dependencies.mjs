import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 워크스페이스 사이의 의존이 규약대로인지 본다.
 *
 * 의존 방향은 `docs/개발-방법론.md` 의 「패키지 구조와 의존 방향」 이 정본이고, 이 검사는 그 규약을
 * 문서가 아니라 `turbo test` 가 지키게 한다. 보는 것은 셋이다.
 *
 *   1. 선언하지 않은 import: 소스가 `@hathway/*` 를 import 하는데 그 워크스페이스의 package.json 에 없다.
 *   2. 층을 거스르는 의존: 도메인이 앱이나 어댑터를 부르는 것처럼 아래 층이 위 층을 가리킨다.
 *   3. 도메인과 core 의 런타임 의존: `effect` 밖의 외부 패키지를 dependencies 에 둔다.
 *
 * ⚠ **1번이 가장 중요하다.** npm 워크스페이스는 선언하지 않은 `@hathway/*` 도 그대로 import 하게 해 주지만
 *    turbo 는 package.json 의 선언만 해시에 넣는다. 그래서 선언이 빠지면 그 패키지를 고쳐도 부르는 쪽의
 *    검사가 캐시로 끝나 거짓 초록이 된다(resolv-ai 에서 도메인이 core 를 선언 없이 부르던 것을 이 검사가 찾았다).
 *
 * 순환은 여기서 보지 않는다. turbo 가 선언된 그래프의 순환을 실행 전에 막고, 1번이 모든 import 를 선언으로
 * 끌어올리므로 선언되지 않은 순환이 남을 자리가 없다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

/**
 * 패키지마다 어느 층인지 적는다. `apps/*` 는 모두 앱 층이라 적지 않는다.
 *
 * ⚠ **여기 없는 패키지는 실패로 막는다.** 새 패키지가 서면 어느 층인지 정하는 것이 그 패키지의 첫 작업이다.
 *    모르는 것을 통과시키면 층 규칙이 새 패키지에서부터 무너진다.
 */
const LAYER = {
    "@hathway/shared": "shared",
    "@hathway/ui": "ui",
    // 적재 파이프라인과 앱이 함께 읽는 표기 · 분류의 계약. 도메인이 부르므로 shared 와 같은 맨 아래 층이다
    "@hathway/schema": "shared",
    "@hathway/access": "domain",
    "@hathway/notes": "domain",
    "@hathway/agents": "domain",
    "@hathway/market": "domain",
    "@hathway/research": "domain",
    "@hathway/analytics": "domain", // scaffold:module posthog
    "@hathway/preferences": "domain", // scaffold:module plugin
    "@hathway/adapters-postgres": "adapter",
    "@hathway/adapters-storage": "adapter",
    "@hathway/adapters-posthog": "adapter", // scaffold:module posthog
    "@hathway/blocks": "blocks",
};

/**
 * 층마다 부를 수 있는 층.
 *
 * 도메인끼리는 서로 부를 수 있다. 한 방향이어야 한다는 규칙은 순환을 막는 turbo 가 지킨다.
 * 도메인 둘이 서로를 필요로 하면 그 조각이 core 나 shared 로 내려가야 한다는 것이 정본의 규칙이다.
 */
const ALLOWED = {
    shared: [],
    ui: [],
    core: ["shared"],
    domain: ["shared", "core", "domain"],
    adapter: ["shared", "core", "domain"],
    blocks: ["shared", "ui"],
    tool: ["shared"],
    app: ["shared", "ui", "core", "domain", "adapter", "blocks"],
};

/** 도메인과 core 가 dependencies 에 둘 수 있는 외부 패키지. 정본의 「effect 외 런타임 의존 금지」 다 */
const PURE_RUNTIME = new Set(["effect"]);

/** shared 가 dependencies 에 두면 안 되는 것. 정본의 「React/DB/Next 의존 금지」 다 */
const SHARED_FORBIDDEN = /^(react|react-dom|next|pg|@supabase\/.+)$/;

/** import 를 찾는 자리. 패키지 뿌리의 설정 파일도 함께 본다 */
const SOURCE_DIRS = ["src", "e2e", "scripts", "test"];
const ROOT_CONFIG = /\.config\.(ts|mts|mjs|js)$/;
const SOURCE_EXT = /\.(ts|tsx|mts|mjs|js|cjs)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".turbo", ".well-known"]);

/** 정적 import · export from · 동적 import · require · vi.mock 이 가리키는 워크스페이스 이름 */
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|\bvi\.mock\s*\(\s*)["'](@hathway\/[a-z0-9-]+)(?:\/[^"']*)?["']/g;

const workspaces = ["apps", "packages"].flatMap((group) =>
    readdirSync(join(repoRoot, group))
        .map((name) => join(repoRoot, group, name))
        .filter((dir) => existsSync(join(dir, "package.json")))
        .map((dir) =>
        {
            const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));

            return {
                dir,
                name: manifest.name,
                layer: group === "apps" ? "app" : LAYER[manifest.name],
                dependencies: Object.keys(manifest.dependencies ?? {}),
                declared: new Set([
                    ...Object.keys(manifest.dependencies ?? {}),
                    ...Object.keys(manifest.devDependencies ?? {}),
                    ...Object.keys(manifest.peerDependencies ?? {}),
                ]),
            };
        }));

const layerOf = new Map(workspaces.map((workspace) => [workspace.name, workspace.layer]));

const walk = (dir) =>
{
    const found = [];

    for (const entry of readdirSync(dir))
    {
        if (SKIP_DIRS.has(entry))
        {
            continue;
        }

        const full = join(dir, entry);

        if (statSync(full).isDirectory())
        {
            found.push(...walk(full));
        }
        else if (SOURCE_EXT.test(entry))
        {
            found.push(full);
        }
    }

    return found;
};

const sourcesOf = (workspace) => [
    ...SOURCE_DIRS.map((sub) => join(workspace.dir, sub)).filter(existsSync).flatMap(walk),
    ...readdirSync(workspace.dir).filter((entry) => ROOT_CONFIG.test(entry)).map((entry) => join(workspace.dir, entry)),
];

const problems = [];
let scanned = 0;

for (const workspace of workspaces)
{
    const where = relative(repoRoot, workspace.dir);

    if (workspace.layer === undefined)
    {
        problems.push(`${where}: ${workspace.name} 이(가) 어느 층인지 적혀 있지 않다. 이 스크립트의 LAYER 에 줄을 더할 것`);
        continue;
    }

    // 1. 선언하지 않은 import
    for (const file of sourcesOf(workspace))
    {
        scanned += 1;
        const lines = readFileSync(file, "utf8").split("\n");

        lines.forEach((line, index) =>
        {
            for (const match of line.matchAll(IMPORT))
            {
                const target = match[1];

                if (target !== workspace.name && !workspace.declared.has(target))
                {
                    problems.push(`${relative(repoRoot, file)}:${index + 1}: ${target} 을(를) import 하는데 ${workspace.name} 의 package.json 에 없다`);
                }
            }
        });
    }

    // 2. 층을 거스르는 의존
    for (const target of workspace.declared)
    {
        const targetLayer = layerOf.get(target);

        if (targetLayer !== undefined && !ALLOWED[workspace.layer].includes(targetLayer))
        {
            problems.push(`${where}: ${workspace.layer} 층인 ${workspace.name} 이(가) ${targetLayer} 층인 ${target} 에 의존한다`);
        }
    }

    // 3. 도메인과 core 의 런타임 의존, shared 의 금지 의존
    for (const target of workspace.dependencies)
    {
        if (layerOf.has(target))
        {
            continue;
        }

        if ((workspace.layer === "domain" || workspace.layer === "core") && !PURE_RUNTIME.has(target))
        {
            problems.push(`${where}: ${workspace.layer} 층인 ${workspace.name} 의 dependencies 에 ${target} 이(가) 있다. effect 밖의 런타임 의존은 두지 않는다`);
        }

        if (workspace.layer === "shared" && SHARED_FORBIDDEN.test(target))
        {
            problems.push(`${where}: ${workspace.name} 의 dependencies 에 ${target} 이(가) 있다. shared 는 React · DB · Next 에 의존하지 않는다`);
        }
    }
}

console.log(`워크스페이스 ${workspaces.length}개의 선언과 파일 ${scanned}개의 import 를 대조했다.`);

if (problems.length === 0)
{
    console.log("규약을 어긴 의존 없음.");
}
else
{
    console.error("");

    for (const problem of problems)
    {
        console.error(`✗ ${problem}`);
    }

    console.error("\n의존 방향의 정본은 docs/개발-방법론.md 의 「패키지 구조와 의존 방향」 이다.");
    process.exit(1);
}
