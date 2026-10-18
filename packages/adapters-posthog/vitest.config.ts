import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            // 어댑터 모듈 최상단의 `import "server-only"` 게이트는 Next 서버 밖에서 throw 한다. 테스트에서만 빈 모듈로 바꾼다
            "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
        },
    },
    test: {
        include: ["src/**/*.test.ts"],
        globals: false,
    },
});
