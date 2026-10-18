# Supabase 마이그레이션 — 정본과 절차

> resolv-ai 에서 2026-09-04 에 세운 절차를 옮겨 왔다. 그쪽의 prod 이력과 도메인의 사정은 걷어 냈다.

## 1. 출발점은 네 파일이다

| 파일 | 무엇 |
|---|---|
| `20260929000000_create_app_roles.sql` | 앱의 접속 롤 둘(`web_app` · `agent_app`)의 이름만 만든다 |
| `20260929000100_create_org_schema.sql` | 테넌트 · 계정 · 멤버십. 앱의 문이 여기서 열린다 |
| `20260929000200_create_notes_schema.sql` | 예시 도메인의 쪽지. 새 제품에서 바꾸거나 걷는다 |
| `20260929000300_create_agent_schema.sql` | 에이전트와 나눈 대화의 장부 |

⚠ **한 번 어디에든 적용한 파일은 고치지 않는다.** 바꿀 것이 생기면 아래 §2 의 절차로 새 파일을 더한다. 이미
적용된 판을 고치면 원격과 로컬이 같은 판 번호로 서로 다른 스키마를 갖게 되고, 그 차이를 알려 주는 것이 없다.
스캐폴드에서 막 만든 새 저장소라서 아직 어디에도 적용하지 않았다면 예시 도메인 파일은 통째로 바꿔도 된다.

## 2. 스키마 워크플로 — **마이그레이션은 손으로 쓴다** (2026-09-09 확정)

- 정본은 **`supabase/migrations/`** 하나다. 파일 안에 주석으로 의도를 적는다.
- **`supabase/schemas/` 를 만들지 말 것.** 그 디렉터리가 생기거나 `config.toml` 에 `schema_paths` 가 들어가는 순간
  선언적 워크플로로 뒤집혀 정본이 둘로 갈린다.

### 일상 플로우

```bash
supabase start                              # 로컬 스택 (docker). 정지는 `supabase stop --no-backup`

# ① 껍데기를 만든다 — 파일명·타임스탬프는 CLI 가 붙인다
supabase migration new <설명적_이름>

# ② 파일에 SQL 과 의도 주석을 손으로 적는다 (§8 규약)

# ③ 빈 DB 부터 전부 재생해서 실제로 도는지 확인한다 — 로컬에 적용하는 유일한 경로
supabase db reset

# ④ 진단과 확인
supabase db advisors                        # CLI ≥2.81.3 / 없으면 MCP get_advisors
supabase migration list --local
```

판 번호가 겹치는지는 `npm run check:migrations -w @hathway/shared` 가 본다. 두 사람이 다른 가지에서 같은
시각을 고르면 합쳐지는 날에야 드러나는 고장이라, `turbo test` 에 물려 있다.

### 왜 `db pull` / `db diff` 를 쓰지 않는가

종전(2026-09-04)에는 로컬 DB 에 `db query` 로 먼저 적용하고 `supabase db pull <이름> --local` 로 파일을 **받아 적는** 절차였다.
2026-09-09 에 손으로 쓰는 쪽으로 확정했고, 근거는 다음과 같다.

- `db pull` 은 *DB 에 이미 일어난 변경을 덤프하는* 도구다. 그러려면 대시보드·MCP·`db query` 로 스키마를 먼저 고쳐야 하고,
  그 순간 "무엇을 왜 바꿨는가" 가 파일 밖에 있게 된다. 덤프가 쓴 파일에는 주석·순서·의도가 없다.
- `db query` 는 한 호출에 한 문장만 받아(`cannot insert multiple commands into a prepared statement`) DDL 여러 줄을
  반복 적용하기에 불편하다.
- 파일을 먼저 쓰고 `db reset` 으로 검증하면 "파일이 곧 사실" 이 된다. 받아 적는 절차에서는 DB 가 사실이고 파일은 사본이었다.

pg-delta 엔진이 COMMENT·GRANT·기본 권한을 전부 받아 적기는 하므로, `db pull` 을 버리는 이유는 결과물의 누락이 아니라
**절차의 방향**이다.

⚠ **로컬 DB 에 MCP `apply_migration` 을 쓰지 말 것.** 호출마다 이력 행이 생겨 `db reset` 없이는 반복이 불가능해진다.
원격에도 MCP `apply_migration` 을 쓰지 않는다. 원격에 가는 변경도 `supabase/migrations/` 의 파일을 거친다.

## 3. 원격 프로젝트는 아직 없다

원격 Supabase 프로젝트는 아직 세우지 않았다. 세울 때는 빈 프로젝트에 `supabase link` 뒤 `supabase db push` 로
§1 의 파일부터 차례로 적용한다. 원격에 이력이 없으므로 베이스라인을 뽑아 맞출 일이 없다.

