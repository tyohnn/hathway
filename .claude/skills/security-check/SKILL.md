---
name: security-check
description: PR 을 내기 전에 이 저장소에서 보안이 깨지는 자리를 훑는다. "보안 점검", "PR 내기 전에 봐줘", "이거 위험한 데 없나", "/security-check" 가 트리거다. 내장 스킬 `security-review` 가 일반적인 취약점을 보는 것과 달리, 이 스킬은 이 저장소의 경계 다섯을 본다. 코드를 고치지 않고 보고만 한다.
---

# PR 을 내기 전의 보안 점검

내장 스킬 `security-review` 는 SQL 인젝션이나 시크릿 노출처럼 어느 저장소에나 있는 취약점을 본다.
그것으로 잡히지 않는 자리가 이 저장소에 다섯 있고, 여기서 보는 것이 그 다섯이다. **둘을 함께
돌린다.** 이 스킬이 일반적인 취약점을 대신 보지 않는다.

⚠ **고치지 않고 보고한다.** 보안 판단은 되돌리기 비싼 쪽이라 사람이 보고 정한다. 고칠 것을 찾으면
   무엇이 왜 위험한지와 고치는 방법을 적고 멈춘다.

## 무엇을 먼저 보는가

변경된 파일을 먼저 확인한다(`git diff --name-only origin/main...HEAD`). 아래 다섯 가운데 변경이
닿은 것만 보면 되고, 닿지 않은 축은 「해당 없음」으로 적는다.

## 경계 다섯

### 1. 행위자와 앱의 문 (`packages/access` · `apps/*/src/lib/action.ts` · `apps/web/src/lib/bearerActor.ts`)

데이터베이스는 이 질의가 누구의 것인지 모른다. 모든 요청이 앱마다 하나인 롤로 나가므로, 행 단위 판정을
빠뜨리면 받아 줄 두 번째 방어선이 없다. 그 판정이 첫 번째로 읽는 값이 `Actor` 다.

- 운영 코드가 `@<스코프>/access/testing/` 을 import 하는가. `operatorActor("1", { role: "admin" })` 한 줄이
  운영 테넌트의 관리자를 만든다.
- `as Actor` 가 `access/actorForApp.ts` 와 `testing/actor.ts` 밖에 나타나는가.
- 행위자를 만드는 함수를 새로 내보내는가. 운영에서 행위자가 생기는 길은 `actorForApp` 하나여야 한다
  (INV-ACCESS-04). 쿠키(`lib/auth.ts`)와 토큰(`lib/bearerActor.ts`)과 워크플로의 스텝(`actorForAccountId`)이 모두
  이 함수를 지난다.
- 권한 축(`role` · `tenantKind`)을 세션이나 토큰의 클레임이나 클라이언트 입력에서 읽는가. `org.membership` 에서
  읽은 값이어야 한다.
- `canEnterApp` 의 표(`access/membership.ts` 의 `APP_TENANTS`)를 고쳤는가. 새 종류에 문을 여는 줄이 들어왔다면 그것이
  첫 번째로 물을 것이다(INV-ACCESS-01). 모르는 앱을 허용으로 답하게 바꾼 것도 같은 무게다.
- `"use server"` 파일의 export 는 전부 공개 엔드포인트다. `appAction` 을 지나지 않은 export 가 있는가. 관문 밖의
  액션은 `actions/session.ts` 의 셋과 `apps/web/src/actions/consent.ts` 의 둘뿐이고 도메인 데이터를 만지지 않는다.
- 라우트 핸들러(`app/api/**/route.ts`)가 ① 입력 파싱 ② 행위자 확정을 **데이터에 닿기 전에** 지나는가. 라우트는
  관문이 없어서 손으로 지나야 한다.
- 미들웨어의 제외 목록(`BEARER_PATHS` · `matcher`)에 경로를 더했는가. 그 경로는 제 핸들러가 스스로 인증해야 한다.

`packages/access/src/access/boundary.test.ts` 가 행위자를 만드는 길을 기계로 잰다. 그 검사를 지웠거나 허용
목록에 줄을 더했으면 그것부터 묻는다.

### 2. 앱 롤의 GRANT (`supabase/migrations`)

앱의 롤(`web_app` · `agent_app`)은 `bypassrls` 라 **GRANT 가 유일한 경계**다. RLS 정책은 `deny_all` 이고 이 롤에게는
아무것도 막지 않는다.

- 새 표에 `enable row level security` 와 `deny_all` 정책이 함께 있는가.
- `org` 에 `grant select` 를 표 단위로 주는가. 컬럼을 열거해야 한다. 앱이 `org` 에 쓰기를 가진 칸은 계정의
  `auth_user_id` 하나뿐이다(INV-ACCESS-08).
