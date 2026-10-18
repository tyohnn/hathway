/**
 * `pr:check` 의 e2e 칸이 앱 안에서 어느 스펙을 돌릴지 고르는 순수 규칙이다. 디스크는 `io` 로 받아서
 * `e2e-select.test.mjs` 가 파일 표만으로 규칙을 잰다.
 *
 * 고르는 방법은 세 단계다.
 *
 *   1. 바뀐 파일을 가른다. 앱 전체에 닿는 것(마이그레이션 · 시드 · 앱 설정 · 레이아웃과 그것이 부르는 파일, 그리고
 *      패키지에서 화면까지 따라갈 수 없는 파일)이 하나라도 있으면 앱의 스펙을 모두 돌린다.
 *   2. 나머지 소스는 import 를 거슬러 올라 어느 화면(page · route)이 부르는지 찾는다. 그 화면의 주소가 「바뀐 주소」다.
 *      앱이 쓰는 패키지의 파일도 같다. `<스코프>/<패키지>/<입구>`(워크스페이스 이름) 를 그 패키지의 `exports` 로 풀어 앱의 파일과 한 그래프로 잇는다.
 *   3. 스펙이 닿는 주소를 모은다. 스펙과 스펙이 부르는 도우미에 적힌 `"/주소"` 글자와, 그 주소의 화면 소스에 적힌
 *      `"/다른주소"`(링크 · redirect · fetch)를 따라 간다. 바뀐 주소와 겹치는 스펙만 돌린다.
 *
 * ⚠ **모르면 돌린다.** 닿는 주소를 하나도 못 찾은 스펙은 화면을 알 수 없는 스펙이라 바뀐 주소가 있을 때마다 돈다.
 *    한 번도 틀릴 수 없는 판정이 아니다. 주소 글자를 거치지 않고 화면을 오가는 스펙(`click` 만으로 다른 화면에 들어가는
 *    경우)은 놓칠 수 있으므로, 통합 브랜치를 릴리스 브랜치에 올리기 전에는 `pr:check -- --e2e full` 로 한 번 전체를 돈다.
 * ⚠ **import 를 글자로 읽는다.** `import(`./${이름}`)` 처럼 계산한 경로는 따라가지 못한다. 그런 파일을 고치면 어느 화면도
 *    부르지 않는 파일로 보여 돌지 않는다.
 * ⚠ **패키지 파일은 입구에서 닿아야 따라간다.** 패키지의 `exports` 어느 입구에서도 import 로 닿지 않는 파일(스크립트 · 설정 ·
 *    `package.json` · 지운 파일)은 앱이 어떻게 쓰는지 알 수 없어 앱 전체를 돌린다. 입구에서는 닿는데 앱의 어느 파일도 그 입구를
 *    부르지 않으면 그 앱은 그 파일을 쓰지 않는 것이라 돌지 않는다. 패키지 하나를 고쳤다고 그 패키지를 쓰는 앱의 스펙을 모두
 *    돌리던 것을(2026-10-16 까지) 이렇게 좁혔다. 블록 하나를 고친 PR 이 네 앱의 e2e 전체를 돌리던 자리다.
 * ⚠ **Tailwind 의 `@source` 는 따라가지 않는다.** 패키지의 컴포넌트에 클래스를 더하면 앱의 CSS 에도 그 유틸리티가 생기지만,
 *    그 클래스를 쓰는 것은 그 컴포넌트뿐이고 그 컴포넌트는 import 로 따라간다.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";

/** 앱 전체에 닿는 설정과 환경이다 */
const APP_WIDE = /^(next\.config|playwright\.config|tsconfig|package\.json|vercel\.json|postcss\.config|middleware|proxy|instrumentation|turbo\.json|components\.json)/;
/** e2e 가 읽지 않는 파일이다 */
const IGNORED = /(\.test\.[jt]sx?$|\.md$|^test\/|vitest\.config|^CLAUDE\.md$)/;
const SHELL_FILES = /^(layout|template|error|global-error|not-found|loading|default)\.(tsx?|jsx?)$/;
const ENTRY_FILES = /^(page|route)\.(tsx?|jsx?)$/;
const CODE = /\.(tsx?|jsx?|mjs|css|json)$/;
const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".json"];