- 앱 롤(`web_app` · `agent_app`)의 LOGIN · BYPASSRLS · 비밀번호는 push 가 넣지 않는다. Management API 로 따로 넣는다(§6).
- OAuth 서버(`[auth.oauth_server]`)는 원격 대시보드의 Authentication → OAuth Server 에서 켜고, 동의 경로를
  `https://<web 호스트>/oauth/consent` 로 적는다. 켜지 않으면 MCP 클라이언트가 토큰을 얻지 못한다.
- `[db] major_version` 을 원격의 실측값과 대조한다(§4).
- `supabase db push --dry-run` 이 적용할 것을 먼저 확인한다. 기대한 파일 밖의 것이 나열되면 멈춘다.

## 4. 로컬 개발

```bash
supabase start          # docker 필요
supabase status         # anon / service_role 키
supabase db reset       # 마이그레이션 전량 재생 + seed
supabase stop
```

포트: API 54361 / DB 54362 / Studio 54363 / Mailpit 54364. web 앱의 4400(e2e 4401)과 agent 앱의 4410(e2e 4411)과
겹치지 않는다.

`[db] major_version = 17` 은 원격 프로젝트를 세우면 그 값과 다시 대조한다. ⚠ 추측하지 말 것. 어긋나면
"로컬은 되는데 원격에서 깨지는" 1순위 원인이다.

앱을 로컬 DB 로 돌리려면 앱마다 `.env.example` 을 복사한다
(`next dev` 에서 `.env.development.local` > `.env.local`, `.gitignore` 의 `.env*` 가 커버).

```
cp apps/web/.env.example apps/web/.env.development.local
cp apps/agent/.env.example apps/agent/.env.development.local
```

앱 롤의 로컬 비밀번호는 `supabase/seed.sql` 이 넣는다. 같은 파일이 시드 계정에 **로그인 비밀번호**도
넣으므로(모두 `hathway-local`), 화면을 눈으로 보려면 `kim@example.test`(web) 나 `ops@example.test`(agent)로 들어간다.

계약 테스트(`packages/adapters-postgres`)는 `WEB_DATABASE_URL` · `AGENT_DATABASE_URL` 로 **앱의 롤**이 되어 붙고, 앱 롤로
심을 수 없는 행만 `OWNER_DATABASE_URL`(소유자 롤)로 심는다. 세 값 모두 그 패키지의 `vitest.config.ts` 가 로컬 기본값으로 깐다.

### 시드

`[db.seed]` 는 `./seed.sql` 과 `./seeds/*.sql` 을 그 차례로 돌린다. `seed.sql` 이 테넌트 · 계정 · 멤버십 · 로그인 비밀번호 ·
앱 롤의 접속 속성을 세우고, `seeds/10-notes.sql` 이 예시 도메인의 쪽지를 심는다. 도메인이 늘면 `seeds/20-<도메인>.sql`
처럼 번호를 붙여 차례를 드러낸다.

⚠ **id 는 고정이다.** 계약 테스트와 e2e 와 테스트 전용 행위자(`packages/access/src/testing/actor.ts`)가 그 값을 든다.
⚠ **e2e 가 단언할 판정의 갈래를 한 벌씩 심는다.** 보여야 하는 것과 보이면 안 되는 것이 둘 다 있어야 화면이 판정을
   드러내는지를 잰다. 상태를 바꾸는 스펙은 제 행을 새로 만들어 쓰고 시드의 행을 고치지 않는다.
⚠ 시드는 `db reset` 과 첫 `start` 에서만 돈다. 원격에는 가지 않으므로 비밀번호를 여기 두는 것이 안전하다.

## 5. `docs/<기능>/sql/` 과의 관계

이 저장소에는 `docs/<기능>/sql/` 이 없다. 적용할 SQL 은 `supabase/migrations/` 에만 두고, 설계와 맥락은
그 파일의 머리 주석이나 `docs/` 의 산문에 적는다. SQL 파일을 `docs/` 아래에 따로 두지 않는다.

## 6. 시크릿

`apply_migration` 은 statements 를 `schema_migrations` 에 **평문 저장**하고,
마이그레이션 *파일* 은 거기에 더해 **git 에도 커밋된다**.

`alter role … with password …` 같은 문장은 마이그레이션에 두지 않는다.
Management API(`POST /v1/projects/<ref>/database/query`)로 별도 적용하고 파일엔 주석만 남긴다.
`20260929000000_create_app_roles.sql` 이 이름만 만들고 LOGIN · BYPASSRLS 를 로컬은 `seed.sql` 에, 원격은
Management API 에 맡기는 것이 그 본보기다.

## 7. 금지 목록

- ❌ `supabase db reset --linked` — 로컬과 같은 동사인데 **원격 DB 를 지운다**.
  원격 DB 비밀번호를 셸 프로필에 export 하지 말 것.
