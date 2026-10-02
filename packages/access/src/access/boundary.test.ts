import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * **행위자를 만드는 길이 하나로 남아 있는지 확인하는 검사** (INV-ACCESS-04).
 *
 * 브랜드 타입은 실행 중에 아무것도 증명하지 못한다. `Actor` 를 지키는 것은 그것을 만드는 길이
 * 하나뿐이라는 사실이고, 그 사실은 주석이 아니라 검사가 지켜야 한다. 열람권 판정이 첫 번째로 읽는
 * 값이라서 한 곳이라도 새면 전권 계정을 만드는 길이 열린다.
 *
 * 여기서 재는 것이 셋이다.
 *
 *   1. 운영 코드가 테스트 전용 생성자를 부르지 않는다. `operatorActor` 에 `admin` 을 얹은 한 줄이 전권 계정을 만드는
 *      가장 짧은 길이고, 이름이 무해해 보여서 리뷰에서 눈에 잘 띄지 않는다.
 *   2. 브랜드를 붙이는 단언이 정해진 두 파일에만 있다.
 *   3. 행위자를 만드는 함수가 앱에 노출되지 않는다. `actorForApp` 이 `canEnterApp` 을 지나야 도달하는
 *      유일한 통로여야 한다.
 *
 * ⚠ 소스를 글자로 읽는다. import 문만 보면 재수출이나 동적 import 로 빠져나간다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".turbo", ".git", "e2e"]);

const sourcesUnder = (root: string): ReadonlyArray<{ readonly path: string; readonly source: string }> =>
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

            if (!/\.tsx?$/.test(entry))
            {
                continue;
            }

            found.push({ path: relative(repoRoot, full), source: readFileSync(full, "utf8") });
        }
    };

    walk(root);

    return found;
};

/** 테스트 파일과 테스트 전용 모듈은 이 검사의 대상이 아니다. 그 안에서는 지어내는 것이 일이다 */
const isTestCode = (path: string): boolean =>
    /\.test\.tsx?$/.test(path) || path.includes("/testing/");

const productionSources = [
    ...sourcesUnder(join(repoRoot, "apps")),
    ...sourcesUnder(join(repoRoot, "packages")),
].filter((file) => !isTestCode(file.path));

describe("행위자를 만드는 길", () =>
{
    it("INV-ACCESS-04 운영 코드가 테스트 전용 행위자 생성자를 부르지 않는다", () =>
    {
        const offenders = productionSources
            .filter((file) => file.source.includes("access/testing/actor"))
            .map((file) => file.path);

        expect(offenders).toEqual([]);
    });

    it("INV-ACCESS-04 브랜드를 붙이는 단언이 정해진 두 파일에만 있다", () =>
    {
        const allowed = new Set([
            "packages/access/src/access/actorForApp.ts",
            "packages/access/src/testing/actor.ts",
        ]);

        const offenders = [
            ...sourcesUnder(join(repoRoot, "apps")),
            ...sourcesUnder(join(repoRoot, "packages")),
        ]
            .filter((file) => /as\s+Actor\b|as\s+Actor\b/.test(file.source))
            .map((file) => file.path)
            .filter((path) => !allowed.has(path));

        expect(offenders).toEqual([]);
    });

    it("INV-ACCESS-04 행위자를 만드는 함수를 패키지 밖으로 내보내지 않는다", () =>
    {
        const actorModule = readFileSync(join(here, "../domain/Actor.ts"), "utf8");

        // 값을 만드는 export 가 이 모듈에 있으면 어느 액션에서든 객체 하나로 행위자를 지어낼 수 있다
        expect(actorModule).not.toMatch(/export\s+const\s+decodeActor/);
        expect(actorModule).not.toMatch(/as\s+Actor\b/);
    });

    it("INV-ACCESS-04 앱은 actorForApp 으로만 행위자를 세운다", () =>
    {
        const appsCallingActorForApp = sourcesUnder(join(repoRoot, "apps"))
            .filter((file) => !isTestCode(file.path))
            .filter((file) => file.source.includes("actorForApp"))
            .map((file) => file.path);

        // 앱마다 자기 관문에서 한 번씩 부른다. 하나도 없으면 이 검사가 무엇도 재지 않는다
        expect(appsCallingActorForApp.length).toBeGreaterThan(0);
    });
});
