/**
 * 그 자리에서 고치는 칸의 키 규칙.
 *
 * ⚠ **한 자리에 둔다.** 표의 셀 편집기(`data-table/BodyCell.tsx`)와 상세 속성의 칸
 * (`property-list/EditCell.tsx`)이 같은 규칙을 쓰는데, 각자 적어 두면 한쪽만 고치는 날
 * 같은 화면에서 Esc 가 두 가지로 동작한다. 조건 트리거를 공용으로 올린 것과 같은 까닭이다.
 *
 * ⚠ **벗어나면 저장이라 키는 지름길일 뿐이다.** 그래서 여기가 정하는 것은 셋뿐이고, 저장할
 * 값이 무엇인지도 고친 것이 있는지도 부르는 쪽이 판정한다.
 */

export type EditKeyIntent = "commit" | "revert" | "none";

export interface EditKeyModifiers
{
    /** 여러 줄이면 Enter 가 줄바꿈이다. 저장은 ⌘·Ctrl 을 함께 누른다 */
    readonly multiline?: boolean;
    readonly metaKey?: boolean;
    readonly ctrlKey?: boolean;
}

export function editKeyIntent(key: string, modifiers: EditKeyModifiers = {}): EditKeyIntent
{
    if (key === "Escape")
    {
        return "revert";
    }

    if (key !== "Enter")
    {
        return "none";
    }

    if (modifiers.multiline === true)
    {
        return modifiers.metaKey === true || modifiers.ctrlKey === true ? "commit" : "none";
    }

    return "commit";
}
