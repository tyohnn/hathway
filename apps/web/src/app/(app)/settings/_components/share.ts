/**
 * 전체 가운데 몫이 몇 퍼센트인가. 막대(`Meter`)에 넘기는 0~100 의 정수다.
 *
 * ⚠ **0 과 100 은 정말 그럴 때만 답한다.** 반올림만 하면 1,500 가운데 1,496 이 100% 가 되고 300 가운데 1 이 0% 가 된다.
 *    막대가 「다 찼다」 · 「비었다」고 말하는데 옆의 수는 그렇지 않다고 말하게 된다. 그 사이의 값은 1~99 로 모은다.
 * ⚠ 전체가 0 이하면 잴 수 없다. 부르는 쪽이 막대를 세우지 않는 것이 맞고, 그래도 부르면 몫이 있을 때 100, 없을 때 0 이다.
 */
export const shareOf = (part: number, whole: number): number =>
{
    if (part <= 0)
    {
        return 0;
    }

    if (whole <= 0 || part >= whole)
    {
        return 100;
    }

    return Math.min(99, Math.max(1, Math.round((part / whole) * 100)));
};
