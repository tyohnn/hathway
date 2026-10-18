#!/usr/bin/env node
// 이번 실행에 쓴 turbo 캐시만 남기고 나머지를 지운다.
//
// CI 는 앞선 실행의 `.turbo/cache` 를 받아 그 위에 새 결과를 더한 뒤 다시 저장한다. 그대로 두면 한 번도
// 다시 쓰이지 않을 옛 해시가 실행마다 쌓여 캐시가 끝없이 커지고, 받고 올리는 시간이 캐시로 아낀 시간을
// 넘어선다. CI 는 저장소 전체의 typecheck · test · build 를 돌리므로 이번 실행에 쓴 해시가 곧 다음
// 실행에 필요한 해시다.
//
// 어느 해시를 썼는지는 `turbo run --summarize` 가 `.turbo/runs/` 에 남긴 요약이 알려 준다.
// ⚠ 요약이 하나도 없으면 아무것도 지우지 않는다. 플래그가 빠진 채로 이 스크립트가 돌면 캐시를 통째로
//    비우게 되기 때문이다.

import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const runs = ".turbo/runs";
const cache = ".turbo/cache";

const used = new Set();

if (existsSync(runs))
{
    for (const name of readdirSync(runs))
    {
        const summary = JSON.parse(readFileSync(join(runs, name), "utf8"));

        for (const task of summary.tasks)
        {
            used.add(task.hash);
        }
    }
}

if (used.size === 0 || !existsSync(cache))
{
    console.log("실행 요약이나 캐시가 없어서 정리하지 않았다.");
    process.exit(0);
}

let kept = 0;
let removed = 0;

for (const name of readdirSync(cache))
{
    // 캐시 파일은 `<해시>.tar.zst` · `<해시>-meta.json` · `<해시>-manifest.json` 꼴이다
    const hash = name.split(/[-.]/)[0];

    if (used.has(hash))
    {
        kept += 1;
        continue;
    }

    rmSync(join(cache, name), { recursive: true, force: true });
    removed += 1;
}

console.log(`작업 ${used.size}개의 캐시 파일 ${kept}개를 남기고 ${removed}개를 지웠다.`);
