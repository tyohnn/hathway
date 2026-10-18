/**
 * 성장의 두 잣대. 화면과 스크리너가 같은 셈을 쓴다.
 *
 * ⚠ **앞 값이 0 이하면 내지 않는다.** 적자에서 흑자로 돌아선 해의 「성장률」은 부호가 뒤집혀 뜻이 없다.
 */
/** 소수 한 자리로 반올림. 비율을 화면과 모델에 같은 자릿수로 낸다 */
export const round1 = (value: number): number => Math.round(value * 10) / 10;

export const growthPct = (previous: number | null, current: number | null): number | null =>
{
    if (previous === null || current === null || previous <= 0)
    {
        return null;
    }

    return round1((current - previous) / previous * 100);
};

export const cagrPct = (first: number | null, last: number | null, years: number): number | null =>
{
    if (first === null || last === null || first <= 0 || last <= 0 || years <= 0)
    {
        return null;
    }

    return round1((Math.pow(last / first, 1 / years) - 1) * 100);
};