- 한 앱이 쓰지 않는 스키마나 칸을 그 앱의 롤에 열었는가. 롤은 앱마다 따로다.
- 쌓이기만 해야 하는 표(`agent.message`)에 UPDATE 나 DELETE 를 주었는가. 그 표를 막는 트리거를 걷었는가(INV-AGENT-02).
- 마이그레이션에 `login` 이나 `password` 나 `bypassrls` 가 들어갔는가. 그 셋은 `supabase/seed.sql`(로컬)과
  Management API(원격)의 몫이다. 마이그레이션에 적으면 `schema_migrations.statements` 에 영구히 남는다.
- `config.toml` 의 `[api] schemas` 에 우리 스키마를 더했는가. 더하면 `pg` 직결 밖에 HTTP 로 닿는 길이 새로 생긴다.

### 3. 행 단위 술어 (`packages/<도메인>/src/rules` · 어댑터의 질의)

한 판정이 화면과 에이전트의 도구와 MCP 에 함께 걸린다(REQ-02).

- 새 조회가 도메인 술어를 지나는가. 어댑터의 SQL 이 술어와 같은 조건을 적고, 계약 테스트가 「질의 결과 = 술어의
  결과」를 대조하는가. 행을 읽는 포트를 더하면서 그 대조를 붙이지 않았으면 그것부터 묻는다.
- 볼 수 없는 행을 **거부가 아니라 부재**로 답하는가. 「볼 수 없다」고 답하면 그 행이 있다는 사실 자체가 새어 나간다.
- 쓰기가 보이는지만 재고 고칠 수 있는지를 재지 않는가. 보이는 것과 고칠 수 있는 것은 다른 물음이다(INV-NOTE-03).
- 상태를 바꾸는 쓰기가 열었을 때의 판을 `where` 에 거는가. 판정과 쓰기 사이에 끼어든 요청을 덮으면 안 된다.
- 테넌트나 쓴 사람을 입력(폼 · 도구 인자 · MCP 인자)에서 받는가. 행위자에게서 읽어야 한다. 입력으로 받으면 사람이나
  모델이 그 값을 지어낸다.

### 4. 워크플로의 경계 (`apps/agent/src/workflows`)

- 워크플로나 스텝이 행위자를 인자로 받는가(INV-AGENT-04). 계정 id 를 나르고 도메인에 닿는 스텝이 그 순간
  `actorForAccountId` 로 다시 세워야 한다. `workflows/boundary.test.ts` 를 고쳤으면 그것부터 묻는다.
- 도구가 그 사람의 술어를 지나는가. 도구라고 해서 화면보다 더 보면 안 된다.
- 실행 번호로 대화를 여는 자리(`/api/chat/[runId]` · 재접속 스트림 · 대화 화면)가 `canOpenConversation` · `canTalk` 을
  지나는가(INV-AGENT-01). 번호를 아는 사람이 남의 대화에 말을 싣지 못해야 한다.
- 스텝의 쓰기가 멱등인가(INV-AGENT-03). 다시 돈 스텝이 줄을 늘리거나 알림을 두 번 보내면 안 된다.
- 연습 모델 스위치(`AGENT_RUNNER=rehearsal`)가 배포 설정에 들어갔는가.

### 5. 밖으로 나가는 것과 밖에서 들어오는 것

되돌릴 수 없는 자리다.

- MCP(`/api/mcp`)가 토큰 없이 데이터에 닿는 길이 있는가. 401 에 `resource_metadata` 를 붙이는지, 토큰을
  `getUser(token)` 으로 확인하고 소속 판정을 다시 하는지 본다. 토큰을 직접 해독해 클레임을 믿으면 안 된다.
- 동의 화면(`/oauth/consent`)이 돌아갈 주소를 스스로 조립하는가. Supabase 가 준 주소를 그대로 써야 한다.
- 로그인 뒤 돌아갈 주소가 `safeRedirect` 를 지나는가(open redirect).
- `ALLOW_LOCAL_ACCOUNTS` · `EXPOSE_TESTING_API` 가 배포 환경변수에 들어갔는가. 앞의 것이 들어가면 시드 계정으로 누구나 들어온다.
- 사람이 적은 글이 밖으로 나가는 메시지(메일 · 슬랙)에 실릴 때 본문과 미리보기 **둘 다** 이스케이프를 지나는가.
- 비밀(게이트웨이 키 · DB 비밀번호)이 `NEXT_PUBLIC_` 이름을 달았는가. 그 이름은 브라우저 번들에 박힌다.

## 보고하는 방법

경계마다 한 줄로 적는다. 찾은 것은 **어디가 어떻게 뚫리는지**를 재현 가능한 문장으로 쓰고, 고치는
방법을 함께 제안한다. 「위험해 보인다」로 끝내지 않는다.

```
1. 행위자    이상 없음
2. GRANT     notes.note 에 web_app 의 DELETE 를 주었다. 보관을 우회해 지우는 길이 생긴다. 새 마이그레이션에서 걷을 것
3. 술어      해당 없음 (조회를 더하거나 고친 변경이 없다)
4. 워크플로  이상 없음
5. 밖        해당 없음
```

⚠ **「이상 없음」과 「해당 없음」을 구분한다.** 보고도 안 했는데 초록으로 읽히면 이 점검이 하는 일이
   없다.
