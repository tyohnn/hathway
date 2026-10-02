/**
 * 필드 사이의 조건. 화면을 모르므로 vitest 로 검증한다.
 *
 * 조건은 **데이터**다. 함수가 아니라 값이라 앱 정의(JSON)에 그대로 실릴 수 있고,
 * 온톨로지의 `$cond` 가 이 모양으로 내려온다.
 *
 * ⚠ 계산(`$computed`)은 블록이 받지 않는다. 블록은 값을 갖지 않는 제어 컴포넌트라
 * 계산된 값도 호출부가 만들어 `values` 로 내려 주는 것이 옳다. 블록이 계산하면 폼의
 * 업무 규칙이 표현 계층으로 새고, 같은 계산을 서버가 다시 할 때 둘이 갈린다.
 */

export type FieldValues = Readonly<Record<string, string>>;

export interface FieldCondition
{
    /** 조건이 보는 다른 필드의 이름 */
    readonly field: string;
    /** 그 필드가 이 값(들) 중 하나일 때 참 */
    readonly equals?: string | ReadonlyArray<string>;
    /** 그 필드가 이 값(들) 중 어느 것도 아닐 때 참 */
    readonly notEquals?: string | ReadonlyArray<string>;
    /** true 면 값이 있을 때, false 면 비었을 때 참 */
    readonly filled?: boolean;
}

const asList = (value: string | ReadonlyArray<string>): ReadonlyArray<string> =>
    typeof value === "string" ? [value] : value;

/** 조건 하나를 판정한다. 적지 않은 축은 보지 않는다 */
export function matchesCondition(values: FieldValues, condition: FieldCondition): boolean
{
    const value = values[condition.field] ?? "";

    if (condition.equals !== undefined && !asList(condition.equals).includes(value))
    {
        return false;
    }

    if (condition.notEquals !== undefined && asList(condition.notEquals).includes(value))
    {
        return false;
    }

    if (condition.filled !== undefined && (value !== "") !== condition.filled)
    {
        return false;
    }

    return true;
}

/** 조건이 여럿이면 전부 참이어야 한다. 「또는」이 필요하면 값 목록(`equals`)을 쓴다 */
export function matchesAll(values: FieldValues, conditions?: FieldCondition | ReadonlyArray<FieldCondition>): boolean
{
    if (conditions === undefined)
    {
        return true;
    }

    const list = Array.isArray(conditions) ? conditions : [conditions as FieldCondition];

    return list.every((condition) => matchesCondition(values, condition));
}
