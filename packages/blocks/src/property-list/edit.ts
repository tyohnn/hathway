/**
 * 그 자리에서 고치는 축의 순수 규칙. 화면을 모르므로 vitest 로 검증한다.
 *
 * 갈래는 일곱이고 다섯은 노션과 같다 — 글·수, 날짜, 하나 고르기, 여럿 고르기, 셈한 값.
 * 나머지 둘(전이·잠김)이 이 제품의 것이다. 판정은 전부 여기 있고 컴포넌트는 그리기만 한다.
 *
 * ⚠ **블록은 허용 전이표도 잠금 판정도 갖지 않는다.** 전이는 `packages/legal` 의
 * `allowedTransitions(from)` 이, 잠금은 같은 패키지의 `canEdit` 이 소유한다. 호출부가 그
 * 결과를 넘기고 여기서는 받은 것만 다룬다. 표를 옮겨 적으면 두 벌이 되고, 고를 수 있게 그려
 * 주고 서버가 거절하는 설명할 수 없는 자리가 생긴다.
 */

import type { PropertyEdit, PropertyEditKind, PropertyOption, TransitionEdit } from "./types";

/** 고치지 못하는 둘. 잠김은 까닭을 달고 서고 셈한 값은 아예 칸이 아니다 */
const READING: ReadonlyArray<string> = ["locked", "derived"];

/** `none` 은 `edit` 를 주지 않은 칸이다. 종전처럼 값만 그린다 */
export type ResolvedEditKind = PropertyEditKind | "none";

/**
 * 칸이 실제로 무엇으로 서는가.
 *
 * ⚠ **열람권이 갈리면 칸도 갈린다.** 열람자는 읽고 담당자는 고치므로, 같은 패널이 사람에 따라
 * 고치는 다섯을 셈한 값처럼 그린다. 칸을 그려 놓고 누를 때 거절하면 그것이 권한 문제인지
 * 고장인지 사람이 가리지 못한다.
 */
export function resolveEditKind(edit: PropertyEdit | undefined, readOnly = false): ResolvedEditKind
{
    if (edit === undefined)
    {
        return "none";
    }

    if (!readOnly || READING.includes(edit.kind))
    {
        return edit.kind;
    }

    return "derived";
}

/** 커서가 서고 누를 수 있는 칸인가 */
export function isEditable(kind: ResolvedEditKind): boolean
{
    return kind !== "none" && !READING.includes(kind);
}

/**
 * 전이가 갈 수 있는 곳.
 *
 * 받은 목록에서 지금 상태만 뺀다. 도메인의 허용 전이표가 자기 자신을 담지 않지만, 담아 오더라도
 * 「지금 그대로」가 고를 거리로 서지는 않아야 한다.
 */
export function transitionChoices(edit: TransitionEdit): ReadonlyArray<PropertyOption>
{
    return edit.options.filter((option) => option.value !== edit.value);
}

/** 확정할 수 있는가. 허용된 곳이어야 하고, 사유를 받기로 했으면 비어 있지 않아야 한다 */
export function canCommitTransition(edit: TransitionEdit, next: string, reason: string): boolean
{
    if (!transitionChoices(edit).some((option) => option.value === next))
    {
        return false;
    }

    return edit.reason !== "required" || reason.trim() !== "";
}

/**
 * 벗어날 때 저장할지.
 *
 * 값이 그대로면 부르지 않는다. 서버 액션이 여섯 단계를 지나므로, 열어만 보고 나온 칸까지
 * 저장하면 기록에 「고쳤다」가 쌓이고 나중에 무엇이 실제로 달라졌는지 읽히지 않는다.
 */
export function shouldCommit(draft: string, current: string): boolean
{
    return draft.trim() !== current.trim();
}

/**
 * 여럿 고르기의 토글.
 *
 * 이미 고른 것은 빼고, 없던 것은 뒤에 붙여 고른 차례를 지킨다. 상한에 닿았으면 넣지 않는다 —
 * ⚠ 자유 입력인 `TagInput` 과 달리 여기는 정해진 목록에서 고르므로 중복도 오류 문구도 없다.
 */
export function toggleChoice(
    current: ReadonlyArray<string>,
    value: string,
    max?: number,
): ReadonlyArray<string>
{
    if (current.includes(value))
    {
        return current.filter((chosen) => chosen !== value);
    }

    if (max !== undefined && current.length >= max)
    {
        return current;
    }

    return [...current, value];
}

/** `yyyy-MM-dd` 한 벌 */
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * 날짜 문자열을 달력이 읽는 Date 로.
 *
 * ⚠ **`new Date("2026-09-25")` 를 쓰지 않는다.** 그것은 UTC 자정으로 읽어서, KST 에서 그리면
 * 오전 아홉 시가 된다. 뒤이어 달력이 돌려준 지역 자정을 `toISOString()` 으로 적으면 하루가
 * 밀린다. 날짜 칸이 그 자리다 - 고른 날과 저장된 날이 하루씩 어긋난다.
 */
export function parseDay(value: string | undefined): Date | undefined
{
    const parts = value === undefined ? null : DAY.exec(value);

    if (parts === null)
    {
        return undefined;
    }

    return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
}

/** 달력이 준 날을 `yyyy-MM-dd` 로. 지역 달력의 값을 그대로 적는다 */
export function formatDay(date: Date): string
{
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${date.getFullYear()}-${month}-${day}`;
}
