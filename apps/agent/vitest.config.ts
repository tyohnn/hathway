import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            // 서버 전용 게이트(`import "server-only"`)는 Next 서버 밖에서 throw 한다 — 테스트에서만 빈 모듈로 바꾼다
            "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
            "@/": fileURLToPath(new URL("./src/", import.meta.url)),
        },
    },
    test: {
        // ⚠ e2e/ 는 Playwright 소관이다. 제외하지 않으면 vitest 가 .spec.ts 를 집어
        //   `test.describe()` 를 못 찾고 실패한다. e2e 는 `npm run e2e` 로 돈다.
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        exclude: ["node_modules", ".next", "e2e"],
        passWithNoTests: true,
        globals: false,
    },
});
