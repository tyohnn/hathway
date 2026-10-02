/**
 * 로그인에 걸린 주소의 헬퍼. 화면의 주소(테마 · 섹션 · 종목)는 `lib/nav` 가 갖는다.
 *
 * 절대 경로를 문자열로 적지 않고 여기를 지난다. 라우트의 모양이 바뀌면 이 한 곳만 고친다.
 */
type QueryValue = string | number | undefined;

export const withQuery = (path: string, query: Readonly<Record<string, QueryValue>>): string =>
{
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query))
    {
        if (value === undefined || value === "")
        {
            continue;
        }

        params.set(key, String(value));
    }

    const search = params.toString();

    return search === "" ? path : `${path}?${search}`;
};

export const paths = {
    /** 로그인한 뒤 돌아갈 곳이 없을 때 가는 자리 */
    home: (): string => "/",
    login: (redirect?: string, error?: "failed" | "credentials"): string => withQuery("/login", { redirect, error }),
    noAccess: (): string => "/no-access",
    team: (): string => "/settings/team",
    account: (): string => "/settings/account",
};
