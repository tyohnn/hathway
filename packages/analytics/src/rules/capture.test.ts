import { assert, describe, it } from "vitest";

import { customerActor } from "@hathway/access/testing/actor";

import { parseConsent } from "../domain/Consent.ts";
import { planCapture } from "./capture.ts";

describe("이벤트를 보낼지 정한다", () =>
{
    const actor = customerActor("7", { tenantId: "2" });

    it("INV-ANALYTICS-01 동의하지 않았거나 고르지 않은 사람의 이벤트는 보내지 않는다", () =>
    {
        assert.isNull(planCapture("denied", actor, "note_created", { visibility: "tenant" }));
        assert.isNull(planCapture("unknown", actor, "note_created", { visibility: "tenant" }));
        assert.isNotNull(planCapture("granted", actor, "note_created", { visibility: "tenant" }));
    });

    it("INV-ANALYTICS-01 쿠키에 적힌 값이 둘 중 하나가 아니면 고르지 않은 것이다", () =>
    {
        assert.strictEqual(parseConsent("granted"), "granted");
        assert.strictEqual(parseConsent("denied"), "denied");
        assert.strictEqual(parseConsent("yes"), "unknown");
        assert.strictEqual(parseConsent(undefined), "unknown");
    });

    it("INV-ANALYTICS-02 사람은 계정 id, 조직은 테넌트 id 로만 가리킨다", () =>
    {
        const planned = planCapture("granted", actor, "note_archived");

        assert.deepStrictEqual(planned, {
            distinctId: "7",
            event: "note_archived",
            properties: {},
            groups: { organization: "2" },
        });
    });

    it("INV-ANALYTICS-03 카탈로그에 없는 이벤트는 보내지 않고, 적지 않은 속성은 떨군다", () =>
    {
        assert.isNull(planCapture("granted", actor, "note_viewed"));

        const planned = planCapture("granted", actor, "note_created", { visibility: "private", title: "비밀 회의", email: "kim@example.test" });

        assert.deepStrictEqual(planned?.properties, { visibility: "private" });
    });
});
