import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

/**
 * **워크플로가 행위자를 나르지 않는지 확인하는 검사**(INV-AGENT-04).
 *
 * 워크플로의 인자는 직렬화를 지나 저장되고 며칠 뒤에 다시 읽힌다. 행위자에는 증거 구실을 하는 데이터가
 * 없어서 그 왕복을 지나면 역할을 적어 넣은 객체와 구분되지 않고, 저장된 소속은 깨어나는 그때의 소속도
 * 아니다. 그래서 워크플로가 싣는 것은 계정 id 하나이고 행위자는 도구가 도는 그 순간에 다시 선다.
 *
 * ⚠ **주석으로 두면 지켜지지 않는다.** 도구를 하나 더 붙이는 사람이 가장 짧은 길을 고르면 그 길이 곧
 *    행위자를 인자로 받는 것이다. 소스를 글자로 읽는다.
 */
const here = dirname(fileURLToPath(import.meta.url));

const sources = (): ReadonlyArray<{ readonly path: string; readonly source: string }> =>
{
    const found: Array<{ path: string; source: string }> = [];

    const walk = (dir: string): void =>
    {
        for (const entry of readdirSync(dir))
        {
            const full = join(dir, entry);

            if (statSync(full).isDirectory())
            {
                walk(full);
                continue;
            }

            if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts"))
            {
                found.push({ path: relative(here, full), source: readFileSync(full, "utf8") });
            }
        }
    };

    walk(here);

    return found;
};

describe("워크플로의 경계", () =>
{
    it("INV-AGENT-04 워크플로와 스텝은 행위자를 인자로 받지 않는다. 직렬화를 지나면 표식이 사라진다", () =>
    {
        const carrying = sources().filter(({ source }) => /\bActor\b/.test(source));

        assert.deepStrictEqual(carrying.map(({ path }) => path), []);
    });

    it("INV-AGENT-04 도메인 데이터에 닿는 스텝은 그 자리에서 계정 id 로 행위자를 다시 세운다", () =>
    {
        const touching = sources().filter(({ source }) => /NoteStore/.test(source));

        assert.isAbove(touching.length, 0);

        for (const { path, source } of touching)
        {
            assert.include(source, "actorForAccountId", path);
        }
    });

    it("워크플로 본체는 어댑터를 부르지 않는다. DB 에 닿는 일은 전부 스텝의 몫이다", () =>
    {
        const body = sources().find(({ path }) => path === "chat.ts");

        assert.isDefined(body);
        assert.notMatch(body?.source ?? "", /@hathway\/adapters-postgres|@\/lib\/agentRuntime/);
    });
});
