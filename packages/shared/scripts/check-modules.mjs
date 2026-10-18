import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 코어와 모듈이 섞이지 않았고, 모듈 파일이 저장소와 맞는가.
 *
 * 모듈(결제 등)은 코어의 확장 지점(`apps/web/src/extensions/*`)을 채우고, 둘을 잇는 곳은 잇는 파일(`WIRING`)뿐이다.
 * 모듈마다 `modules/<이름>/` 에 모듈 파일 넷(`module.md` · `owns.json` · `wiring.md` · `acceptance.json`)이 있고, 모듈을
 * 떼고 붙이는 일(`create.sh --with` · `/scaffold-add`)이 그 파일을 믿는다. 그래서 파일이 저장소와 어긋나면 실패한다.
 *
 *   1. 모듈 파일 넷이 모두 있다
 *   2. 모듈이 가진 자리(`owns.json` 의 `paths`)가 모두 있다. 옮기거나 지웠는데 목록에 남으면 떼는 일이 헛돈다
 *   3. 모듈이 가진 자리 밖의 코드는 그 모듈의 패키지와 폴더를 import 하지 않는다. 잇는 파일과, 그 모듈을 요구하는
 *      모듈(`requires`)의 자리만 예외다
 *   4. 표시 줄(`scaffold:module <이름>`)은 있는 모듈을 가리키고, `begin` 과 `end` 가 짝을 이룬다
 *   5. 표시 줄이 있는 파일은 그 모듈의 `wiring.md` 에 적혀 있다. 적히지 않은 표시는 붙이는 쪽이 모른다
 *   6. `owns.json` 의 `dependencies` 가 가리키는 package.json 에 그 의존이 있다
 *   7. `owns.json` 의 `docs` 가 가리키는 줄이 그 문서에 꼭 한 번 있다. 떼는 일이 그 줄을 걷는다
 *   8. 코어의 코드는 주석에서도 모듈의 자리(`modules/<이름>/`)와 불변식(`owns.json` 의 `invariants`)을 가리키지 않는다.
 *      모듈을 떼면 가리킬 곳이 사라진다. 그 모듈의 표시 줄은 함께 걷히므로 셈하지 않는다
 *
 * ⚠ import 와 표시만 기계가 본다. 표 · 문장처럼 판단이 드는 자리는 `wiring.md` 가 적고 사람과 에이전트가 고친다.
 */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** 모듈을 코어에 잇는 파일. 이 셋만 모듈의 코드를 import 한다(서버의 확장 지점 · 메뉴 · 브라우저 쪽 자리) */
const WIRING = ["apps/web/src/lib/modules.ts", "apps/web/src/lib/moduleNav.ts", "apps/web/src/lib/moduleClient.ts"];

const MODULE_FILES = ["module.md", "owns.json", "wiring.md", "acceptance.json"];

const SKIP = new Set(["node_modules", ".next", "dist", ".turbo", "test-results", "playwright-report"]);

const walk = (dir, accept) =>
{
    const found = [];

    for (const entry of readdirSync(dir))
    {
        if (SKIP.has(entry))
        {
            continue;
        }

        const path = join(dir, entry);

        if (statSync(path).isDirectory())
        {
            found.push(...walk(path, accept));
        }
        else if (accept(entry))
        {
            found.push(path);
        }
    }

    return found;
};

const problems = [];
const modulesDir = join(repoRoot, "modules");
const names = existsSync(modulesDir) ? readdirSync(modulesDir).filter((entry) => statSync(join(modulesDir, entry)).isDirectory()) : [];
const modules = new Map();

