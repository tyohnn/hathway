import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectSpecs } from "./e2e-select.mjs";

/** 파일 이름 → 내용. 디스크 대신 이 표를 읽게 해서 선택 규칙만 잰다 */
const repo = (files) => ({
    read: (path) => files[path],
    exists: (path) => path in files,
    list: (dir) => Object.keys(files).filter((path) => path.startsWith(`${dir}/`)),
});

const APP = { name: "@fixture/admin", dir: "apps/admin" };
const WORKSPACES = {
    "@fixture/admin": { dir: "apps/admin", deps: ["@fixture/ui", "@fixture/operations"] },
    "@fixture/ui": {
        dir: "packages/ui",
        deps: [],
        exports: { "./components/*": "./src/components/*.tsx", "./product.css": "./src/product.css" },
    },
    "@fixture/operations": { dir: "packages/operations", deps: ["@fixture/core"], exports: { "./money": "./src/money/index.ts" } },
    "@fixture/core": { dir: "packages/core", deps: [], exports: { "./domain/*": { types: "./src/domain/*.ts", default: "./src/domain/*.ts" } } },
    "@fixture/legal": { dir: "packages/legal", deps: ["@fixture/core"], exports: { ".": "./src/index.ts" } },
};

const files = {
    "apps/admin/e2e/contracts.spec.ts": `await page.goto("/contracts");`,
    "apps/admin/e2e/billing.spec.ts": `import { open } from "./controls"; await open(page);`,
    "apps/admin/e2e/controls.ts": `export const open = (page) => page.goto("/billing");`,
    "apps/admin/e2e/companies.spec.ts": `await page.goto("/companies");`,
    "apps/admin/e2e/opaque.spec.ts": `await page.getByText("열기").click();`,
    "apps/admin/src/app/layout.tsx": `import "./globals.css"; import { Shell } from "@/app/_components/Shell"; export default Shell;`,
    "apps/admin/src/app/globals.css": `@import "tailwindcss"; @import "@fixture/ui/product.css";`,
    "apps/admin/src/app/_components/Shell.tsx": `export const Shell = 1;`,
    "apps/admin/src/app/(app)/contracts/page.tsx": `import { Panel } from "./Panel"; import { money } from "@/lib/money"; export default Panel;`,
    "apps/admin/src/app/(app)/contracts/Panel.tsx": `import { Badge } from "@fixture/ui/components/badge"; export const Panel = 1;`,
    "apps/admin/src/app/(app)/billing/page.tsx": `import { money } from "@/lib/money"; import { won } from "@fixture/operations/money"; export default 1;`,
    "apps/admin/src/app/(app)/companies/page.tsx": `export default () => <a href="/contracts?id=1">계약</a>;`,
    "apps/admin/src/lib/money.ts": `export const money = 1;`,
    "apps/admin/src/lib/unused.ts": `export const unused = 1;`,
    "packages/ui/package.json": `{}`,
    "packages/ui/src/product.css": `.x {}`,
    "packages/ui/src/components/badge.tsx": `import { cn } from "../lib/cn"; export const Badge = 1;`,
    "packages/ui/src/components/dial.tsx": `export const Dial = 1;`,
    "packages/ui/src/lib/cn.ts": `export const cn = 1;`,
    "packages/ui/scripts/pull.mjs": `export {};`,
    "packages/operations/src/money/index.ts": `export * from "./format";`,
    "packages/operations/src/money/format.ts": `import { Amount } from "@fixture/core/domain/amount"; export const won = 1;`,
    "packages/core/src/domain/amount.ts": `export const Amount = 1;`,
};
const io = repo(files);
const select = (changed) =>
    selectSpecs({ app: APP, changed, workspaces: WORKSPACES, io });
const names = (selection) => selection.specs.map((spec) => spec.file.replace("apps/admin/e2e/", ""));

