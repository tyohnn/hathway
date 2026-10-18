import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { TOOLS } from "@/lib/mcp";

import { APP_HTML } from "./app/bundle.generated";
import { bundleSource } from "./app/build.mjs";
import { ICON_SVG, PLUGIN_SHAPE } from "./surface";

/**
 * 플러그인 패키지(`plugin/`)와 로컬 마켓플레이스가 서버와 어긋나지 않았는가.
 *
 * 패키지는 서버 밖의 파일이다. 스킬이 없는 도구를 부르라고 하거나 매니페스트가 없는 파일을 가리켜도 서버의 테스트는
 * 초록이고, 깔아 본 사람만 안다. 그래서 여기서 파일을 읽어 대조한다.
 */
const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const read = (path: string): string => readFileSync(`${root}${path}`, "utf8");
const json = (path: string): Record<string, unknown> => JSON.parse(read(path)) as Record<string, unknown>;

const manifest = json("plugin/plugin.json");
const openai = (manifest["extensions"] as Record<string, Record<string, unknown>>)["com.openai"] ?? {};
const inPlugin = (path: unknown): string => `plugin/${String(path).replace(/^\.\//, "")}`;

describe("플러그인 패키지", () =>
{
    it("plugin.json 의 이름은 kebab-case 이고 판이 있다. 호스트가 이름을 플러그인의 식별자로 쓴다", () =>
    {
        assert.match(String(manifest["name"]), /^[a-z][a-z0-9-]*$/);
        assert.match(String(manifest["version"]), /^\d+\.\d+\.\d+$/);
    });

    it("plugin.json 의 온보딩 스킬이 가리키는 파일이 있다", () =>
    {
        assert.match(String(openai["onboardingSkill"]), /^\.\/skills\/[a-z-]+\/SKILL\.md$/);
        assert.isTrue(existsSync(`${root}${inPlugin(openai["onboardingSkill"])}`));
    });

    it("plugin.json 이 가리키는 그림과 연결 파일이 있다. 길은 ./ 로 시작해 플러그인 폴더 안에 머문다", () =>
    {
        const face = openai["interface"] as Record<string, unknown>;

        for (const path of [openai["apps"], face["composerIcon"], face["logo"]])
        {
            assert.match(String(path), /^\.\/(?!.*\.\.)/);
            assert.isTrue(existsSync(`${root}${inPlugin(path)}`), String(path));
        }
    });

    it("mcp.json 의 서버는 streamable-http 이고 주소가 /api/mcp 로 끝난다", () =>
    {
        const servers = Object.values(json("plugin/mcp.json")["mcpServers"] as Record<string, { type: string; url: string }>);

        assert.strictEqual(servers.length, 1);
        assert.strictEqual(servers[0]?.type, "streamable-http");
        assert.match(servers[0]?.url ?? "", /\/api\/mcp$/);
    });

    it("마켓플레이스의 source.path 가 플러그인 폴더를 가리키고 이름이 plugin.json 과 같다", () =>
    {
        const marketplace = json(".agents/plugins/marketplace.json");
        const entries = marketplace["plugins"] as ReadonlyArray<{ name: string; source: { source: string; path: string }; policy: Record<string, string>; category: string }>;

        assert.strictEqual(entries.length, 1);
        assert.deepStrictEqual(entries[0]?.source, { source: "local", path: "./plugin" });
        assert.strictEqual(entries[0]?.name, manifest["name"]);
        assert.isTrue(existsSync(`${root}plugin/plugin.json`));
        // 호스트는 이 셋이 빠진 항목을 건너뛴다
        assert.isDefined(entries[0]?.policy["installation"]);
        assert.isDefined(entries[0]?.policy["authentication"]);
        assert.isDefined(entries[0]?.category);
    });

    it("스킬이 부르는 도구가 도구 목록에 있다", () =>
    {
        const known = new Set([...TOOLS, ...PLUGIN_SHAPE.tools].map((tool) => tool.name));
        const skills = ["plugin/skills/notes/SKILL.md", "plugin/skills/setup/SKILL.md"];

        for (const path of skills)
        {
            const called = [...read(path).matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((match) => match[1] ?? "");

            assert.isAbove(called.length, 0, path);

            for (const name of called)
            {
                assert.isTrue(known.has(name), `${path} 가 없는 도구를 부른다: ${name}`);
            }
        }
    });

    it("스킬마다 이름과 설명이 있다. 호스트가 설명을 보고 언제 쓸지 고른다", () =>
    {
        for (const name of ["notes", "setup"])
        {
            const text = read(`plugin/skills/${name}/SKILL.md`);

            assert.match(text, new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---\\n`));
        }
    });

    it("플러그인의 아이콘과 사이드바 도구의 아이콘이 같은 그림이다", () =>
    {
        assert.strictEqual(read("plugin/assets/icon.svg"), ICON_SVG);
    });
});

describe("구운 화면", () =>
{
    it("구운 앱이 소스와 같다", async () =>
    {
        const fresh = await bundleSource() as string;

        assert.strictEqual(read("apps/web/src/modules/plugin/app/bundle.generated.ts"), fresh, "app/ 을 고쳤으면 build.mjs 로 다시 굽는다");
    });

    it("구운 앱에 서버의 것이 실리지 않았다. 도구의 선언과 서명은 호스트 안으로 나가지 않는다", () =>
    {
        assert.notInclude(APP_HTML, "mentions/search");
        assert.notInclude(APP_HTML, "createHmac");
        assert.notInclude(APP_HTML, "x-openai-input");
    });

    it("구운 앱은 밖의 주소를 부르지 않는다. 화면 자원이 그렇게 선언했다", () =>
    {
        assert.notMatch(APP_HTML, /(?:src|href)=\\?["']https?:/);
        assert.notInclude(APP_HTML, "fetch(");
    });
});
