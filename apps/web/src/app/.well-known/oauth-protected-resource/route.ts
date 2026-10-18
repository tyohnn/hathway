/**
 * 이 서버가 어느 인증 서버를 믿는지 알리는 자리(RFC 9728).
 *
 * MCP 클라이언트는 `/api/mcp` 에서 401 을 받고 그 헤더가 가리키는 이 주소를 읽은 다음, 여기 적힌 인증 서버로
 * 가서 토큰을 얻는다.
 *
 * ⚠ **인증 서버는 Supabase Auth 다.** 우리가 토큰을 발급하지 않는다. 로그인 수단(구글 · 로컬 비밀번호)과
 *    계정을 그대로 물려받는 것이 이 선택의 값이고, 이 문서는 우리 프로젝트의 Auth 주소를 가리키기만 한다.
 *    OAuth 서버를 켜는 설정은 `supabase/config.toml` 의 `[auth.oauth_server]` 이고 원격은 대시보드에서 켠다.
 */
export function GET(request: Request): Response
{
    const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];

    if (url === undefined || url === "")
    {
        return new Response(null, { status: 503 });
    }

    return new Response(JSON.stringify({
        resource: `${new URL(request.url).origin}/api/mcp`,
        authorization_servers: [`${url}/auth/v1`],
        bearer_methods_supported: ["header"],
    }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
}
