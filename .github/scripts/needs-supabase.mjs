#!/usr/bin/env node
// 이번 실행에 로컬 Supabase 가 필요한지 정해 `needed=true|false` 를 한 줄로 찍는다.
//
// 로컬 스택에 붙는 검사는 두 어댑터의 계약 테스트뿐이다. `adapters-postgres` 는 DB(54362)에 직결하고
// `adapters-storage` 는 API(54361)를 지나 인증 서버의 공개 설정을 읽는다. 나머지 워크스페이스
// (`apps/*` 와 도메인 패키지)의 vitest 설정은 DB 주소를 깔지 않는다. 그래서 계약 테스트 둘이 모두
// turbo 캐시에 있으면 스택을 띄우지 않고 기동에 드는 1분 30초를 아낀다.
//
// ⚠ 스택에 붙는 패키지가 늘면 아래 `CONTRACT_TASKS` 에 함께 적는다. 빠뜨리면 그 패키지만 고친 PR 에서
//    스택 없이 테스트가 돌아 접속 오류로 빨강이 된다.
//
// 판정은 `turbo run --dry=json` 이 작업마다 알려 주는 캐시 적중 여부로 한다. 뒤에서 도는 `turbo test`
// 와 같은 해시를 쓰므로 무엇이 바뀌었는지를 따로 추측하지 않는다.
//
// ⚠ **틀려도 거짓 초록이 되지 않는다.** 여기서 적중이라 했는데 실제 실행에서 캐시가 빗나가면 계약
//    테스트가 DB 에 접속하지 못해 빨강이 된다. 틀렸을 때 조용히 지나가는 길은 없다.
// ⚠ **모르면 띄운다.** dry run 이 실패하거나 두 작업을 찾지 못하면 `needed=true` 를 찍는다.

import { execFileSync } from "node:child_process";

const CONTRACT_TASKS = ["@hathway/adapters-postgres#test", "@hathway/adapters-storage#test"];

const decide = () =>
{
    let summary;

    try
    {
        const raw = execFileSync(
            "npx",
            ["turbo", "run", "test", ...CONTRACT_TASKS.map((task) => `--filter=${task.split("#")[0]}`), "--dry=json"],
            { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
        );

        summary = JSON.parse(raw.slice(raw.indexOf("{")));
    }
    catch (error)
    {
        console.error(`turbo dry run 을 읽지 못해서 스택을 띄운다: ${error.message}`);
        return true;
    }

    const tasks = new Map(summary.tasks.map((task) => [task.taskId, task]));

    for (const id of CONTRACT_TASKS)
    {
        const task = tasks.get(id);

        if (task === undefined)
        {
            console.error(`${id} 을(를) dry run 에서 찾지 못해서 스택을 띄운다.`);
            return true;
        }

        console.error(`${id}: ${task.cache.status}`);

        if (task.cache.status !== "HIT")
        {
            return true;
        }
    }

    return false;
};

const needed = decide();

console.error(needed ? "계약 테스트가 돌아야 해서 로컬 스택을 띄운다." : "계약 테스트가 모두 캐시에 있어서 로컬 스택을 띄우지 않는다.");
console.log(`needed=${needed}`);
