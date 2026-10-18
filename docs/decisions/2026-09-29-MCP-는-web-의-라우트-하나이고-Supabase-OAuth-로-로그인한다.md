# MCP 는 web 의 라우트 하나이고 Supabase OAuth 로 로그인한다

## 정한 것

- MCP 엔드포인트는 `apps/web` 의 `/api/mcp` 하나다. 다른 앱에 두지 않는다.
- 로그인은 Supabase Auth 의 OAuth 2.1 서버가 한다. 우리는 토큰을 발급하지 않는다.
  - `/api/mcp` 는 토큰이 없으면 401 과 `WWW-Authenticate: Bearer resource_metadata=…` 를 돌려준다.
  - `/.well-known/oauth-protected-resource`(RFC 9728)가 인증 서버로 우리 프로젝트의 `/auth/v1` 을 가리킨다.
  - 사람은 `/oauth/consent` 에서 허용한다. 동의 경로와 동적 등록은 `supabase/config.toml` 의 `[auth.oauth_server]` 가 켠다.
- 토큰으로 들어온 요청도 쿠키로 들어온 요청과 같은 계층을 지난다(`lib/bearerActor.ts`). 첫 로그인의 잇기
  (INV-ACCESS-08)와 문(`canEnterApp`)이 같고, 도구는 화면이 부르는 유스케이스를 그대로 부른다.

## 까닭

- 라우트가 둘이면 같은 도구 목록과 같은 판정이 두 앱에 산다. 한쪽에만 선 관문이 다른 쪽에서 새어 나가는
  날이 온다(REQ-02). MCP 로 부르는 사람은 대개 제품의 고객이라 그 사람이 들어오는 앱인 web 에 둔다.
- 토큰을 우리가 만들면 발급 · 회수 · 만료 · 해시 보관을 우리가 들고 있어야 한다. Supabase 가 OAuth 서버를
  맡으면 로그인 수단(구글 · 로컬 비밀번호)과 계정을 그대로 물려받고, 클로드 코드는 동적 등록과 PKCE 로 스스로
  붙는다.
- 사슬 전체(동적 등록 → PKCE 인가 → 동의 → 토큰 교환 → 도구 호출)를 `apps/web/e2e/mcp.spec.ts` 가 로컬 스택에서
  잰다. 토큰으로 불러도 화면과 같은 쪽지만 보이는지가 그 스펙의 마지막 단언이다.
