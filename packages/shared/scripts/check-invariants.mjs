#!/usr/bin/env node
// 불변식 인용 검사: 카탈로그들이 선언한 것과 코드·테스트가 인용하는 것을 대조한다.
//
// 카탈로그는 도메인마다 하나다. 도메인 규칙은 그 도메인이 소유하기 때문이다.
//   packages/access/src/invariants.ts   INV-ACCESS-*
//   packages/research/src/invariants.ts INV-RESEARCH-*
//   packages/shared/src/invariants/requirements.ts   REQ-*  (도메인이 없는 저장소 규약)
//
// 인용 표기는 `INV-<도메인>-<두 자리>` 와 `REQ-<두 자리>` 다. 종류(앱·데이터)는 id 가 아니라
// 카탈로그의 `kind` 칸이 말한다.
//
// 검사 다섯:
//   1. 미정의  : 인용했는데 어느 카탈로그에도 없는 id. 실패(종료 코드 1)다.
//   2. 미검증  : `enforced` 인데 인용하는 테스트가 없다. 실패다.
//   3. 접두사  : 카탈로그가 남의 도메인 id 를 선언한다. 실패다.
//   4. 층 어긋남: `planned` 인데 인용하는 테스트가 있다. 경고다.
//   5. 사문    : 코드 어디에서도 인용하지 않는 `enforced`·`planned`. 경고다.
//
// 스캐폴드는 폐기된 표기 둘(seam 번호 · 줄여 쓴 인용)도 막지만 이 저장소에서는 끈다. 까닭은 RETIRED 에 있다.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

/** 카탈로그와 그 카탈로그만 선언할 수 있는 접두사 */
const CATALOGS = [
    { file: join(repoRoot, "packages/access/src/invariants.ts"), prefix: "INV-ACCESS-" },
    { file: join(repoRoot, "packages/research/src/invariants.ts"), prefix: "INV-RESEARCH-" },
    { file: join(repoRoot, "packages/shared/src/invariants/requirements.ts"), prefix: "REQ-" },
];

/**
 * 인용을 찾을 트리. 없는 폴더는 건너뛴다.

 */
const SCAN_ROOTS = [
    join(repoRoot, "packages/access/src"),
    join(repoRoot, "packages/research/src"),
    join(repoRoot, "packages/shared/src"),
    join(repoRoot, "packages/adapters-postgres/src"),
    join(repoRoot, "apps/web/src"),
    join(repoRoot, "platform/supabase/migrations"),
];

const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".sql"]);

/**
 * 카탈로그 기계가 사는 자리. 여기 나오는 id 는 인용이 아니라 타입 주석의 예시다.
 * 넣으면 예시가 인용으로 세어져 「미정의」가 거짓으로 뜬다.
 */
const CATALOG_DIR = join(repoRoot, "packages/shared/src/invariants");

/** 정식 인용 표기. 이 밖의 모양은 인용으로 세지 않는다 */
const CITATION = /\b(?:INV-[A-Z]+-\d{2}|REQ-\d{2})\b/g;

/**
 * 더 쓰지 않는 표기 둘.
 *
 * 1. seam 번호: `A16` 처럼 맨 번호로 도메인 함수를 가리키던 것이다. 2026-09-14 에 전부 함수
 *    이름으로 바꿨다. 코드에 이름이 있는 것에는 약어를 붙이지 않는다.
 *    ⚠ 퍼센트 인코딩(`%A8`)이 걸리지 않도록 앞 글자에서 `%` 를 뺀다.
 *    ⚠ 따옴표로 싸인 것은 인용이 아니라 값이다. 발송 트리거 키(`"A8"`)처럼 같은 모양의 데이터가
 *       있어서, 값까지 세면 옮겨 온 카탈로그가 통째로 빨개진다.
 * 2. 도메인 없는 옛 id: `INV-A01` · `INV-D01` 처럼 도메인 구간이 없던 것이다. 2026-09-15 에
 *    `INV-LEGAL-01` 계열로 폈다.
 */
// ⚠ 이 저장소에서는 폐기된 표기를 막지 않는다. 스캐폴드가 막는 `A16` · `D02` 꼴은 여기서 교재의 장 접두
//    (A1 · B3 · D2)이고 `AGENTS.md` 가 정한 정본 식별자다. 목록을 비워 두어 아래 검사가 아무것도 잡지 않게 한다.
const RETIRED = [];

const isTestFile = (path) => /\.(test|spec)\.tsx?$/.test(path);

const walk = (root) =>
{
    if (!existsSync(root))
    {
        return [];
    }

    const found = [];
    const stack = [root];

    while (stack.length > 0)
    {
        const current = stack.pop();

        for (const entry of readdirSync(current))
        {
            if (entry === "node_modules" || entry.startsWith("."))
            {
                continue;
            }

            const path = join(current, entry);

            if (statSync(path).isDirectory())
            {
                stack.push(path);
            }
            else if (SCANNED_EXTENSIONS.has(extname(path)))
            {
                found.push(path);
            }
        }
    }

    return found;
};

// ── 카탈로그를 읽는다 ─────────────────────────────────────────────────────────
// .mjs 는 TypeScript 를 그대로 부르지 못하므로 원본에서 id 와 status 만 긁는다.
// 필드 순서(id … status)는 `Invariant` 인터페이스가 고정한다.

/** id → { status, catalog } */
const catalog = new Map();
const catalogFiles = new Set();
const misprefixed = [];

