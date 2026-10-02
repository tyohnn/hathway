import { assert, describe, it } from "vitest";

import { planAccountLink, signedInUserOf, type LinkableAccount, type SignedInUser } from "./accountLink.ts";

const USER: SignedInUser = {
    authUserId: "00000000-0000-4000-8000-0000000000a1",
    email: "kim@example.test",
    emailConfirmed: true,
};

const EMPTY: LinkableAccount = {
    accountId: "7",
    authUserId: null,
    deactivated: false,
};

describe("첫 로그인에 계정을 잇는 판정", () =>
{
    it("INV-ACCESS-08 비어 있는 계정에 인증된 같은 주소로 들어오면 그 세션을 잇는다", () =>
    {
        assert.deepStrictEqual(planAccountLink(USER, EMPTY), {
            _tag: "Link",
            accountId: "7",
            email: "kim@example.test",
        });
    });

    it("대소문자와 앞뒤 공백만 다른 주소는 같은 사람으로 잇는다 — 명부가 소문자로 적혀 있다", () =>
    {
        const shouting = { ...USER, email: "  Kim@Example.Test " };

        assert.deepStrictEqual(planAccountLink(shouting, EMPTY), {
            _tag: "Link",
            accountId: "7",
            email: "kim@example.test",
        });
    });

    it("이미 이 세션이 붙어 있으면 다시 잇지 않는다 — 두 번째 로그인부터는 조회만 한다", () =>
    {
        const linked = { ...EMPTY, authUserId: USER.authUserId };

        assert.deepStrictEqual(planAccountLink(USER, linked), { _tag: "AlreadyLinked", accountId: "7" });
    });

    it("INV-ACCESS-08 다른 세션이 이미 붙어 있으면 잇지 않는다 — 붙은 것을 로그인이 바꾸면 남의 계정을 가로채는 길이 된다", () =>
    {
        const taken = { ...EMPTY, authUserId: "00000000-0000-4000-8000-0000000000b2" };

        assert.deepStrictEqual(planAccountLink(USER, taken), { _tag: "Refuse", reason: "linked_to_other" });
    });

    it("INV-ACCESS-08 주소가 인증되지 않은 세션은 잇지 않는다 — 확인하지 않은 주소로 남의 계정을 가져간다", () =>
    {
        const unconfirmed = { ...USER, emailConfirmed: false };

        assert.deepStrictEqual(planAccountLink(unconfirmed, EMPTY), { _tag: "Refuse", reason: "unverified_email" });
    });

    it("주소가 없는 세션은 잇지 않는다 — 무엇으로 찾을지가 없다", () =>
    {
        assert.deepStrictEqual(planAccountLink({ ...USER, email: null }, EMPTY), { _tag: "Refuse", reason: "no_email" });
        assert.deepStrictEqual(planAccountLink({ ...USER, email: "   " }, EMPTY), { _tag: "Refuse", reason: "no_email" });
    });

    it("명부에 없는 주소는 잇지 않고 계정을 새로 만들지도 않는다 — 계정 행이 곧 문이다", () =>
    {
        assert.deepStrictEqual(planAccountLink(USER, null), { _tag: "Refuse", reason: "no_account" });
    });

    it("INV-ACCESS-03 나간 계정에는 잇지 않는다 — 돌아온 사람은 다시 켜진 뒤 로그인할 때 이어진다", () =>
    {
        const left = { ...EMPTY, deactivated: true };

        assert.deepStrictEqual(planAccountLink(USER, left), { _tag: "Refuse", reason: "deactivated" });
    });
});

describe("인증 서버가 돌려준 사용자", () =>
{
    it("주소를 확인한 시각이 있어야 인증된 주소다 — 가입만 하고 링크를 누르지 않은 주소는 주인이 아닐 수 있다", () =>
    {
        const id = "00000000-0000-4000-8000-0000000000a1";

        assert.deepStrictEqual(
            signedInUserOf({ id, email: "kim@example.test", email_confirmed_at: "2026-09-28T01:00:00Z" }),
            { authUserId: id, email: "kim@example.test", emailConfirmed: true },
        );
        assert.deepStrictEqual(
            signedInUserOf({ id, email: "kim@example.test", email_confirmed_at: null }),
            { authUserId: id, email: "kim@example.test", emailConfirmed: false },
        );
        assert.deepStrictEqual(
            signedInUserOf({ id }),
            { authUserId: id, email: null, emailConfirmed: false },
        );
    });
});
