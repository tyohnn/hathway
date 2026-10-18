import { assert, describe, it } from "vitest";

import { isTurnEnd, untilTurnEnd } from "./turnStream";

const collect = async (parts: ReadonlyArray<unknown>): Promise<ReadonlyArray<unknown>> =>
{
    const source = new ReadableStream<unknown>({
        start(controller)
        {
            for (const part of parts)
            {
                controller.enqueue(part);
            }

            controller.close();
        },
    });
    const seen: Array<unknown> = [];
    const reader = source.pipeThrough(untilTurnEnd<unknown>()).getReader();

    for (;;)
    {
        const { done, value } = await reader.read();

        if (done)
        {
            return seen;
        }

        seen.push(value);
    }
};

describe("턴 하나만 떼어 낸다", () =>
{
    it("턴의 끝(까닭이 없는 finish)에서 닫고 다음 턴의 조각을 싣지 않는다", async () =>
    {
        const seen = await collect([
            { type: "text-delta", delta: "첫 턴" },
            { type: "finish" },
            { type: "text-delta", delta: "둘째 턴" },
        ]);

        assert.deepStrictEqual(seen, [{ type: "text-delta", delta: "첫 턴" }]);
    });

    it("모델 호출의 finish 는 턴의 끝이 아니다. 도구를 부른 뒤 걸음이 이어진다", () =>
    {
        assert.isFalse(isTurnEnd({ type: "finish", finishReason: { unified: "tool-calls" } }));
        assert.isTrue(isTurnEnd({ type: "finish" }));
    });
});
