/**
 * 진행률의 비율 계산. 화면을 모르므로 vitest 로 검증한다.
 *
 * 나눗셈을 컴포넌트 안에 두면 0 나눗셈과 넘친 값을 확인하려고 매번 화면을 띄워야 한다.
 * 막대가 읽는 값은 여기 셋뿐이고 막대는 그 값을 그리기만 한다.
 */

/** 막대를 그릴 수 있는가. total 이 0 이하이거나 수가 아니면 나눌 눈금이 없다 */
export function hasTrack(total: number): boolean
{
    return Number.isFinite(total) && total > 0;
}

/**
 * 끝난 수를 0 과 total 사이로 접는다.
 *
 * 넘친 값을 그대로 두면 막대가 그릇 밖으로 자라고 음수는 오른쪽에서 왼쪽으로 자란다.
 * 서버가 하루 잘못 센 것이 화면을 깨뜨리지 않도록 블록이 여기서 막는다.
 */
export function clampCompleted(value: number, total: number): number
{
    if (!hasTrack(total) || !Number.isFinite(value) || value <= 0)
    {
        return 0;
    }

    return value > total ? total : value;
}

/** 채운 길이를 백분율로 준다. 나눌 눈금이 없으면 0 이다 */
export function toPercent(value: number, total: number): number
{
    if (!hasTrack(total))
    {
        return 0;
    }

    return (clampCompleted(value, total) / total) * 100;
}