// 1 · 2 · 6
for (const name of names)
{
    for (const file of MODULE_FILES)
    {
        if (!existsSync(join(modulesDir, name, file)))
        {
            problems.push(`  modules/${name}/${file} 이 없다`);
        }
    }

    const ownsPath = join(modulesDir, name, "owns.json");

    if (!existsSync(ownsPath))
    {
        continue;
    }

    const owns = JSON.parse(readFileSync(ownsPath, "utf8"));

    modules.set(name, owns);

    for (const path of owns.paths ?? [])
    {
        if (!existsSync(join(repoRoot, path)))
        {
            problems.push(`  modules/${name}/owns.json 의 자리가 없다: ${path}`);
        }
    }

    for (const [manifest, dependencies] of Object.entries(owns.dependencies ?? {}))
    {
        const declared = JSON.parse(readFileSync(join(repoRoot, manifest), "utf8"));

        for (const dependency of dependencies)
        {
            if (declared.dependencies?.[dependency] === undefined && declared.devDependencies?.[dependency] === undefined)
            {
                problems.push(`  modules/${name}/owns.json 의 의존이 ${manifest} 에 없다: ${dependency}`);
            }
        }
    }
}

// 7
for (const [name, owns] of modules)
{
    for (const [doc, lines] of Object.entries(owns.docs ?? {}))
    {
        const text = readFileSync(join(repoRoot, doc), "utf8").split("\n");

        for (const needle of lines)
        {
            const hits = text.filter((line) => line.includes(needle)).length;

            if (hits !== 1)
            {
                problems.push(`  modules/${name}/owns.json 의 문서 줄이 ${doc} 에 ${hits}번 있다(한 번이어야 한다): ${needle}`);
            }
        }
    }
}

/** 모듈의 표시 줄과 블록을 빈 줄로 바꾼다(줄 번호는 그대로). 떼면 함께 걷히는 자리라 코어로 치지 않는다 */
const unmarked = (source, name) =>
{
    let inside = 0;

    return source.split("\n").map((line) =>
    {
        if (line.includes(`scaffold:module ${name} begin`))
        {
            inside += 1;

            return "";
        }

        if (line.includes(`scaffold:module ${name} end`))
        {
            inside -= 1;

            return "";
        }

        return inside > 0 || new RegExp(`scaffold:module ${name}(?![a-z0-9-])`).test(line) ? "" : line;
    }).join("\n");
};

const ownedBy = (name, path) => (modules.get(name)?.paths ?? []).some((owned) => path === owned || path.startsWith(owned));

/** `name` 을 (건너서라도) 요구하는 모듈의 자리인가. 요구하는 쪽은 요구받는 쪽의 코드를 부를 수 있다 */
const requiredBy = (name, path, seen = new Set()) =>
    [...modules].some(([other, owns]) =>
    {
        if (seen.has(other) || !(owns.requires ?? []).includes(name))
        {
            return false;
        }

        seen.add(other);

        return ownedBy(other, path) || requiredBy(other, path, seen);
    });

// 3
const IMPORT = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;
let scanned = 0;

