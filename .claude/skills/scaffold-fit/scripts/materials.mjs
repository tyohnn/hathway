#!/usr/bin/env node
/**
 * 제품 지도를 그릴 때 고를 수 있는 화면 재료를 한 줄씩 찍는다. `/scaffold-fit` 의 0번이 부른다.
 *
 *   node .claude/skills/scaffold-fit/scripts/materials.mjs [블록 이름의 일부 …]
 *
 * 세 층을 찍는다. 줄마다 import 할 자리와, 처음 내보내는 컴포넌트 바로 위 주석의 첫 문장이다.
 *
 *   1. tyohnn 블록(`packages/ui/src/blocks/*.tsx`). 상세 · 폼 · 달력 · 표처럼 화면 대부분의 재료가 여기 있다
 *   2. 블록 층(`packages/blocks/src/<블록>/`). 셸 · 목록 · 대화 · 로그인 판. 기다리는 얼굴을 따로 그린 블록에는 ⚠ 를 단다
 *   3. 템플릿 조각(`apps/web/src/kit/` 또는 편입 전의 `apps/web/src/modules/templates-kit/`)
 *
 * 인자를 주면 경로에 그 글자가 든 줄만 찍는다(`materials.mjs calendar week`).
 *
 * ⚠ **목록을 손으로 적은 문서로 두지 않는다.** 블록은 tyohnn 에서 다시 받을 때마다 늘고 준다. 코드의 주석에서 그때그때 뽑아야
 *    틀리지 않는다. 주석이 없거나 첫 문장이 모자라면 그 파일을 연다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const root = process.cwd();
const filters = process.argv.slice(2).map((word) => word.toLowerCase());

const files = (dir) =>
{
    if (!existsSync(dir))
    {
        return [];
    }

    return readdirSync(dir).flatMap((entry) =>
    {
        const full = join(dir, entry);

        if (statSync(full).isDirectory())
        {
            return entry === "lib" ? [] : files(full);
        }

        return /\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry) ? [full] : [];
    });
};

/** 처음 내보내는 함수 · 상수 바로 위의 문서 주석에서 첫 문장을 뽑는다 */
const summaryOf = (file) =>
{
    const text = readFileSync(file, "utf8");
    const exported = text.search(/^export (?:default )?(?:function|const) [A-Z]/m);
    const head = exported === -1 ? text : text.slice(0, exported);
    const comments = [...head.matchAll(/\/\*\*([\s\S]*?)\*\//g)];

    if (comments.length === 0)
    {
        return "(주석 없음)";
    }

    const body = comments.at(-1)[1]
        .split("\n")
        .map((line) => line.replace(/^\s*\*\s?/, "").trim())
        .filter((line) => line !== "" && !line.startsWith("@"))
        .join(" ");
    const sentence = body.match(/^.*?(?:[.。]|다\.|다$)(?=\s|$)/);

    return (sentence ? sentence[0] : body).slice(0, 160);
};

const show = (title, entries) =>
{
    const kept = entries.filter(([path]) => filters.length === 0 || filters.some((word) => path.toLowerCase().includes(word)));

    if (kept.length === 0)
    {
        return;
    }

    console.log(`\n## ${title} (${kept.length})`);

    for (const [path, summary] of kept)
    {
        console.log(`- ${path}  ${summary}`);
    }
};

const scope = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).name?.split("/")[0] ?? "@scaffold";
const ui = `${scope.startsWith("@") ? scope : `@${scope}`}`;

show("tyohnn 블록", files(join(root, "packages/ui/src/blocks")).map((file) =>
    [`${ui}/ui/blocks/${basename(file, ".tsx")}`, summaryOf(file)]));

show("블록 층", readdirSync(join(root, "packages/blocks/src"))
    .filter((entry) => statSync(join(root, "packages/blocks/src", entry)).isDirectory() && entry !== "icons")
    .map((entry) =>
    {
        const found = files(join(root, "packages/blocks/src", entry));
        const first = found.find((file) => !/Skeleton/.test(file));
        // 기다리는 얼굴을 따로 그린 블록은 루트 CLAUDE.md 「정적 껍데기」 3번과 부딪힌다. 고를 때 알아야 한다
        const skeleton = found.some((file) => /Skeleton/.test(file)) ? " ⚠ 기다리는 얼굴이 따로 그린 뼈대(Skeleton)라서 <Suspense> 의 fallback 으로 쓰지 않는다" : "";

        return [`${ui}/blocks/${entry}`, `${first === undefined ? "(컴포넌트 없음)" : summaryOf(first)}${skeleton}`];
    }));

const kit = ["apps/web/src/kit", "apps/web/src/modules/templates-kit"].map((dir) => join(root, dir)).find(existsSync);

if (kit !== undefined)
{
    show(`템플릿 조각 (${relative(root, kit)})`, files(kit).map((file) => [relative(kit, file), summaryOf(file)]));
}
