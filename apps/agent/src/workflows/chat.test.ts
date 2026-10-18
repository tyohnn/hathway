import { assert, describe, it } from "vitest";

import { carried } from "./chat";

describe("다음 턴에 싣고 갈 대화", () =>
{
    it("지시문을 걸러 낸다. 그대로 실으면 둘째 턴이 거절된다", () =>
    {
        const kept = carried([
            { role: "system", content: "지시문" },
            { role: "user", content: "안녕" },
            { role: "assistant", content: "반가워요" },
        ]);

        assert.deepStrictEqual(kept.map((message) => message.role), ["user", "assistant"]);
    });
});
