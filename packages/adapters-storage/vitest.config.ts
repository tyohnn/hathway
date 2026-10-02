import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * 로컬 스택의 Storage 기본값.
 *
 * ⚠ **여기 적힌 열쇠 둘은 로컬 데모 값이다.** `supabase start` 가 누구에게나 같은 값을 찍어 주고,
 *    `postgres:postgres` 와 같은 급의 공개된 개발용이다. 배포의 열쇠는 이 저장소에 없다.
 *
 * ⚠ **기본값을 두는 것이 검사를 무르게 하지 않는다.** 스택이 떠 있지 않으면 접속이 거절되어 그대로
 *    빨강이고, 검사 안의 로컬 호스트 확인도 그대로 지난다. 없애면 `turbo test` 가 변수를 손으로
 *    내보내지 않은 모든 사람에게 빨강이 된다(`adapters-postgres` 와 같은 까닭이다).
 */
const LOCAL_URL = "http://127.0.0.1:54361";
const LOCAL_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    + ".eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0"
    + ".EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const LOCAL_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    + ".eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9"
    + ".CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export default defineConfig({
    resolve: {
        alias: {
            "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
        },
    },
    test: {
        include: ["src/**/*.test.ts"],
        globals: false,
        env: {
            SUPABASE_STORAGE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? LOCAL_URL,
            SUPABASE_STORAGE_KEY: process.env.SUPABASE_STORAGE_KEY ?? LOCAL_SERVICE_KEY,
            SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? LOCAL_ANON_KEY,
        },
        testTimeout: 30_000,
    },
});
