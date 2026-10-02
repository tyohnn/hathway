#!/usr/bin/env node
// 토큰 스캔. 1·2층과 제품 토큰이 정의한 것과 3층·앱이 읽는 토큰을 대조한다.
//
// 정본 설계: docs/design-system/README.md 「토큰 스캔」
//
// 토큰이 사는 자리는 아래 파일들의 **최상위 :root·.dark 블록**뿐이다.
// 1층 globals.css · theme.css 가 시맨틱 토큰을, 2층 tokens.css 가 컴포넌트 토큰을 갖고
// (2층이 @theme 이 아니라 :root 인 것이 그 규칙이다. tokens.css 머리말에 있다),
// 시스템 축이 아닌 우리 값은 src/product.css 가 갖는다.
// 레이어 안쪽의 커스텀 프로퍼티(컴포넌트가 자기 기하 계산에 쓰는 지역 변수)와
// 벤더가 내보내는 내부 변수는 토큰이 아니므로 이 스캔의 대상이 아니다.
//
// 검사 셋:
//   1. 미정의: 읽는데 정의가 없는 토큰. 폴백이 없으면 실패(종료 코드 1)다.
//   2. 사문: 정의했는데 아무도 읽지 않는 토큰. 경고다.
//   3. 하위픽셀: 1px 미만의 px 값. 축소·확대 렌더링에서 변이 사라진다. 경고다.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const uiRoot = join(here, "..");
const repoRoot = join(uiRoot, "..", "..");

/**
 * 토큰의 정의가 사는 파일. 이 밖에는 토큰이 없다.
 *
 * 자리는 앱이 입은 tyohnn 시스템 폴더다. 어느 시스템인지는 저장소 루트 `tyohnn.json` 이
 * 정본이므로 여기서 읽는다. `tyohnn use <name>` 으로 시스템을 갈아도 이 스캔이 따라간다.
 * 1층이 globals.css(모양)와 theme.css(색) 둘로 갈린 것은 색이 별도 축이기 때문이고,
 * 2층 tokens.css 가 컴포넌트 토큰을 갖는다.
 */
const record = JSON.parse(readFileSync(join(repoRoot, "tyohnn.json"), "utf8"));
const systems = [...new Set(Object.values(record.apps).map((app) => app.system))];
const TOKEN_FILES = [
    ...systems.flatMap((system) => ["globals.css", "theme.css", "tokens.css"]
        .map((file) => join(uiRoot, "src/systems", system, file))),
    join(uiRoot, "src/product.css"),
];

/** 토큰을 읽는 트리. 없는 폴더는 건너뛴다 */
const USAGE_ROOTS = [
    join(uiRoot, "src"),
    join(repoRoot, "apps/web/app"),
    join(repoRoot, "apps/web/components"),
    join(repoRoot, "apps/web/lib"),
];

const SCANNED_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);

/**
 * 우리 것이 아닌 변수.
 *
 * Tailwind 가 유틸리티를 만들며 내보내는 것(--tw-*, --spacing, --color-*),
 * Base UI 의 Positioner·Collapsible 이 런타임에 계산해 심는 것(--anchor-width 등),
 * 그리고 shadcn 이 실어 보내는 벤더 유틸리티(--scroll-fade-*)가 여기 해당한다.
 * 이 이름들은 정의가 우리 저장소에 없는 것이 정상이다.
 */
const EXTERNAL_PREFIXES = [
    "--tw-",
    "--radix-",
    "--scroll-fade-",
    // Base UI 의 Drawer·Toast 가 런타임에 심는 기하값이다. 스와이프 진행률·쌓인 장수·
    // 앞장 높이처럼 정적으로 정의할 수 없는 값이라 정의가 저장소에 없는 것이 정상이다.
    // ⚠ Vaul·Sonner 의 것이 아니다. 이 저장소의 Drawer·Toast 는 Base UI 판이다.
    "--drawer-",
    "--toast-",
    // next/font 가 런타임에 심는 글꼴 변수다. 진입 CSS 가 --font-sans-<id> 꼴 이름을 읽어
    // --font-sans 를 세우므로, 정의가 저장소에 없는 것이 정상이다.
    "--font-sans-",
    "--font-heading-",
    "--font-mono-",
    // 차트의 계열 색이다. `ChartContainer` 가 받은 config 의 열쇠마다 `--color-<계열>` 을 런타임에
    // <style> 로 심고, 차트가 `var(--color-${key})` 로 읽는다. 계열 이름은 차트마다 달라서 정의가
    // 저장소에 없는 것이 정상이다. ⚠ 그 대가로 @theme 의 `--color-*` 오타는 이 스캔이 잡지 못한다.
    "--color-",
];