const IMPORT_PATTERN = /(?:from\s*|import\s*\(?\s*|require\(\s*)["']([^"']+)["']/g;
/** `"/주소"` 꼴의 글자와 정규식 속의 `\/주소` 다 */
const URL_STRING = /["'`](\/[A-Za-z0-9_\-/]*)/g;
const URL_REGEX = /\\\/([A-Za-z][\w-]*)/g;

/** 이만큼 넘는 화면이 부르는 파일은 링크를 읽지 않는다. 주소 표(`paths.ts`)는 보통 화면 넷 이상이 부르고, 한 화면의 하위 컴포넌트는 그보다 적게 불린다 */
const ROUTE_TABLE_FAN_IN = 3;

const dependencySet = (workspaces, name) =>
{
    const seen = new Set();
    const queue = [name];

    while (queue.length > 0)
    {
        for (const dep of workspaces[queue.pop()]?.deps ?? [])
        {
            if (workspaces[dep] !== undefined && !seen.has(dep))
            {
                seen.add(dep);
                queue.push(dep);
            }
        }
    }

    return seen;
};

/** `exports` 의 값은 글자이거나 조건별 표(`{ types, default }`)다. 표면 실제로 실리는 쪽을 먼저 고른다 */
const exportTarget = (value) =>
{
    if (typeof value === "string")
    {
        return value;
    }

    if (value === null || typeof value !== "object")
    {
        return undefined;
    }

    for (const key of ["import", "default", "require", "types"])
    {
        const found = exportTarget(value[key]);

        if (found !== undefined)
        {
            return found;
        }
    }

    return undefined;
};

/** `exports` 를 입구 → 값의 표로 본다. 글자 하나면 `.` 입구 하나다 */
const exportsMapOf = (workspace) =>
    typeof workspace.exports === "string" ? { ".": workspace.exports } : workspace.exports ?? {};

/**
 * 워크스페이스 이름으로 시작하는 import(`@scope/pkg/입구`)를 그 패키지의 `exports` 로 풀어 저장소 안의 경로로 바꾼다. Node 와 같이 똑같은 입구를 먼저 보고,
 * 없으면 `*` 하나짜리 무늬 가운데 별 앞부분이 가장 긴 것을 골라 갈아 끼운다
 */
const resolvePackage = (workspaces, specifier) =>
{
    const match = /^((?:@[^/]+\/)?[^/]+)(\/.*)?$/.exec(specifier);
    const workspace = match === null ? undefined : workspaces[match[1]];

    if (workspace?.exports === undefined)
    {
        return undefined;
    }

    const subpath = `.${match[2] ?? ""}`;
    const entries = Object.entries(exportsMapOf(workspace))
        .map(([key, value]) => [key, exportTarget(value)])
        .filter(([, target]) => target !== undefined);
    const exact = entries.find(([key]) => key === subpath);

    if (exact !== undefined)
    {
        return posix.join(workspace.dir, exact[1]);
    }

    let best;

    for (const [key, target] of entries)
    {
        const star = key.indexOf("*");

        if (star >= 0 && subpath.startsWith(key.slice(0, star)) && subpath.endsWith(key.slice(star + 1)) && subpath.length >= key.length - 1
            && (best === undefined || star > best.star))
        {
            best = { star, key, target };
        }
    }

    if (best !== undefined)
    {
        const middle = subpath.slice(best.star, subpath.length - (best.key.length - best.star - 1));

        return posix.join(workspace.dir, best.target.replace("*", middle));
    }

    return undefined;
};

/** 패키지의 입구가 가리키는 파일이다. `*` 무늬는 그 무늬에 맞는 파일 모두다 */
const exportEntries = (io, workspace) =>
{
    const entries = [];

    for (const value of Object.values(exportsMapOf(workspace)))
    {
        const target = exportTarget(value);

        if (target === undefined)
        {
            continue;
        }

        const path = posix.join(workspace.dir, target);
        const star = path.indexOf("*");

        if (star < 0)
        {
            entries.push(path);
            continue;
        }

        const [head, tail] = [path.slice(0, star), path.slice(star + 1)];

        entries.push(...io.list(posix.dirname(head)).filter((file) => file.startsWith(head) && file.endsWith(tail)));
    }

    return entries.filter((file) => io.exists(file));
};

const resolveImport = (io, from, specifier, graph) =>
{
    const { srcRoot, workspaces } = graph;

    // 상대 경로와 앱의 `@/` 별칭이 아니면 워크스페이스 패키지로 풀어 본다. 워크스페이스가 아닌 외부 패키지는 풀리지 않고 버려진다
    if (!specifier.startsWith(".") && !specifier.startsWith("@/"))
    {
        const resolved = resolvePackage(workspaces, specifier);

        return resolved !== undefined && io.exists(resolved) ? resolved : undefined;
    }

    // `@/` 는 앱의 별칭이다. 패키지는 이 별칭을 쓰지 않는다
    const base = specifier.startsWith("@/") && from.startsWith(`${srcRoot}/`)
        ? posix.join(srcRoot, specifier.slice(2))
        : specifier.startsWith(".") ? posix.join(posix.dirname(from), specifier) : undefined;

    if (base === undefined)
    {
        return undefined;
    }

    for (const candidate of [...EXTENSIONS.map((ext) => `${base}${ext}`), ...EXTENSIONS.slice(1).map((ext) => `${base}/index${ext}`)])
    {
        if (io.exists(candidate) && CODE.test(candidate))
        {
            return candidate;
        }
    }

    return undefined;
};

const importsOf = (io, file, graph) =>
    [...(io.read(file) ?? "").matchAll(IMPORT_PATTERN)]
        .map((match) => resolveImport(io, file, match[1], graph))
        .filter((resolved) => resolved !== undefined);

const reachableFrom = (io, start, graph) =>
{
    const seen = new Set([start]);
    const queue = [start];

    while (queue.length > 0)
    {
        for (const next of importsOf(io, queue.pop(), graph))
        {
            if (!seen.has(next))
            {
                seen.add(next);
                queue.push(next);
            }
        }
    }

    return seen;
};

const literalsOf = (text) =>
{
    const found = new Set();

    for (const match of text.matchAll(URL_STRING))
    {
        found.add(match[1].length > 1 ? match[1].replace(/\/+$/, "") : "/");
    }

    for (const match of text.matchAll(URL_REGEX))
    {
        found.add(`/${match[1]}`);
    }

    return found;
};

/** 두 주소가 한쪽이 다른 쪽의 앞 마디이면 겹친다. 루트 `/` 는 `/` 자신과만 겹친다 */
const overlaps = (a, b) =>
{
    if (a === "/" || b === "/")
    {
        return a === b;
    }

    return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
};

/**
 * `src/app/(app)/companies/[id]/page.tsx` → `/companies`. 그룹 `(x)` 와 비공개 `_x` 는 주소에 없고 동적 마디부터는 자른다.
 * 맨 앞의 언어 마디(`[lang]`)는 미들웨어가 숨겨 붙이는 것이라 주소에 없다.
 */
const routeOf = (appRoot, file) =>
{
    const segments = posix.dirname(file.slice(`${appRoot}/`.length)).split("/")
        .filter((s, index) => s !== "." && !/^\(.*\)$/.test(s) && !(index === 0 && s === "[lang]"));
    const fixed = [];

    for (const segment of segments)
    {
        if (segment.startsWith("[") || segment.startsWith("@") || segment.startsWith("_"))
        {
            break;
        }

        fixed.push(segment);
    }

    return fixed.length === 0 ? "/" : `/${fixed.join("/")}`;
};

/** 이 파일이 앱 전체에 닿는 껍데기인가. 루트와 그룹 레벨의 레이아웃 계열이다(정적 마디가 없는 자리) */
const isShellEntry = (appRoot, file) =>
{
    const name = posix.basename(file);
    const dir = posix.dirname(file).slice(`${appRoot}/`.length);
    const staticSegments = dir.split("/").filter((s, index) => s !== "." && s !== "" && !/^\(.*\)$/.test(s) && !(index === 0 && s === "[lang]"));

    return SHELL_FILES.test(name) && staticSegments.length === 0;
};

export const selectSpecs = ({ app, changed, workspaces, io, full = false }) =>
{
    const srcRoot = `${app.dir}/src`;
    const appRoot = `${srcRoot}/app`;
    const e2eRoot = `${app.dir}/e2e`;
    const e2eFiles = io.list(e2eRoot);
    const allSpecs = e2eFiles.filter((file) => /\.spec\.[jt]sx?$/.test(file)).sort();
    const everything = (reason) => ({
        mode: "full",
        reason,
        specs: allSpecs.map((file) => ({ file, why: reason })),
        skipped: [],
    });

    if (full)
    {
        return everything("--e2e full");
    }

    // 1. 앱 전체에 닿는 변경
    const graph = { srcRoot, workspaces };
    const depNames = [...dependencySet(workspaces, app.name)];
    const deps = depNames.map((name) => workspaces[name].dir);
    const inApp = (file) => file.startsWith(`${app.dir}/`);
    /** 화면까지 따라갈 패키지 파일이다. 입구에서 닿는지는 2단계에서 잰다 */
    const packageFiles = [];

    for (const file of changed)
    {
        if (/^supabase\/(migrations|seeds|seed\.sql|config\.toml)/.test(file) || file === "supabase/seed.sql")
        {
            return everything(`${file} 가 바뀜(스키마와 시드는 앱 전체에 닿음)`);
        }

        const owner = deps.find((dir) => file.startsWith(`${dir}/`));

        if (owner !== undefined && !IGNORED.test(file.slice(owner.length + 1)))
        {
            if (!io.exists(file))
            {
                return everything(`${file} 가 지워지거나 이름이 바뀜(${owner} 는 이 앱이 쓰는 패키지)`);
            }

            packageFiles.push(file);
            continue;
        }

        if (!file.includes("/") && !file.endsWith(".md"))
        {
            return everything(`${file} 가 바뀜(저장소 뿌리의 설정)`);
        }

        if (inApp(file))
        {
            const rel = file.slice(app.dir.length + 1);

            if (IGNORED.test(rel) || rel.startsWith("e2e/"))
            {
                continue;
            }

            if (!rel.includes("/") && APP_WIDE.test(rel))
            {
                return everything(`${file} 가 바뀜(앱 설정)`);
            }

            if (!rel.startsWith("src/"))
            {
                return everything(`${file} 가 바뀜(src 밖의 앱 파일)`);
            }
        }
    }

    // 2. 소스에서 화면까지
    const srcFiles = io.list(srcRoot).filter((file) => CODE.test(file));
    const entries = srcFiles.filter((file) => file.startsWith(`${appRoot}/`) && ENTRY_FILES.test(posix.basename(file)));
    const shellEntries = srcFiles.filter((file) =>
        (file.startsWith(`${appRoot}/`) && isShellEntry(appRoot, file))
        || (/^(middleware|proxy|instrumentation)(\.|-)/.test(posix.basename(file)) && posix.dirname(file) === srcRoot));
    const entryReach = new Map(entries.map((entry) => [entry, reachableFrom(io, entry, graph)]));
    const shellReach = new Set(shellEntries.flatMap((entry) => [...reachableFrom(io, entry, graph)]));
    const affectedRoutes = new Map();

    if (packageFiles.length > 0)
    {
        const owned = depNames.map((name) => workspaces[name]);
        const exported = new Set(owned.flatMap((workspace) => exportEntries(io, workspace)).flatMap((entry) => [...reachableFrom(io, entry, graph)]));
        const unreachable = packageFiles.find((file) => !exported.has(file));

        if (unreachable !== undefined)
        {
            return everything(`${unreachable} 가 바뀜(패키지의 입구에서 닿지 않아 앱이 어떻게 쓰는지 모름)`);
        }
    }

    const label = (file) => (file.startsWith(`${srcRoot}/`) ? file.slice(srcRoot.length + 1) : file);

    for (const file of packageFiles)
    {
        if (shellReach.has(file))
        {
            return everything(`${file} 가 바뀜(레이아웃이 부르는 패키지 파일)`);
        }

        for (const [entry, reach] of entryReach)
        {
            const route = routeOf(appRoot, entry);

            if (reach.has(file) && !affectedRoutes.has(route))
            {
                affectedRoutes.set(route, label(file));
            }
        }
    }

    for (const file of changed.filter((path) => inApp(path) && path.startsWith(`${srcRoot}/`) && !IGNORED.test(path.slice(app.dir.length + 1))))
    {
        // 지웠거나 이름이 바뀐 파일은 누가 불렀는지 지금의 소스로는 알 수 없다
        if (!io.exists(file))
        {
            return everything(`${file} 가 지워지거나 이름이 바뀜`);
        }

        if (shellReach.has(file))
        {
            return everything(`${file} 가 바뀜(레이아웃이 부르는 파일)`);
        }

        let reached = false;

        for (const [entry, reach] of entryReach)
        {
            if (reach.has(file))
            {
                reached = true;
                const route = routeOf(appRoot, entry);

                if (!affectedRoutes.has(route))
                {
                    affectedRoutes.set(route, file.slice(srcRoot.length + 1));
                }
            }
        }

        // 화면이 아닌 곳에 놓인 파일(app 폴더의 아이콘 · manifest 같은 것)은 어느 화면이 부르는지 알 수 없다
        if (!reached && file.startsWith(`${appRoot}/`) && !CODE.test(file))
        {
            return everything(`${file} 가 바뀜(app 폴더의 정적 파일)`);
        }
    }

    // 3. 스펙이 닿는 주소
    const helpers = e2eFiles.filter((file) => !/\.spec\.[jt]sx?$/.test(file) && CODE.test(file));
    const textWithHelpers = (spec) =>
    {
        const files = reachableFrom(io, spec, graph);

        return [...files].filter((file) => file.startsWith(`${e2eRoot}/`) || file === spec).map((file) => io.read(file) ?? "").join("\n");
    };
    // 주소를 모아 둔 표(`paths.ts` 같은 것)는 화면 여럿이 부르면서 모든 주소를 적어 둔다. 그런 파일의 글자는 특정 화면의 링크가 아니다
    const fanIn = new Map();

    for (const reach of entryReach.values())
    {
        for (const file of reach)
        {
            fanIn.set(file, (fanIn.get(file) ?? 0) + 1);
        }
    }

    const routeLiterals = new Map();

    for (const [entry, reach] of entryReach)
    {
        const route = routeOf(appRoot, entry);
        const found = routeLiterals.get(route) ?? new Set();

        for (const file of reach)
        {
            // 껍데기가 부르는 파일의 링크(메뉴 같은 것)는 모든 화면이 갖고 있어서 세면 모든 스펙이 모든 화면에 닿는다
            // 화면 폴더 밖의 파일(usecase · 공용 컴포넌트)은 링크를 읽지 않는다. 읽으면 한 화면의 스펙이 그 화면이 데이터로만 아는 화면까지 덮는다
            if (shellReach.has(file) || !file.startsWith(`${posix.dirname(entry)}/`) || fanIn.get(file) > ROUTE_TABLE_FAN_IN)
            {
                continue;
            }

            // `revalidatePath("/billing")` 는 캐시를 비울 뿐 그 화면으로 보내지 않는다
            for (const literal of literalsOf((io.read(file) ?? "").replace(/revalidatePath\([^)]*\)/g, "")))
            {
                found.add(literal);
            }
        }

        routeLiterals.set(route, found);
    }

    /** 스펙이 직접 적은 주소와, 그 주소의 화면이 소스에 적은 주소(링크 · redirect · fetch)다. 한 걸음만 따라간다. 더 따라가면 메뉴 같은 공용 링크로 모든 화면이 이어진다 */
    const coverage = (own) =>
    {
        const covered = new Set(own);

        for (const [route, literals] of routeLiterals)
        {
            if ([...own].some((literal) => overlaps(literal, route)))
            {
                for (const literal of literals)
                {
                    covered.add(literal);
                }
            }
        }

        return covered;
    };

    const changedE2e = changed.filter((file) => file.startsWith(`${e2eRoot}/`));
    const changedSpecs = new Set(changedE2e.filter((file) => allSpecs.includes(file)));

    for (const spec of allSpecs)
    {
        const reach = reachableFrom(io, spec, graph);

        if (changedE2e.some((file) => helpers.includes(file) && reach.has(file)) || packageFiles.some((file) => reach.has(file)))
        {
            changedSpecs.add(spec);
        }
    }

    const specs = [];
    const skipped = [];

    for (const spec of allSpecs)
    {
        if (changedSpecs.has(spec))
        {
            specs.push({ file: spec, why: "스펙이나 스펙의 도우미 파일이 바뀜" });
            continue;
        }

        if (affectedRoutes.size === 0)
        {
            skipped.push(spec);
            continue;
        }

        const own = literalsOf(textWithHelpers(spec));
        const covered = coverage(own);
        const hit = [...affectedRoutes].find(([route]) => [...covered].some((literal) => overlaps(literal, route)));

        if (own.size === 0)
        {
            specs.push({ file: spec, why: "닿는 주소를 알 수 없어 늘 돈다" });
        }
        else if (hit !== undefined)
        {
            const direct = [...own].some((literal) => overlaps(literal, hit[0]));

            specs.push({ file: spec, why: `${hit[1]} → ${hit[0]}${direct ? "" : "(링크로 닿음)"}` });
        }
        else
        {
            skipped.push(spec);
        }
    }

    return {
        mode: "narrow",
        reason: affectedRoutes.size === 0 && changedSpecs.size === 0 ? "e2e 가 닿는 화면의 변경 없음" : `바뀐 화면 ${[...affectedRoutes.keys()].join(", ") || "없음"}`,
        specs,
        skipped,
    };
};

/** 디스크를 읽는 `io` 다. `list` 는 git 이 아는 파일만 돌려줘서 `node_modules` 와 빌드 산출물이 섞이지 않는다 */
export const diskIo = (root, tracked) =>
{
    const cache = new Map();
    const set = new Set(tracked);

    return {
        read: (path) =>
        {
            if (!cache.has(path))
            {
                try
                {
                    cache.set(path, readFileSync(join(root, path), "utf8"));
                }
                catch
                {
                    cache.set(path, undefined);
                }
            }

            return cache.get(path);
        },
        // git 의 목록에는 작업 폴더에서 지운 파일도 남아 있으므로 디스크도 함께 본다
        exists: (path) => set.has(path) && existsSync(join(root, path)),
        list: (dir) => tracked.filter((path) => path.startsWith(`${dir}/`)),
    };
};

/** 워크스페이스 이름 → 폴더와 워크스페이스끼리의 의존이다 */
export const readWorkspaces = (root, tracked) =>
{
    const workspaces = {};

    for (const file of tracked.filter((path) => /^(apps|packages)\/[^/]+\/package\.json$/.test(path)))
    {
        const json = JSON.parse(readFileSync(join(root, file), "utf8"));

        workspaces[json.name] = {
            dir: posix.dirname(file),
            deps: Object.keys({ ...json.dependencies, ...json.devDependencies, ...json.peerDependencies }).filter((name) => name.length > 0),
            exports: json.exports,
        };
    }

    return workspaces;
};
