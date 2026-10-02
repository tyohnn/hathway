import { assert, describe, it } from "vitest";
import { Effect, Schema } from "effect";

import { appAction } from "./action";

/**
 * 관문(`appAction`)이 실제로 관문인지.
 *
 * 서버 액션에는 tRPC 의 procedure 빌더 같은 것이 없어서 `export async function` 하나면 클라이언트가 바로 닿는다.
 * 그 자리를 이 함수가 메우는데, **메우고 있다는 사실 자체가 검증되지 않으면** 규약 문서 한 줄과 다를 게 없다.
 *
 * 가장 중요한 것은 두 번째 케이스다. 세션이 없으면 액션이 **핸들러에 도달하지 못해야** 한다.
 * 도달한다면 익명 폴백이 어딘가에 생겼다는 뜻이다.
 */
const Input = Schema.Struct({ message: Schema.NonEmptyString });

/** 거절된 이유를 문자열로: 통과하면 그 자체가 실패다 */
const failureOf = async (promise: Promise<unknown>): Promise<string> =>
{
    try
    {
        const value = await promise;

        throw new Error(`거절돼야 하는데 통과했다: ${JSON.stringify(value)}`);
    }
    catch (cause)
    {
        return JSON.stringify(cause, Object.getOwnPropertyNames(Object(cause)));
    }
};

describe("appAction", () =>
{
    it("입력이 스키마에 맞지 않으면 핸들러를 부르지 않는다 (①)", async () =>
    {
        let called = false;
        const action = appAction({ input: Input }, () =>
        {
            called = true;

            return Effect.succeed("ok");
        });

        assert.match(await failureOf(action({ message: "" })), /InvalidActionInput|NonEmptyString|message/);
        assert.strictEqual(called, false, "파싱 실패인데 핸들러가 불렸다");
    });

    it("세션이 없으면 핸들러를 부르지 않는다 (② fail-close)", async () =>
    {
        let called = false;
        const action = appAction({ input: Input }, () =>
        {
            called = true;

            return Effect.succeed("ok");
        });

        // ⚠ 실패의 **종류**로 단언한다. 문구는 바뀌지만 "세션이 없으면 못 지난다" 는 바뀌면 안 된다.
        //    인증 실패는 둘로 갈리고 가는 곳도 다르다(NoSession 은 /login, NotAppMember 는 /no-access).
        //    어느 쪽이든 핸들러에 닿지 않는 것이 이 케이스의 전부다.
        assert.match(await failureOf(action({ message: "안녕" })), /"_tag":"(NoSession|NotAppMember)"/);
        assert.strictEqual(called, false, "인증 없이 핸들러가 불렸다 — 익명 폴백이 생겼다");
    });
});
