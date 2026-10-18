import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * **세션으로 들어오는 자리가 모두 같은 잇기를 지나는지 확인하는 검사** (INV-ACCESS-08).
 *
 * 잇는 규칙은 `resolveAccountFacts` 하나에 있지만, 앱이 그것을 부르지 않고 예전처럼
 * `findMembershipsByUserId` 를 부르면 그 앱에서만 옮긴 사람이 막힌다. 그 실패는 「이 앱을 쓸 수 없는
 * 사람」과 같은 화면으로 접혀서 증상만 보고는 원인을 찾을 수 없으므로, 주석이 아니라 검사가 지킨다.
 *
 * ⚠ 소스를 글자로 읽는다. `boundary.test.ts` 와 같은 방식이다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");

/** 세션이나 Supabase 토큰으로 사람이 들어오는 자리. 앱이 늘면 여기에 한 줄이 는다 */
const SESSION_ENTRIES = [
    "apps/agent/src/lib/auth.ts",
    "apps/web/src/lib/auth.ts",
] as const;

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".turbo", ".git", "e2e"]);

const appSources = (): ReadonlyArray<{ readonly path: string; readonly source: string }> =>
{
    const found: { path: string; source: string }[] = [];

    const walk = (dir: string): void =>
    {
        for (const entry of readdirSync(dir))
        {
            if (SKIP_DIRS.has(entry))
            {
                continue;
            }

            const full = join(dir, entry);

            if (statSync(full).isDirectory())
            {
                walk(full);
                continue;
            }

            if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
            {
                found.push({ path: relative(repoRoot, full), source: readFileSync(full, "utf8") });
            }
        }
    };

    walk(join(repoRoot, "apps"));

    return found;
};

describe("세션으로 들어오는 자리", () =>
{
    it("INV-ACCESS-08 세션으로 들어오는 자리가 모두 같은 잇기를 지난다 — 자리마다 다르면 문이 여럿이 된다", () =>
    {
        for (const path of SESSION_ENTRIES)
        {
            const source = readFileSync(join(repoRoot, path), "utf8");

            expect(source, path).toContain("resolveAccountFacts(");
            expect(source, path).toContain("signedInUserOf(");
        }
    });

    it("INV-ACCESS-08 세션으로 계정을 곧장 찾는 조회를 앱이 부르지 않는다 — 부르면 그 앱에서만 옮긴 사람이 막힌다", () =>
    {
        const callers = appSources()
            .filter((file) => file.source.includes("findMembershipsByUserId("))
            .map((file) => file.path);

        expect(callers).toEqual([]);
    });
});
