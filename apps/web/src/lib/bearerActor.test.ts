import { assert, describe, it } from "vitest";

import { bearerToken } from "./bearerActor";

describe("Authorization 헤더", () =>
{
    it("Bearer 뒤의 값을 꺼낸다. 대소문자와 앞뒤 공백을 가리지 않는다", () =>
    {
        assert.strictEqual(bearerToken("Bearer abc.def"), "abc.def");
        assert.strictEqual(bearerToken("  bearer   abc  "), "abc");
    });

    it("값이 없거나 다른 방식이면 토큰이 없는 것이다", () =>
    {
        assert.isNull(bearerToken(null));
        assert.isNull(bearerToken("Bearer "));
        assert.isNull(bearerToken("Basic dXNlcg=="));
    });
});
