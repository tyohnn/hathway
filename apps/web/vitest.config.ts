import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// 테스트는 그 코드 옆의 `*.test.ts` 에 둔다. 규약은 docs/개발-방법론.md 「테스트」에 있다.
export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL(".", import.meta.url)),
            "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
        },
    },
    test: {
        include: ["app/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    },
});
