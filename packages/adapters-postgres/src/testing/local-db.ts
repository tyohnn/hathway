/**
 * 통합 검사의 접속 문자열 게이트: 두 검사 파일이 같은 규약을 쓴다.
 *
 * ⚠ 앱마다 접속 롤이 다르므로 환경 변수 이름을 받는다(`WEB_DATABASE_URL` · `AGENT_DATABASE_URL`).
 * ⚠ env 가 없으면 **건너뛰지 않고 실패한다.** `describe.skip` 으로 조용히 초록이 되면 통합 검사가 없는 것과
 *    같다(`docs/개발-방법론.md` 「테스트」).
 * ⚠ prod 를 가리키면 실제 행이 생긴다. 로컬 호스트가 아니면 거부한다.
 */
const LOCAL = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

const hostOf = (value: string): string =>
{
    try
    {
        return new URL(value).hostname;
    }
    catch
    {
        return "";
    }
};

export type LocalDb = { readonly ok: true; readonly url: string } | { readonly ok: false; readonly reason: string };

export const localDb = (envName: string): LocalDb =>
{
    const url = process.env[envName];

    if (url === undefined || url === "")
    {
        return {
            ok: false,
            reason: `${envName} 이 없다. 통합 검사는 도커 Supabase 로만 돌고 건너뛰지 않는다 — `
                + "`supabase start` 뒤 접속 문자열을 주고 다시 돌릴 것.",
        };
    }

    if (!LOCAL.has(hostOf(url)))
    {
        return {
            ok: false,
            reason: `로컬 스택이 아닌 곳을 가리키고 있다(${hostOf(url)}). 이 검사는 행을 만들므로 로컬에서만 돈다.`,
        };
    }

    return { ok: true, url };
};
