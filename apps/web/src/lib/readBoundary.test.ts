import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * 정적 껍데기의 규칙 둘을 소스로 잰다(`CLAUDE.md` 「정적 껍데기」).
 *
 *   · 셸 안쪽 화면(`app/(app)/`)이 데이터를 읽는 길은 관문 `appRead` 하나다. 행위자를 직접 얻거나 Effect 를 직접 돌리면
 *     게이트가 본문 옆으로 빠진 지금 판정 전에 데이터를 그리는 길이 생긴다. 셸의 게이트(`AuthGate`)만 예외다
 *   · 화면은 뼈대를 따로 그리지 않는다. 기다리는 얼굴은 같은 블록 · 같은 컴포넌트의 `loading` 이다
 *
 * ⚠ 주석이 아니라 코드에서 찾는다. 이 규칙을 설명하는 주석이 걸리지 않게 주석 줄을 빼고 본다.
 */
const appDir = fileURLToPath(new URL("../app/", import.meta.url));

const walk = (dir: string): ReadonlyArray<string> =>
    readdirSync(dir).flatMap((entry) =>
    {
        const full = join(dir, entry);

        return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(entry) ? [full] : [];
    });

const codeOf = (file: string): string =>
    readFileSync(file, "utf8").split("\n").filter((line) => !/^\s*(\/\/|\*|\/\*\*)/.test(line)).join("\n");

const screens = walk(join(appDir, "(app)")).filter((file) => !file.endsWith("_components/AuthGate.tsx"));

describe("정적 껍데기", () =>
{
    it("셸 안쪽 화면은 데이터를 관문(appRead)으로만 읽는다. 행위자를 직접 얻거나 Effect 를 직접 돌리지 않는다", () =>
    {
        const broken = screens
            .filter((file) => /@\/lib\/currentActor|Effect\.runPromise\(/.test(codeOf(file)))
            .map((file) => relative(appDir, file));

        expect(broken).toEqual([]);
    });

    it("화면은 뼈대를 따로 그리지 않는다. 기다리는 얼굴은 같은 컴포넌트의 loading 이다", () =>
    {
        const broken = walk(appDir)
            .filter((file) => /@hathway\/ui\/components\/skeleton|bg-skeleton/.test(codeOf(file)))
            .map((file) => relative(appDir, file));

        expect(broken).toEqual([]);
    });
});
