/**
 * 태그 입력의 순수 규칙. 화면을 모르므로 vitest 로 검증한다.
 *
 * 쉼표·세미콜론·줄바꿈·탭으로 나눈다. 붙여넣기 한 번에 여러 개가 들어오는 것이
 * 이 입력의 흔한 쓰임이라, 구분자를 입력 중에도 붙여넣기에도 똑같이 적용한다.
 */
const SEPARATOR = /[,;\n\t]+/;

export function splitTags(text: string): ReadonlyArray<string>
{
    return text
        .split(SEPARATOR)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}

export interface MergeResult
{
    readonly value: ReadonlyArray<string>;
    /** 중복이라 버린 것 */
    readonly duplicates: ReadonlyArray<string>;
    /** 상한을 넘어 버린 것 */
    readonly overflow: ReadonlyArray<string>;
}

/** 이미 있는 것은 버리고, 상한을 넘는 것도 버린다. 무엇이 버려졌는지는 호출부가 알린다 */
export function mergeTags(
    current: ReadonlyArray<string>,
    incoming: ReadonlyArray<string>,
    max?: number,
): MergeResult
{
    const seen = new Set(current);
    const value = [...current];
    const duplicates: string[] = [];
    const overflow: string[] = [];

    for (const tag of incoming)
    {
        if (seen.has(tag))
        {
            duplicates.push(tag);
            continue;
        }

        if (max !== undefined && value.length >= max)
        {
            overflow.push(tag);
            continue;
        }

        seen.add(tag);
        value.push(tag);
    }

    return { value, duplicates, overflow };
}
