import { assert, describe, it } from "vitest";

import { chosenModel, DEFAULT_MODEL } from "./model";

describe("대화가 쓸 모델", () =>
{
    it("연습 모드면 모델을 부르지 않는 연습 모델이다", () =>
    {
        assert.strictEqual(chosenModel({ AGENT_RUNNER: "rehearsal", AGENT_MODEL: "anthropic/claude-opus-5.5" }), "rehearsal");
    });

    it("적힌 모델이 있으면 그것을 쓰고 없으면 기본값이다", () =>
    {
        assert.strictEqual(chosenModel({ AGENT_MODEL: "anthropic/claude-opus-5.5" }), "anthropic/claude-opus-5.5");
        assert.strictEqual(chosenModel({ AGENT_MODEL: "  " }), DEFAULT_MODEL);
        assert.strictEqual(chosenModel({}), DEFAULT_MODEL);
    });

    it("연습 모드는 정확히 rehearsal 일 때만 걸린다. 배포의 오타가 모델을 끄지 않는다", () =>
    {
        assert.strictEqual(chosenModel({ AGENT_RUNNER: "Rehearsal" }), DEFAULT_MODEL);
    });
});
