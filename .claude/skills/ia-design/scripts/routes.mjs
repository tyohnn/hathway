#!/usr/bin/env node
/**
 * 앱의 라우트 나무와 메뉴를 찍는다. `/ia-design` 이 지도를 그리기 전에 지금 모양을 보고, 다 지은 뒤 지도와 맞는지 볼 때 부른다.
 *
 *   node .claude/skills/ia-design/scripts/routes.mjs [앱 이름]     # 기본은 web
 *
 * 찍는 것은 셋이다.
 *
 *   1. `apps/<앱>/src/app` 의 나무. 화면(page)이 있는 폴더만 찍고, 표시를 단다
 *      (그룹) = 셸의 경계 · [동적] · @슬롯 = 병렬 라우트 · (.)가로챔 = 목록 위에 뜨는 다이얼로그 · 시트 · API = route 파일
 *   2. 알림. 주소 깊이가 셋(목록 → 상세 → 탭)을 넘는 화면, `default.tsx` 가 없는 슬롯
 *   3. 사이드바의 메뉴. `lib/paths.ts` 의 `navigation` · `footerNavigation` 과 `src/modules/<모듈>/nav.ts` 의 줄을 센다. 설정의 옆 메뉴에
 *      서는 줄(`place: "settings"`)은 사이드바에 서지 않으므로 세지 않는다. 개인 묶음 · 설정까지 합쳐
 *      열을 넘으면 알린다(객체 메뉴 다섯에서 일곱에 개인 묶음과 설정 한 줄을 더한 수)
 *
 * ⚠ 메뉴는 글자로 셈한다(`label: "…"`). 메뉴를 다른 모양으로 만들면 이 셈이 놓친다. 그때는 화면에서 센다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const app = process.argv[2] ?? "web";
const root = join(process.cwd(), "apps", app, "src", "app");

if (!existsSync(root))
{
    console.error(`✗ ${relative(process.cwd(), root)} 이(가) 없다. 저장소의 뿌리에서 부를 것`);
    process.exit(1);
}

const PAGE = /^(page|default)\.(tsx|ts|jsx|js|mdx)$/;
const ROUTE = /^route\.(ts|js)$/;
const MAX_DEPTH = 3;
const MAX_NAV = 10;

const isGroup = (name) => /^\(.+\)$/.test(name) && !/^\(\.+\)/.test(name);
const isSlot = (name) => name.startsWith("@");
const intercept = (name) => name.match(/^((?:\(\.{1,3}\))+)(.*)$/);

/** 주소에 서는 세그먼트 수. 그룹과 슬롯은 세지 않고, 가로챈 세그먼트는 가로챈 대상의 이름으로 센다 */
const depthOf = (segments) => segments.filter((name) => !isGroup(name) && !isSlot(name)).length;

const label = (name) =>
{
    if (isGroup(name))
    {
        return `${name}  ← 셸`;
    }

    if (isSlot(name))
    {
        return `${name}  ← 병렬 슬롯`;
    }

    const caught = intercept(name);

    if (caught !== null)
    {
        return `${name}  ← 가로챔(${caught[2]})`;
    }

    return name;
};

const warnings = [];

/** 화면이나 API 가 하나라도 들어 있는 폴더인가 */
const hasRoutes = (dir) => readdirSync(dir).some((entry) =>
{
    const full = join(dir, entry);

    return statSync(full).isDirectory() ? !entry.startsWith("_") && hasRoutes(full) : PAGE.test(entry) || ROUTE.test(entry);
});

const walk = (dir, segments, prefix) =>
{
    const entries = readdirSync(dir);
    const marks = [];

    if (entries.some((entry) => /^page\./.test(entry)))
    {
        marks.push("화면");
    }

    if (entries.some((entry) => ROUTE.test(entry)))
    {
        marks.push("API");
    }

    if (entries.some((entry) => /^layout\./.test(entry)))
    {
        marks.push("틀");
    }

    const name = segments.at(-1);

    if (name !== undefined)
    {
        console.log(`${prefix}${label(name)}${marks.length === 0 ? "" : `  [${marks.join(" · ")}]`}`);
    }

    if (name !== undefined && isSlot(name) && !entries.some((entry) => /^default\./.test(entry)))
    {
        warnings.push(`슬롯에 default.tsx 가 없다(새로 고침에서 404): ${relative(root, dir)}`);
    }

    if (entries.some((entry) => /^page\./.test(entry)) && !entries.some((entry) => ROUTE.test(entry)) && depthOf(segments) > MAX_DEPTH)
    {
        warnings.push(`주소 깊이 ${depthOf(segments)}(목록 → 상세 → 탭을 넘는다. 시트로 띄울지 본다): /${segments.filter((part) => !isGroup(part) && !isSlot(part)).join("/")}`);
    }

    const children = entries
        .filter((entry) => !entry.startsWith("_") && statSync(join(dir, entry)).isDirectory() && hasRoutes(join(dir, entry)))
        .sort();

    for (const child of children)
    {
        walk(join(dir, child), [...segments, child], name === undefined ? "" : `${prefix}  `);
    }
};

console.log(`## 라우트 나무 (apps/${app}/src/app)\n`);
walk(root, [], "");

// 메뉴
const navLabels = [];
const pathsFile = join(process.cwd(), "apps", app, "src", "lib", "paths.ts");

if (existsSync(pathsFile))
{
    const text = readFileSync(pathsFile, "utf8");
    const block = text.match(/export const navigation[\s\S]*?\n\];/);

    for (const line of (block?.[0] ?? "").split("\n").filter((entry) => !/place:\s*"settings"/.test(entry)))
    {
        const match = line.match(/label:\s*"([^"]+)"/);

        if (match !== null)
        {
            navLabels.push(match[1]);
        }
    }

    const footer = text.match(/export const footerNavigation[\s\S]*?\n\];/);

    for (const match of (footer?.[0] ?? "").matchAll(/label:\s*"([^"]+)"/g))
    {
        navLabels.push(`${match[1]} (발치)`);
    }
}

const modulesDir = join(process.cwd(), "apps", app, "src", "modules");

if (existsSync(modulesDir))
{
    for (const module of readdirSync(modulesDir).sort())
    {
        const nav = join(modulesDir, module, "nav.ts");

        if (existsSync(nav))
        {
            for (const line of readFileSync(nav, "utf8").split("\n").filter((entry) => !/place:\s*"settings"/.test(entry)))
            {
                const match = line.match(/label:\s*"([^"]+)"/);

                if (match !== null)
                {
                    navLabels.push(`${match[1]} (${module})`);
                }
            }
        }
    }
}

if (navLabels.length > 0)
{
    console.log(`\n## 사이드바 메뉴 ${navLabels.length}줄\n`);
    console.log(navLabels.map((entry) => `- ${entry}`).join("\n"));

    if (navLabels.length > MAX_NAV)
    {
        warnings.push(`메뉴가 ${navLabels.length}줄이다(객체 다섯에서 일곱 + 개인 묶음 + 설정 한 줄). 설정 화면들을 한 줄로 모았는지, 객체가 아닌 것 · 같은 객체의 다른 관점을 탭 · 거름으로 흡수할 수 있는지 본다`);
    }
}

console.log(warnings.length === 0 ? "\n알림 없음." : `\n## 알림 ${warnings.length}개\n\n${warnings.map((entry) => `⚠ ${entry}`).join("\n")}`);
