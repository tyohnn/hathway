/**
 * 로그인 뒤에 돌아갈 주소를 고른다.
 *
 * ⚠ **바깥 주소로 돌려보내지 않는다.** `?redirect=` 는 사람이 주소창에 적을 수 있는 값이라, 검사 없이 쓰면
 *    우리 로그인 화면이 남의 사이트로 보내는 통로가 된다(open redirect). 같은 출처의 경로만 통과시킨다.
 *
 * `//example.com` 과 `https://example.com` 은 둘 다 바깥이다. 앞의 것은 프로토콜을 물려받는 절대 주소라
 * 슬래시로 시작한다는 검사만으로는 걸러지지 않는다.
 */
export const safeRedirect = (candidate: string | null | undefined, fallback: string): string =>
{
    if (candidate === null || candidate === undefined || candidate === "")
    {
        return fallback;
    }

    if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\"))
    {
        return fallback;
    }

    return candidate;
};
