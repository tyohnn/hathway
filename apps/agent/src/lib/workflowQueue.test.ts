import { assert, describe, it } from "vitest";

import { QUEUE_TIMEOUT_FLOOR_MS, QUEUE_TIMEOUT_KEYS, QUEUE_TIMEOUT_MS, tuneQueueTimeouts } from "./workflowQueue";

describe("로컬 큐의 전송 한도", () =>
{
    it("비어 있으면 한도를 넣는다 — 기본값 30초는 도구를 부르는 턴을 잘라 낸다", () =>
    {
        const env: Record<string, string | undefined> = {};

        tuneQueueTimeouts(env);

        assert.deepStrictEqual(
            QUEUE_TIMEOUT_KEYS.map((key) => env[key]),
            QUEUE_TIMEOUT_KEYS.map(() => QUEUE_TIMEOUT_MS),
        );
    });

    it("이미 적힌 값을 덮지 않는다 — 재현하려면 밖에서 넣을 수 있어야 한다", () =>
    {
        const env: Record<string, string | undefined> = { WORKFLOW_LOCAL_HEADERS_TIMEOUT_MS: "1000" };

        tuneQueueTimeouts(env);

        assert.strictEqual(env["WORKFLOW_LOCAL_HEADERS_TIMEOUT_MS"], "1000");
    });

    it("빈 문자열은 적히지 않은 것으로 본다 — 큐도 그렇게 읽는다", () =>
    {
        const env: Record<string, string | undefined> = { WORKFLOW_LOCAL_BODY_TIMEOUT_MS: "" };

        tuneQueueTimeouts(env);

        assert.strictEqual(env["WORKFLOW_LOCAL_BODY_TIMEOUT_MS"], QUEUE_TIMEOUT_MS);
    });

    it("한도가 한 턴보다 넉넉하다 — 45초 걸린 턴이 실측으로 지나갔다", () =>
    {
        // 무한이 아니어야 한다. 진짜로 멈춘 전송이 영영 매달리는 자리를 남기지 않는다
        assert.isAbove(Number(QUEUE_TIMEOUT_MS), 60_000);
        assert.isFinite(Number(QUEUE_TIMEOUT_MS));
    });

    it("한 턴보다 짧은 한도가 적혀 있으면 경고를 돌려준다 — 조용히 이기면 실행이 까닭 없이 죽는다", () =>
    {
        const notices = tuneQueueTimeouts({ WORKFLOW_LOCAL_BODY_TIMEOUT_MS: "1000" });

        assert.lengthOf(notices, 1);
        assert.include(notices[0] ?? "", "WORKFLOW_LOCAL_BODY_TIMEOUT_MS");
    });

    it("넉넉한 한도에는 아무 말도 하지 않는다 — 밖에서 넣은 값을 재현에 쓸 수 있어야 한다", () =>
    {
        assert.lengthOf(tuneQueueTimeouts({ WORKFLOW_LOCAL_BODY_TIMEOUT_MS: String(QUEUE_TIMEOUT_FLOOR_MS) }), 0);
    });

    it("우리가 채운 자리는 경고가 아니다", () =>
    {
        assert.lengthOf(tuneQueueTimeouts({}), 0);
    });

    it("숫자가 아닌 값도 경고한다 — 큐는 그것을 읽지 못하고 제 기본값으로 돌아간다", () =>
    {
        assert.lengthOf(tuneQueueTimeouts({ WORKFLOW_LOCAL_HEADERS_TIMEOUT_MS: "넉넉히" }), 1);
    });
});
