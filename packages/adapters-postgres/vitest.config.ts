import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * 로컬 스택의 접속 문자열 기본값.
 *
 * ⚠ **앱마다 롤이 다르다.** 스키마마다가 아니라 앱마다이므로, 앱이 늘 때 여기에 한 줄이 는다. 값은
 *    `platform/supabase/seeds/org.sql` 이 넣는 로컬 전용 비밀번호를 쓰며 `postgres:postgres` 와 같은 급의 공개된 개발용이다.
 *
 * ⚠ **기본값을 두는 것이 검사를 무르게 하지 않는다.** 스택이 떠 있지 않으면 접속이 거절되어 그대로 빨강이고,
 *    `localDb` 의 로컬 호스트 검사도 그대로 지난다 — 건너뛰는 길은 어느 쪽으로도 생기지 않는다. 없애면
 *    `turbo test` 가 그 변수들을 손으로 내보내지 않은 모든 사람에게 빨강이 된다.
 */
const localUrl = (role: string): string => `postgresql://${role}:postgres@127.0.0.1:54362/postgres`;

export default defineConfig({
    resolve: {
        alias: {
            // 어댑터 모듈 최상단의 `import "server-only"` 게이트는 Next 서버 밖에서 throw 한다 — 테스트에서만 빈 모듈로 바꾼다
            "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
        },
    },
    test: {
        include: ["src/**/*.test.ts"],
        globals: false,
        // 통합 검사는 도커 Supabase 의 DB(54362)에 붙는다 — 접속 문자열이 없으면 건너뛰지 않고 실패한다
        env: {
            WEB_DATABASE_URL: process.env.WEB_DATABASE_URL ?? localUrl("web_app"),
            // ⚠ 소유자 롤은 **검사 대상이 아니라 배경**이다. 앱 롤로 심을 수 없는 행을 심는 자리에만 쓰고,
            //    재는 질의는 앱 롤이 낸다
            OWNER_DATABASE_URL: process.env.OWNER_DATABASE_URL ?? localUrl("postgres"),
        },
        testTimeout: 30_000,
        hookTimeout: 60_000,
    },
});