const EXTERNAL_NAMES = new Set([
    "--spacing",
    "--anchor-width",
    "--anchor-height",
    "--available-width",
    "--available-height",
    "--transform-origin",
    "--positioner-width",
    "--positioner-height",
    "--collapsible-panel-height",
    "--collapsible-panel-width",
    "--accordion-panel-height",
    "--accordion-panel-width",
    "--nested-drawers",
    // Tailwind 기본 테마가 내보내는 글꼴 축. 1층은 --font-sans 만 브랜드 값으로 덮고
    // 등폭 글꼴은 기본값을 그대로 쓴다(조판 CSS 의 코드 블록이 읽는다).
    "--font-mono",
]);

const isExternal = (name) =>
    EXTERNAL_NAMES.has(name)
    || EXTERNAL_PREFIXES.some((prefix) => name.startsWith(prefix))
    // @theme 이 만드는 유틸리티 축(--color-* · --text-* · --font-* · --radius-* 등)은
    // 그 파일 안에서 정의되므로 아래 declaredAnywhere 로 걸러진다. 여기서는 보지 않는다.
    || false;

/** 파일 트리에서 검사 대상 파일을 모은다 */
const collectFiles = (root) =>
{
    let entries;

    try
    {
        entries = readdirSync(root, { withFileTypes: true });
    }
    catch
    {
        return [];
    }

    return entries.flatMap((entry) =>
    {
        const path = join(root, entry.name);

        if (entry.isDirectory())
        {
            return entry.name === "node_modules" ? [] : collectFiles(path);
        }

        return SCANNED_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
    });
};

/**
 * 파일에서 최상위 :root·.dark 블록의 선언만 뽑는다.
 *
 * 중첩을 세면서 읽으므로 @layer·@media 안쪽의 :root 는 걸리지 않는다.
 * 그것이 이 스캔의 요점이다. 레이어 안의 커스텀 프로퍼티는 토큰이 아니다.
 */
/** 줄 번호를 보존하면서 주석을 지운다. 주석 안의 :root·중괄호에 속지 않기 위해서다 */
const stripComments = (source) =>
    source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));

const TOKEN_SELECTOR = /^(?::root|\.dark)(?:\s*,\s*(?::root|\.dark))*$/;

/**
 * 파일에서 **최상위** :root·.dark 블록의 선언만 뽑는다.
 *
 * 중첩 깊이를 세면서 읽으므로 @layer·@media·@theme 안쪽은 걸리지 않는다.
 * 그것이 이 스캔의 요점이다. 레이어 안의 커스텀 프로퍼티는 토큰이 아니다.
 */
const readTokenDefinitions = (path) =>
{
    const source = readFileSync(path, "utf8");
    const clean = stripComments(source);
    const definitions = [];
    const lineOf = (index) => clean.slice(0, index).split("\n").length;

    let depth = 0;
    let selectorStart = 0;

    for (let index = 0; index < clean.length; index += 1)
    {
        const char = clean[index];

        if (char === "{")
        {
            if (depth === 0)
            {
                const selector = clean.slice(selectorStart, index).trim();

                depth = 1;

                if (!TOKEN_SELECTOR.test(selector))
                {
                    continue;
                }

                const bodyStart = index + 1;
                let cursor = bodyStart;

                while (cursor < clean.length && depth > 0)
                {
                    if (clean[cursor] === "{")
                    {
                        depth += 1;
                    }
                    else if (clean[cursor] === "}")
                    {
                        depth -= 1;
                    }

                    cursor += 1;
                }

                const body = clean.slice(bodyStart, cursor - 1);
                const declaration = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g;
                let found;

                while ((found = declaration.exec(body)) !== null)
                {
                    definitions.push({
                        name: found[1],
                        value: found[2].trim(),
                        file: relative(repoRoot, path),
                        line: lineOf(bodyStart + found.index),
                        scope: selector,
                    });
                }

                index = cursor - 1;
                selectorStart = cursor;
                continue;
            }

            depth += 1;
        }
        else if (char === "}")
        {
            depth -= 1;

            if (depth <= 0)
            {
                depth = 0;
                selectorStart = index + 1;
            }
        }
    }

    return definitions;
};

