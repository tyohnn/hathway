import { assert, describe, it } from "vitest";

import { DEFAULT_PREFERENCES } from "../domain/Preference.ts";

import { planPreferenceUpdate } from "./update.ts";

describe("설정 고치기", () =>
{
    it("바뀐 칸만 고른다. 말하지 않은 칸은 건드리지 않는다", () =>
    {
        assert.deepStrictEqual(
            planPreferenceUpdate({ showArchived: true }),
            { _tag: "Accepted", changes: { showArchived: true } },
        );
        assert.deepStrictEqual(
            planPreferenceUpdate({ defaultVisibility: "private", showArchived: false }),
            { _tag: "Accepted", changes: { defaultVisibility: "private", showArchived: false } },
        );
    });

    it("INV-PREFERENCE-02 모르는 칸은 고치지 않는다. 표에 없는 칸을 적을 길을 열지 않는다", () =>
    {
        assert.deepStrictEqual(
            planPreferenceUpdate({ tenantId: "3" }),
            { _tag: "Rejected", field: "tenantId", reason: "unknown-field" },
        );
    });

    it("INV-PREFERENCE-02 어휘 밖의 값은 고치지 않는다", () =>
    {
        assert.deepStrictEqual(
            planPreferenceUpdate({ defaultVisibility: "public" }),
            { _tag: "Rejected", field: "defaultVisibility", reason: "invalid-value" },
        );
        assert.deepStrictEqual(
            planPreferenceUpdate({ showArchived: "yes" }),
            { _tag: "Rejected", field: "showArchived", reason: "invalid-value" },
        );
    });

    it("하나라도 틀리면 통째로 받지 않는다. 반만 고친 설정을 남기지 않는다", () =>
    {
        const verdict = planPreferenceUpdate({ showArchived: true, defaultVisibility: 1 });

        assert.strictEqual(verdict._tag, "Rejected");
    });

    it("아무 칸도 주지 않으면 고칠 것이 없다고 답한다", () =>
    {
        assert.deepStrictEqual(planPreferenceUpdate({}), { _tag: "Rejected", field: null, reason: "empty" });
    });

    it("기본값은 조직 전체에 보이고 보관한 쪽지를 숨긴다. 화면의 새 쪽지 폼과 같은 처음 값이다", () =>
    {
        assert.deepStrictEqual(DEFAULT_PREFERENCES, { defaultVisibility: "tenant", showArchived: false });
    });
});