describe("selectSpecs", () =>
{
    it("화면 하나에만 닿는 파일을 고치면 그 화면을 여는 스펙만 고른다", () =>
    {
        const selection = select(["apps/admin/src/app/(app)/contracts/Panel.tsx"]);

        assert.equal(selection.mode, "narrow");
        assert.deepEqual(names(selection).sort(), ["companies.spec.ts", "contracts.spec.ts", "opaque.spec.ts"]);
    });

    it("두 화면이 함께 쓰는 파일을 고치면 두 화면의 스펙을 모두 고른다", () =>
    {
        const selection = select(["apps/admin/src/lib/money.ts"]);

        assert.deepEqual(names(selection).sort(), ["billing.spec.ts", "companies.spec.ts", "contracts.spec.ts", "opaque.spec.ts"]);
    });

    it("다른 화면으로 가는 링크를 가진 화면의 스펙은 그 링크 너머의 변경도 잰다", () =>
    {
        const selection = select(["apps/admin/src/app/(app)/contracts/Panel.tsx"]);

        assert.ok(names(selection).includes("companies.spec.ts"));
    });

    it("화면을 알 수 없는 스펙은 늘 돈다", () =>
    {
        const selection = select(["apps/admin/src/app/(app)/billing/page.tsx"]);

        assert.ok(names(selection).includes("opaque.spec.ts"));
    });

    it("도우미 파일이 여는 화면은 그것을 부르는 스펙의 화면으로 센다", () =>
    {
        const selection = select(["apps/admin/src/app/(app)/billing/page.tsx"]);

        assert.ok(names(selection).includes("billing.spec.ts"));
        assert.ok(!names(selection).includes("companies.spec.ts"));
    });

    it("레이아웃이나 레이아웃이 부르는 파일을 고치면 앱 전체를 돌린다", () =>
    {
        for (const file of ["apps/admin/src/app/layout.tsx", "apps/admin/src/app/_components/Shell.tsx"])
        {
            const selection = select([file]);

            assert.equal(selection.mode, "full");
            assert.equal(selection.specs.length, 4);
        }
    });

    it("화면이 언어 마디([lang]) 아래에 있어도 같은 주소로 센다", () =>
    {
        // 미들웨어가 언어를 숨겨 붙이므로 `app/[lang]/(app)/contracts` 의 주소도 `/contracts` 다
        const localized = Object.fromEntries(Object.entries(files).map(([path, body]) =>
            [path.replace("apps/admin/src/app/", "apps/admin/src/app/[lang]/").replace("[lang]/globals.css", "globals.css"), body]));
        const pick = (changed) => selectSpecs({ app: APP, changed, workspaces: WORKSPACES, io: repo(localized) });

        const narrow = pick(["apps/admin/src/app/[lang]/(app)/contracts/Panel.tsx"]);

        assert.equal(narrow.mode, "narrow");
        assert.deepEqual(names(narrow).sort(), ["companies.spec.ts", "contracts.spec.ts", "opaque.spec.ts"]);
        assert.equal(pick(["apps/admin/src/app/[lang]/layout.tsx"]).mode, "full");
    });

    it("앱의 설정 파일을 고치면 앱 전체를 돌린다", () =>
    {
        for (const file of ["apps/admin/next.config.ts", "apps/admin/package.json", "apps/admin/playwright.config.ts"])
        {
            assert.equal(select([file]).mode, "full");
        }
    });

    it("패키지의 파일을 고치면 그 파일을 부르는 화면의 스펙만 고른다", () =>
    {
        const selection = select(["packages/ui/src/components/badge.tsx"]);

        assert.equal(selection.mode, "narrow");
        assert.deepEqual(names(selection).sort(), ["companies.spec.ts", "contracts.spec.ts", "opaque.spec.ts"]);
    });

    it("패키지 안의 다른 파일을 거쳐 닿는 화면도 센다", () =>
    {
        assert.deepEqual(names(select(["packages/ui/src/lib/cn.ts"])).sort(), ["companies.spec.ts", "contracts.spec.ts", "opaque.spec.ts"]);
        assert.ok(names(select(["packages/operations/src/money/format.ts"])).includes("billing.spec.ts"));
    });

    it("다른 패키지를 거쳐 닿는 화면도 센다", () =>
    {
        const selection = select(["packages/core/src/domain/amount.ts"]);

        assert.equal(selection.mode, "narrow");
        assert.ok(names(selection).includes("billing.spec.ts"));
        assert.ok(!names(selection).includes("contracts.spec.ts"));
    });

    it("겹치는 입구 무늬는 별 앞부분이 가장 긴 것으로 푼다", () =>
    {
        const workspaces = {
            ...WORKSPACES,
            "@fixture/ui": { ...WORKSPACES["@fixture/ui"], exports: { "./*": "./src/missing/*.tsx", ...WORKSPACES["@fixture/ui"].exports } },
        };
        const selection = selectSpecs({ app: APP, changed: ["packages/ui/src/components/badge.tsx"], workspaces, io });

        assert.ok(names(selection).includes("contracts.spec.ts"));
    });

    it("앱이 부르지 않는 패키지 파일만 고치면 e2e 를 돌리지 않는다", () =>
    {
        const selection = select(["packages/ui/src/components/dial.tsx"]);

        assert.equal(selection.mode, "narrow");
        assert.deepEqual(selection.specs, []);
    });

    it("레이아웃이 부르는 패키지 파일을 고치면 앱 전체를 돌린다", () =>
    {
        assert.equal(select(["packages/ui/src/product.css"]).mode, "full");
    });

    it("패키지의 입구(exports)에서 닿지 않는 파일을 고치면 앱 전체를 돌린다", () =>
    {
        for (const file of ["packages/ui/scripts/pull.mjs", "packages/ui/package.json", "packages/ui/src/Removed.tsx"])
        {
            assert.equal(select([file]).mode, "full", file);
        }
    });

    it("스펙이 부르는 패키지 파일을 고치면 그 스펙을 고른다", () =>
    {
        const selection = selectSpecs({
            app: APP,
            changed: ["packages/core/src/domain/amount.ts"],
            workspaces: WORKSPACES,
            io: repo({ ...files, "apps/admin/e2e/opaque.spec.ts": `import { Amount } from "@fixture/core/domain/amount";` }),
        });

        assert.ok(names(selection).includes("opaque.spec.ts"));
        assert.match(selection.specs.find((spec) => spec.file.endsWith("opaque.spec.ts")).why, /도우미/);
    });

    it("앱이 의존하지 않는 패키지만 고쳤으면 그 파일은 세지 않는다", () =>
    {
        const selection = select(["packages/legal/src/index.ts", "apps/admin/src/app/(app)/billing/page.tsx"]);

        assert.equal(selection.mode, "narrow");
    });

    it("마이그레이션과 시드를 고치면 앱 전체를 돌린다", () =>
    {
        assert.equal(select(["supabase/migrations/20261016000000_x.sql"]).mode, "full");
        assert.equal(select(["supabase/seeds/zz-fake-x.sql"]).mode, "full");
    });

    it("스펙 파일을 고치면 그 스펙을 고른다", () =>
    {
        const selection = select(["apps/admin/e2e/companies.spec.ts"]);

        assert.deepEqual(names(selection).sort(), ["companies.spec.ts"]);
    });

    it("스펙의 도우미 파일을 고치면 그것을 부르는 스펙을 모두 고른다", () =>
    {
        const selection = select(["apps/admin/e2e/controls.ts"]);

        assert.ok(names(selection).includes("billing.spec.ts"));
        assert.ok(!names(selection).includes("contracts.spec.ts"));
    });

    it("어느 화면도 부르지 않는 파일만 바뀌면 화면을 알 수 없는 스펙도 돌지 않는다", () =>
    {
        const selection = select(["apps/admin/src/lib/unused.ts"]);

        assert.deepEqual(selection.specs, []);
    });

    it("단위 테스트와 문서만 바뀌면 e2e 를 돌리지 않는다", () =>
    {
        const selection = select(["apps/admin/src/lib/money.test.ts", "apps/admin/CLAUDE.md", "docs/dev/x.md"]);

        assert.deepEqual(selection.specs, []);
    });

    it("지운 소스 파일이 있으면 어느 화면이 불렀는지 알 수 없어 앱 전체를 돌린다", () =>
    {
        const selection = select(["apps/admin/src/app/(app)/billing/Removed.tsx"]);

        assert.equal(selection.mode, "full");
    });

    it("full 을 요청하면 바뀐 파일과 상관없이 스펙 전체를 고른다", () =>
    {
        const selection = selectSpecs({ app: APP, changed: [], workspaces: WORKSPACES, io, full: true });

        assert.equal(selection.mode, "full");
        assert.equal(selection.specs.length, 4);
    });

    it("고른 스펙마다 까닭을 남긴다", () =>
    {
        const selection = select(["apps/admin/src/app/(app)/billing/page.tsx"]);
        const billing = selection.specs.find((spec) => spec.file.endsWith("billing.spec.ts"));

        assert.match(billing.why, /billing/);
    });
});
