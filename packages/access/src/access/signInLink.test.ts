import { assert, describe, it } from "@effect/vitest";

import { normalizeLoginEmail } from "./signInLink.ts";

/**
 * 로그인 링크를 청하는 주소의 정본을 정하는 자리
 * (`docs/decisions/2026-09-18-로그인-링크는-명부에-있는-주소로만-보낸다.md`).
 *
 * 링크를 보낼지 말지는 여기가 정하지 않는다. 그것은 `canEnterApp` 하나가 답하고, 이 함수는 그 판정에
 * 넘길 값을 고른다. 명부(`org.account.email`)가 소문자로 서 있으므로 사람이 적은 것을 거기에 맞춘다.
 */
describe("로그인 링크를 청하는 주소", () =>
{
    it("앞뒤 공백을 지우고 소문자로 접는다 — 사람이 적는 주소와 명부에 적힌 주소가 같은 값이어야 명부를 찾는다", () =>
    {
        assert.strictEqual(normalizeLoginEmail("  Kim@Example.Test  "), "kim@example.test");
        assert.strictEqual(normalizeLoginEmail("kim@example.test"), "kim@example.test");
    });

    it("골뱅이가 없으면 주소가 아니다 — 명부를 뒤지기 전에 떨어진다", () =>
    {
        assert.strictEqual(normalizeLoginEmail("kim.example.test"), null);
    });

    it("빈 값과 공백뿐인 값은 주소가 아니다", () =>
    {
        assert.strictEqual(normalizeLoginEmail(""), null);
        assert.strictEqual(normalizeLoginEmail("   "), null);
    });

    it("가운데 공백이 있으면 주소가 아니다 — 두 주소를 한 칸에 적은 것을 한 사람으로 읽지 않는다", () =>
    {
        assert.strictEqual(normalizeLoginEmail("kim@example.test lee@example.test"), null);
    });

    it("골뱅이 뒤가 비어 있으면 주소가 아니다 — 보낼 곳이 없다", () =>
    {
        assert.strictEqual(normalizeLoginEmail("kim@"), null);
        assert.strictEqual(normalizeLoginEmail("@example.test"), null);
    });
});
