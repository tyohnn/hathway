import { describe, expect, it } from "vitest";
import { Effect, Schema } from "effect";

import { appAction } from "./action";
import { isGateRefusal, refusalOf } from "./gateRefusal";

const Input = Schema.Struct({ message: Schema.NonEmptyString });

const action = appAction({ input: Input }, () => Effect.succeed("ok"));

const causeOf = async (promise: Promise<unknown>): Promise<unknown> =>
{
    try
    {
        await promise;
    }
    catch (cause)
    {
        return cause;
    }

    throw new Error("거절돼야 하는데 통과했다");
};

describe("관문이 끊은 요청을 가려 읽는다", () =>
{
    it("세션이 없어 끊긴 요청은 관문의 거절이다", async () =>
    {
        expect(isGateRefusal(await causeOf(action({ message: "안녕" })))).toBe(true);
    });

    it("입력이 틀려 끊긴 요청은 관문의 거절이 아니다. 로그인하라고 답하면 고칠 수 없는 것을 고치라고 시키게 된다", async () =>
    {
        expect(isGateRefusal(await causeOf(action({ message: "" })))).toBe(false);
    });

    it("그 밖의 실패는 관문의 거절이 아니다", () =>
    {
        expect(isGateRefusal(new Error("DB 가 내려갔다"))).toBe(false);
        expect(isGateRefusal(undefined)).toBe(false);
    });

    it("까닭을 셋으로 가른다. 로그인이 없으면 sign-in, 꼴이 틀리면 invalid, 나머지는 failed 다", async () =>
    {
        expect(refusalOf(await causeOf(action({ message: "안녕" })))).toBe("sign-in");
        expect(refusalOf(await causeOf(action({ message: "" })))).toBe("invalid");
        expect(refusalOf(new Error('relation "research_boards" does not exist'))).toBe("failed");
    });
});