const definitions = TOKEN_FILES.flatMap(readTokenDefinitions);
const defined = new Map();

for (const row of definitions)
{
    // 같은 이름이 :root 와 .dark 에 있는 것은 정상이다. 첫 자리만 기억한다
    if (!defined.has(row.name))
    {
        defined.set(row.name, row);
    }
}

/**
 * CSS 주석을 지운다. 줄 수는 그대로 두어 줄 번호가 어긋나지 않게 한다.
 *
 * 시스템 파일의 주석은 규칙을 설명하며 `var(--x)` 같은 예시를 든다. 지우지 않으면 그 예시가
 * 미정의 토큰으로 잡힌다(cirrus globals.css 의 `var(--x, initial)` 설명이 그랬다).
 */
function withoutCssComments(path, source)
{
    if (extname(path) !== ".css")
    {
        return source;
    }

    return source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
}

const files = USAGE_ROOTS.flatMap(collectFiles);
const usages = new Map();
const declaredAnywhere = new Set();

for (const path of files)
{
    const source = withoutCssComments(path, readFileSync(path, "utf8"));
    const shown = relative(repoRoot, path);

    // CSS 선언과 TSX 의 인라인 스타일(`{ "--sidebar-width": … }`)을 함께 센다.
    // 컴포넌트가 자기 기하값을 심는 자리라 토큰은 아니지만 미정의도 아니다.
    for (const match of source.matchAll(/["']?(--[A-Za-z0-9_-]+)["']?\s*:/g))
    {
        declaredAnywhere.add(match[1]);
    }

    for (const match of source.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*(,)?/g))
    {
        const name = match[1];
        const line = source.slice(0, match.index).split("\n").length;
        const rows = usages.get(name) ?? [];

        rows.push({ file: shown, line, hasFallback: Boolean(match[2]) });
        usages.set(name, rows);
    }
}

const missing = [];
const missingWithFallback = [];

for (const [name, rows] of usages)
{
    if (defined.has(name) || declaredAnywhere.has(name) || isExternal(name))
    {
        continue;
    }

    (rows.every((row) => row.hasFallback) ? missingWithFallback : missing).push({ name, rows });
}

const dead = [...defined.values()].filter((row) => !usages.has(row.name));

const subpixel = [...defined.values()].filter((row) =>
{
    const match = /^(\d*\.?\d+)px$/.exec(row.value);

    return match !== null && Number(match[1]) > 0 && Number(match[1]) < 1;
});

const list = (rows, render) => rows.map((row) => `    ${render(row)}`).join("\n");

console.log(`토큰 ${defined.size}개를 읽었다 (1층 · 2층 · product.css 의 최상위 :root·.dark).`);
console.log(`파일 ${files.length}개에서 var() 참조 ${usages.size}종을 찾았다.\n`);

if (subpixel.length > 0)
{
    console.log(`⚠ 하위픽셀 값 ${subpixel.length}개 — 축소·확대 렌더링에서 변이 사라진다`);
    console.log(list(subpixel, (row) => `${row.name}: ${row.value}  (${row.file}:${row.line})`));
    console.log("");
}

if (dead.length > 0)
{
    console.log(`⚠ 사문 토큰 ${dead.length}개 — 정의했으나 아무도 읽지 않는다`);
    console.log(list(dead, (row) => `${row.name}  (${row.file}:${row.line})`));
    console.log("");
}

if (missingWithFallback.length > 0)
{
    console.log(`⚠ 정의가 없고 폴백으로 도는 토큰 ${missingWithFallback.length}개`);
    console.log(list(missingWithFallback, (row) => `${row.name}  (${row.rows[0].file}:${row.rows[0].line})`));
    console.log("");
}

if (missing.length > 0)
{
    console.log(`✗ 미정의 토큰 ${missing.length}개 — 읽는데 정의가 없고 폴백도 없다`);

    for (const row of missing)
    {
        console.log(`    ${row.name}`);
        console.log(list(row.rows, (use) => `  ${use.file}:${use.line}`));
    }

    console.log("\n시스템 토큰이면 tyohnn 에서, 제품 토큰이면 src/product.css 에 정의를 더하거나, 벤더 변수라면 이 스크립트의 허용 목록에 근거와 함께 적을 것.");
    process.exit(1);
}

console.log("미정의 토큰 없음.");
