import { assert, describe, it } from "vitest";

import { normalizeConnectionString } from "./connection.ts";

/**
 * 접속 문자열 가드.
 *
 * 여기서 막는 두 실패는 **증상이 정반대**라 둘 다 시험한다: sslmode 누락은 연결이 되면서 평문으로 흐르고
 * (조용하다), `uselibpqcompat` 누락은 연결 자체가 인증서 오류로 실패한다(시끄럽지만 원인이 안 보인다).
 */
const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54362/postgres";
const REMOTE = "postgresql://postgres.abcdefghijklmnopqrst@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres";

describe("normalizeConnectionString", () =>
{
    it("로컬 스택은 TLS 없이 통과한다 — 도커 Postgres 는 평문이고 통합 검사가 여기서 돈다", () =>
    {
        assert.strictEqual(new URL(normalizeConnectionString(LOCAL)).hostname, "127.0.0.1");
    });

    it("원격에 sslmode 가 없으면 기동을 막는다 — 풀러가 평문을 거부하지 않아 증상이 없다", () =>
    {
        assert.throws(() => normalizeConnectionString(REMOTE), /sslmode/);
    });

    it("sslmode=disable 도 같은 이유로 막는다", () =>
    {
        assert.throws(() => normalizeConnectionString(`${REMOTE}?sslmode=disable`), /sslmode/);
    });

    it("sslmode=require 에 uselibpqcompat=true 를 붙인다 — pg v8.22+ 는 require 를 verify-full 로 읽는다", () =>
    {
        const normalized = new URL(normalizeConnectionString(`${REMOTE}?sslmode=require`));

        assert.strictEqual(normalized.searchParams.get("uselibpqcompat"), "true");
        assert.strictEqual(normalized.searchParams.get("sslmode"), "require");
    });

    it("verify-full 은 손대지 않는다 — 체인을 검증하겠다는 뜻이므로 완화하면 안 된다", () =>
    {
        const normalized = new URL(normalizeConnectionString(`${REMOTE}?sslmode=verify-full`));

        assert.strictEqual(normalized.searchParams.get("uselibpqcompat"), null);
    });

    it("URL 로 읽히지 않으면 막는다", () =>
    {
        assert.throws(() => normalizeConnectionString("postgres@호스트/디비"), /URL/);
    });
});