for (const root of ["apps", "packages"])
{
    for (const file of walk(join(repoRoot, root), (entry) => /\.(ts|tsx|mts|mjs)$/.test(entry)))
    {
        const path = relative(repoRoot, file);

        if (WIRING.includes(path))
        {
            continue;
        }

        scanned += 1;

        const source = readFileSync(file, "utf8");

        for (const [name, owns] of modules)
        {
            if (ownedBy(name, path) || requiredBy(name, path))
            {
                continue;
            }

            const core = unmarked(source, name);

            if (core.includes(`modules/${name}/`))
            {
                const line = core.slice(0, core.indexOf(`modules/${name}/`)).split("\n").length;

                problems.push(`  ${path}:${line}  모듈(${name})의 자리 modules/${name}/ 을 코어에서 가리킨다`);
            }

            if (owns.invariants !== undefined && core.includes(`${owns.invariants}-`))
            {
                const line = core.slice(0, core.indexOf(`${owns.invariants}-`)).split("\n").length;

                problems.push(`  ${path}:${line}  모듈(${name})의 불변식 ${owns.invariants}-* 를 코어에서 가리킨다`);
            }

            for (const match of source.matchAll(IMPORT))
            {
                const specifier = match[1];
                const prefixes = [...(owns.packages ?? []), ...(owns.imports ?? [])];

                if (prefixes.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`)))
                {
                    const line = source.slice(0, match.index).split("\n").length;

                    problems.push(`  ${path}:${line}  ${specifier} 를 모듈(${name}) 밖에서 부른다`);
                }
            }
        }
    }
}

// 4 · 5
const MARKER = /scaffold:module ([a-z][a-z0-9-]*)(?: (begin|end))?/g;
const marked = new Map();

for (const root of ["apps", "packages", "supabase"])
{
    // 비밀을 담는 `.env*` 는 저장소에 없다. 본보기(`.env.example`)만 본다
    for (const file of walk(join(repoRoot, root), (entry) => !/\.(png|jpg|woff2|ico)$/.test(entry) && (!entry.startsWith(".env") || entry === ".env.example")))
    {
        const path = relative(repoRoot, file);
        const source = readFileSync(file, "utf8");
        const open = new Map();

        for (const match of source.matchAll(MARKER))
        {
            const [, name, edge] = match;
            const line = source.slice(0, match.index).split("\n").length;

            if (!modules.has(name))
            {
                problems.push(`  ${path}:${line}  모르는 모듈을 가리킨다: ${name}`);
                continue;
            }

            marked.set(name, new Set([...(marked.get(name) ?? []), path]));

            if (edge === "begin")
            {
                open.set(name, (open.get(name) ?? 0) + 1);
            }
            else if (edge === "end")
            {
                open.set(name, (open.get(name) ?? 0) - 1);
            }
        }

        for (const [name, depth] of open)
        {
            if (depth !== 0)
            {
                problems.push(`  ${path}  모듈 ${name} 의 begin 과 end 가 짝을 이루지 않는다`);
            }
        }
    }
}

for (const [name, files] of marked)
{
    const wiring = readFileSync(join(modulesDir, name, "wiring.md"), "utf8");

    for (const path of files)
    {
        if (!wiring.includes(path))
        {
            problems.push(`  ${path} 에 표시 줄이 있는데 modules/${name}/wiring.md 에 적혀 있지 않다`);
        }
    }
}

if (problems.length > 0)
{
    console.log(`✗ 모듈 검사에 걸린 것 ${problems.length}개`);
    console.log(problems.join("\n"));
    console.log("\n  코어는 확장 지점(apps/web/src/extensions)만 알고, 모듈은 잇는 파일에서 잇는다. 모듈 파일은 modules/<이름>/ 에 있다.");
    process.exit(1);
}

const markers = [...marked.values()].reduce((sum, files) => sum + files.size, 0);

console.log(`모듈 ${modules.size}개(${[...modules.keys()].join(" · ")}). 코드 ${scanned}개가 모듈과 섞이지 않았고, 표시 줄이 있는 파일 ${markers}개가 모두 wiring.md 에 있다.`);

// 모듈 파일이 없는데 모듈의 자리(`apps/web/src/modules/<이름>/`)에 남은 코드는 편입한 뒤 옮기지 않은 것이다.
// 실패로 막지 않는다. 편입 커밋과 옮기는 커밋 사이에도 저장소가 초록이어야 해서다(`/scaffold-fit` 4 · 5번)
const webModules = join(repoRoot, "apps/web/src/modules");
const stray = existsSync(webModules)
    ? readdirSync(webModules).filter((entry) => statSync(join(webModules, entry)).isDirectory() && !modules.has(entry))
    : [];

if (stray.length > 0)
{
    console.log(`⚠ 모듈 파일이 없는 모듈의 자리: ${stray.map((entry) => `apps/web/src/modules/${entry}/`).join(" · ")}. 편입했으면 제품의 자리로 옮긴다`);
}
