import { assert, describe, it } from "vitest";

import { FORM_TTL_MS, signState, verifyState } from "./requestState";

const SECRET = "검사용 비밀";
const ISSUED = 1_800_000_000_000;
const claims = { sub: "2:2", tool: "pick_note", exp: ISSUED + FORM_TTL_MS };
const expected = { sub: "2:2", tool: "pick_note" };

describe("폼의 requestState", () =>
{
    it("서명한 그대로 돌아오면 받는다", () =>
    {
        assert.strictEqual(verifyState(SECRET, signState(SECRET, claims), { ...expected, now: ISSUED + 1 }), "ok");
    });

    it("고친 requestState 는 받지 않는다", () =>
    {
        const state = signState(SECRET, claims);
        const [, signature] = state.split(".");
        const forged = `${Buffer.from(JSON.stringify({ ...claims, sub: "2:3" })).toString("base64url")}.${signature}`;

        assert.strictEqual(verifyState(SECRET, forged, { sub: "2:3", tool: "pick_note", now: ISSUED }), "tampered");
        assert.strictEqual(verifyState(SECRET, `${state}x`, { ...expected, now: ISSUED }), "tampered");
        assert.strictEqual(verifyState(SECRET, "아무 글자", { ...expected, now: ISSUED }), "tampered");
        assert.strictEqual(verifyState("다른 비밀", state, { ...expected, now: ISSUED }), "tampered");
    });

    it("다른 사람의 requestState 는 받지 않는다. 같은 계정이라도 다른 조직으로 들어왔으면 다른 사람이다", () =>
    {
        const state = signState(SECRET, claims);

        assert.strictEqual(verifyState(SECRET, state, { sub: "2:3", tool: "pick_note", now: ISSUED }), "mismatch");
        assert.strictEqual(verifyState(SECRET, state, { sub: "1:2", tool: "pick_note", now: ISSUED }), "mismatch");
    });

    it("다른 도구가 낸 requestState 는 받지 않는다. 고르는 폼의 답으로 쪽지를 쓰지 못한다", () =>
    {
        assert.strictEqual(verifyState(SECRET, signState(SECRET, claims), { sub: "2:2", tool: "compose_note", now: ISSUED }), "mismatch");
    });

    it("십 분째까지 받고 그 뒤는 받지 않는다", () =>
    {
        const state = signState(SECRET, claims);

        assert.strictEqual(verifyState(SECRET, state, { ...expected, now: ISSUED + FORM_TTL_MS }), "ok");
        assert.strictEqual(verifyState(SECRET, state, { ...expected, now: ISSUED + FORM_TTL_MS + 1 }), "expired");
        assert.strictEqual(FORM_TTL_MS, 10 * 60 * 1000);
    });
});
