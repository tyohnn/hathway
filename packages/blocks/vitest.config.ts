import { defineConfig } from "vitest/config";

/**
 * 블록의 순수 모듈(뷰 상태·CSV·셀 범위·열 매핑)만 여기서 돈다. DOM 이 필요한 검증은
 * apps/workshop 의 /design 화면 + Playwright e2e 가 맡는다(테스트 3층 규약).
 */
export default defineConfig({
    test: {
        include: ["src/**/*.test.ts"],
        environment: "node",
    },
});