for (const { file, prefix } of CATALOGS)
{
    if (!existsSync(file))
    {
        console.error(`✗ 카탈로그가 없다: ${relative(repoRoot, file)}`);
        process.exit(1);
    }

    catalogFiles.add(file);
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(/\{\s*id:\s*"([^"]+)",[\s\S]*?status:\s*"([^"]+)",/g))
    {
        const [, id, status] = match;

        if (!id.startsWith(prefix))
        {
            misprefixed.push({ id, at: relative(repoRoot, file), prefix });
            continue;
        }

        catalog.set(id, { status, catalog: relative(repoRoot, file) });
    }
}

if (catalog.size === 0 && misprefixed.length === 0)
{
    console.error("✗ 어느 카탈로그도 읽지 못했다.");
    process.exit(1);
}

// ── 인용을 모은다 ────────────────────────────────────────────────────────────

/** id → { tests: [파일:줄], sources: [파일:줄] } */
const citations = new Map();

/** 더 쓰지 않는 표기를 쓴 자리 */
const retired = [];

const note = (id, where, path, line) =>
{
    const entry = citations.get(id) ?? { tests: [], sources: [] };
    entry[where].push(`${relative(repoRoot, path)}:${line}`);
    citations.set(id, entry);
};

for (const root of SCAN_ROOTS)
{
    for (const path of walk(root))
    {
        // 카탈로그 자신은 인용이 아니다. 넣으면 모든 id 가 스스로를 인용해 사문 검사가 무력해진다.
        if (catalogFiles.has(path) || path.startsWith(CATALOG_DIR))
        {
            continue;
        }

        const lines = readFileSync(path, "utf8").split("\n");
        const where = isTestFile(path) ? "tests" : "sources";

        lines.forEach((text, index) =>
        {
            for (const match of text.matchAll(CITATION))
            {
                note(match[0], where, path, index + 1);
            }

            for (const { what, pattern } of RETIRED)
            {
                for (const match of text.matchAll(pattern))
                {
                    retired.push({ what, token: match[0], at: `${relative(repoRoot, path)}:${index + 1}` });
                }
            }
        });
    }
}

// ── 대조한다 ─────────────────────────────────────────────────────────────────

const unknown = [];
const unverified = [];
const early = [];
const dead = [];

for (const [id, entry] of citations)
{
    if (!catalog.has(id))
    {
        unknown.push({ id, entry });
    }
}

for (const [id, { status }] of catalog)
{
    const entry = citations.get(id);
    const testCount = entry?.tests.length ?? 0;
    const sourceCount = entry?.sources.length ?? 0;

    if (status === "enforced" && testCount === 0)
    {
        unverified.push(id);
    }

    if (status === "planned" && testCount > 0)
    {
        early.push({ id, where: entry.tests });
    }

    if (status !== "review-only" && testCount === 0 && sourceCount === 0)
    {
        dead.push(id);
    }
}

// ── 알린다 ───────────────────────────────────────────────────────────────────

const list = (rows, render) => rows.map((row) => `    ${render(row)}`).join("\n");

if (dead.length > 0)
{
    console.log(`⚠ 아무도 인용하지 않는 불변식 ${dead.length}개 — 카탈로그에만 있고 코드가 모른다`);
    console.log(list(dead, (id) => `${id}  (${catalog.get(id).status})`));
    console.log("");
}

if (early.length > 0)
{
    console.log(`⚠ planned 인데 지키는 테스트가 있는 불변식 ${early.length}개`);
    console.log(list(early, (row) => `${row.id}  (강제 지점 미구현)  ${row.where[0]}`));
    console.log("    다른 층이 막고 있을 뿐이다. 선언한 강제 지점이 서면 카탈로그를 enforced 로 올릴 것.");
    console.log("");
}

let failed = false;

if (misprefixed.length > 0)
{
    console.log(`✗ 남의 도메인 id 를 선언한 카탈로그 ${misprefixed.length}개`);
    console.log(list(misprefixed, (row) => `${row.id}  ${row.at} 는 ${row.prefix} 만 선언한다`));
    console.log("\n도메인 규칙은 그 도메인 패키지가 갖는다. 맞는 카탈로그로 옮길 것.");
    console.log("");
    failed = true;
}

if (retired.length > 0)
{
    console.log(`✗ 폐기된 표기 ${retired.length}개`);
    console.log(list(retired, (row) => `${row.token}  (${row.what})  ${row.at}`));
    console.log("\n맨 번호는 함수 이름으로, 옛 id 는 도메인이 든 정식 id(`INV-LEGAL-01`)로 적을 것.");
    console.log("");
    failed = true;
}

if (unverified.length > 0)
{
    console.log(`✗ 미검증 불변식 ${unverified.length}개 — enforced 인데 인용하는 테스트가 없다`);
    console.log(list(unverified, (id) => id));
    console.log("\n테스트 이름에 그 id 를 인용하거나, 아직 코드가 없다면 카탈로그의 status 를 planned 로 내릴 것.");
    console.log("");
    failed = true;
}

if (unknown.length > 0)
{
    console.log(`✗ 미정의 불변식 ${unknown.length}개 — 인용했는데 어느 카탈로그에도 없다`);

    for (const row of unknown)
    {
        console.log(`    ${row.id}`);
        console.log(list([...row.entry.tests, ...row.entry.sources], (use) => `  ${use}`));
    }

    console.log("\n맞는 도메인의 카탈로그에 더하거나, 오타라면 인용을 고칠 것.");
    failed = true;
}

if (failed)
{
    process.exit(1);
}

const byCatalog = CATALOGS.map(({ file, prefix }) =>
{
    const count = [...catalog].filter(([id]) => id.startsWith(prefix)).length;
    return `${prefix}* ${count}개`;
}).join(" · ");

console.log(`불변식 ${catalog.size}개 (${byCatalog}) — 미정의 없음, 미검증 없음.`);