- ❌ 원격에 `migration repair --status reverted`. 그 명령은 이력 행을 지운다.
- ❌ 로컬 DB 에 `apply_migration`.
- ❌ 마이그레이션 파일명 임의 작명.
- ❌ `supabase/schemas/` 신설 (선언적 워크플로로 뒤집힌다).
- ❌ 시크릿이 든 마이그레이션 커밋.
- ❌ 이미 적용한 마이그레이션 파일 수정 (§1).

## 8. 스키마 설계 규약 (신규 테이블)

`.claude/skills/supabase-postgres-best-practices` 기준.

- PK: `bigint generated always as identity`. 밖에서 id 가 오는 자리(대화의 워크플로 실행 번호)만 그 값의 타입을 따른다.
  다른 타입의 표와 FK 로 엮이는 경우에는 상대 타입을 따라간다.
- 타입: `int`→`bigint`, `varchar(n)`→`text`, `timestamp`→**`timestamptz`**, 금액은 `float` 금지 → `numeric`.
- 식별자: 전부 소문자 snake_case. 따옴표 식별자 금지.
- **모든 FK 에 인덱스**를 같이 만든다 (Postgres 는 자동 생성하지 않는다).
- 복합 인덱스는 등치 컬럼 먼저, 범위 컬럼 마지막.
- **RLS 정책에 쓰이는 컬럼에 인덱스**를 반드시 건다.
- RLS 는 `using ((select auth.uid()) = user_id)` — `select` 로 감싸면 행마다 호출되지 않는다(대형 테이블 100x+).
- UPDATE 정책은 `USING` + `WITH CHECK` **둘 다**. 없으면 소유자 재할당이 가능하다.
- 뷰는 기본적으로 RLS 를 우회한다 → `create view … with (security_invoker = true)`.
- 인가 판정에 `user_metadata` 를 쓰지 말 것(사용자가 편집 가능) → `app_metadata`.
- `ADD CONSTRAINT IF NOT EXISTS` 는 **없는 문법**이다. 멱등이 필요하면 `do $$ … pg_constraint 조회 … $$`.

## 9. 스키마와 앱의 롤

스키마는 업무 영역으로 이름 짓는다. 지금은 테넌시의 `org`, 예시 도메인의 `notes`, 대화 장부의 `agent` 셋이다.
업무 영역 안의 갈래는 스키마가 아니라 컬럼이다.

- **접근 모델.** anon · authenticated 에는 스키마 USAGE 를 주지 않고, 표마다 RLS 와 `deny_all` 정책을 붙이며,
  GRANT 는 `service_role` 과 앱의 롤에만 준다. 권한 판정은 서버 액션 안의 도메인 함수가 한다.
- **앱의 롤은 `bypassrls` 다.** 그래서 `deny_all` 은 아무것도 막지 않고 **GRANT 가 유일한 경계**다. `org` 에는 컬럼 단위로
  SELECT 만 주고(예외 둘. 계정의 `auth_user_id` UPDATE 는 처음 로그인한 사람이 자기 계정과 세션을 잇는 자리이고,
  web_app 의 계정 `email` · `name` INSERT · `name` UPDATE 와 멤버십 INSERT · `role` · `active` UPDATE 는 설정의 팀 화면이다),
  도메인 스키마에는 표마다 필요한 동사만 준다. 쌓이기만 하는 기록(`agent.message`)은 INSERT 까지만 주고 트리거가
  고치고 지우는 것을 한 번 더 막는다(INV-AGENT-02). 롤은 앱마다 하나다
  (`docs/decisions/D-2026-09-14-31.md` · `D-2026-09-09-06.md`).
- ⚠ **`config.toml` 의 `[api] schemas` 에 우리 스키마는 없다.** 앱이 PostgREST 가 아니라 `pg` 로 직결하므로
  Data API 에 낼 이유가 없고, 노출하지 않는 편이 위 접근 모델과 맞는다(`docs/decisions/D-2026-09-09-05.md`).
  되돌려 넣지 말 것. (다른 스키마를 노출할 때의 규칙: ⚠ 노출은 스키마를 만드는 마이그레이션과 **한 커밋**이어야
  한다. 스키마 없이 노출만 있으면 PostgREST 가 503 을 내고 `supabase start` 가 실패한다. 실측이다.)
- `service_role` 은 LOGIN 속성이 없어 `pg` 로 붙지 못한다. 앱은 자기 롤로만 붙는다.
- `supabase stop` 은 기본으로 DB 볼륨을 **백업**하고 다음 `start` 가 그것을 **복원**한다. 그 경로에서는 마이그레이션이 다시
  적용되지 않으므로, 그사이 마이그레이션 파일이 늘었으면 새 표가 DB 에 없다. 재생을 확인하려면 `supabase db reset` 을
  돌리거나 `supabase stop --no-backup` 뒤 `start` 한다.
- 클라우드 개발 컨테이너에는 도커 데몬이 기본으로 떠 있지 않다. `nohup dockerd &` 로 직접 띄우면 로컬 스택이 돈다.
