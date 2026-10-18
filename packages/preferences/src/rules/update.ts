import type { DefaultVisibility, PreferenceChanges } from "../domain/Preference.ts";

/**
 * 밖에서 온 「이 칸을 이 값으로」를 고칠 수 있는 변경으로 세운다(INV-PREFERENCE-02).
 *
 * 플러그인의 설정 화면은 바뀐 칸만 보낸다. 그 묶음은 밖에서 온 입력이라 칸의 이름도 값도 믿지 않는다.
 *
 * ⚠ **하나라도 틀리면 통째로 받지 않는다.** 맞는 칸만 골라 고치면 사람은 저장했다고 믿는데 반만 남는다.
 * ⚠ **누구의 설정인지는 여기서 받지 않는다.** 포트가 행위자를 받아 정한다(INV-PREFERENCE-01).
 */
export type UpdateVerdict =
    | { readonly _tag: "Accepted"; readonly changes: PreferenceChanges }
    | { readonly _tag: "Rejected"; readonly field: string | null; readonly reason: "empty" | "unknown-field" | "invalid-value" };

/** 공개 범위의 어휘. 밖에 선택지를 보일 때도 이 목록을 읽어 판정과 갈라지지 않는다 */
export const VISIBILITY_VALUES = ["private", "tenant"] as const satisfies ReadonlyArray<DefaultVisibility>;

const isVisibility = (value: unknown): value is DefaultVisibility =>
    VISIBILITY_VALUES.some((known) => known === value);

export const planPreferenceUpdate = (set: Readonly<Record<string, unknown>>): UpdateVerdict =>
{
    const entries = Object.entries(set);

    if (entries.length === 0)
    {
        return { _tag: "Rejected", field: null, reason: "empty" };
    }

    let changes: PreferenceChanges = {};

    for (const [field, value] of entries)
    {
        if (field === "defaultVisibility")
        {
            if (!isVisibility(value))
            {
                return { _tag: "Rejected", field, reason: "invalid-value" };
            }

            changes = { ...changes, defaultVisibility: value };
        }
        else if (field === "showArchived")
        {
            if (typeof value !== "boolean")
            {
                return { _tag: "Rejected", field, reason: "invalid-value" };
            }

            changes = { ...changes, showArchived: value };
        }
        else
        {
            return { _tag: "Rejected", field, reason: "unknown-field" };
        }
    }

    return { _tag: "Accepted", changes };
};
