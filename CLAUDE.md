@AGENTS.md

# Hathway

기업 투자 분석. 교재의 방법론과 DART 공시 · 재무 데이터로 종목을 읽고 적정주가를 계산한다. 그 분석은 ChatGPT 앱
「Hathway 기업분석」의 대화에서도 돈다(`chatgpt-plugin-launch`).

이 저장소는 둘을 함께 담는다. 코드(`apps/*` · `packages/*` · `supabase/`)의 규약은 이 문서가, 교재 · 강의 · 리서치 · 적재
파이프라인의 규약은 위에서 읽어 들인 `AGENTS.md` 가 갖는다. 2026-10-18 에 코드를 스캐폴드(`tyohnn/scaffold`) 위로 옮겼고,
스캐폴드와 다른 자리는 `docs/개발-방법론.md` 「이 저장소만의 자리」에 있다.

앱 둘(`apps/web` · `apps/agent`)과 그것이 딛는 패키지가 서 있다. 시장 화면(종목 · 부동산 · 산업 지도 · 리서치 보드)은 옛
hathway 에서 옮긴 것이고, 예시 도메인 `notes` 와 홈은 스캐폴드의 본보기를 그대로 들고 왔다. 교재 읽기 화면은 옮기지 않았다
(`교재/` 폴더는 그대로 있다).

플러그인 모듈(`modules/plugin`)은 2026-10-18 에 기업분석의 도구 열둘과 화면 여덟으로 다시 짰다. 흐름표와 시나리오와 화면 짜임은
`docs/plugin/` 에 있고, 위젯을 눈으로 보는 자리는 개발 서버의 `/mock/plugin` 이다(프로덕션에서는 404).

## 개발 과정

작업 요청은 모두 아래 일곱 단계를 지납니다(dev-playbook 에서 들여옴). 묻기만 하는 질문은 0단계를 건너뜁니다. 단계를
건너뛰었으면 PR 본문에 어느 단계를 왜 건너뛰었는지 적습니다. 1 · 2단계의 자세한 것은 바로 아래 「작업 순서」입니다.

### 0. Linear 이슈부터

- 팀 `Pax Humana`(키 `SSO`)의 프로젝트 「Hathway 런칭」에서 **이어지는 이슈가 있는지 먼저 찾고**, 없으면 만듭니다. 이슈는 감사 기록이라 코드가 아닌
  일(설정 · 문서와 규약 · 외부 서비스 설정과 그 결정)도 남깁니다. 이미 끝난 일이면 사후에 만들어 Done 으로 둡니다.
- 요청은 **하위 이슈 하나가 PR 하나**가 되도록 나눕니다. 나누는 기준과 읽는 법은 `docs/dev/issue-tracking.md` 에 있습니다.
- 시작하면 In Progress 로 옮기고 담당자를 요청한 사람으로 둡니다. `needs-answer` 가 붙었으면 답이 다 달린 뒤에 시작합니다.

### 1. 테스트 이름부터

되돌리기 비싼 것은 `it(...)` 목록과 공개 인터페이스를 먼저 보이고 확인받습니다(「작업 순서」 1 · 2번, `spec-by-test`).
화면 배치와 문안처럼 되돌리기 싼 것은 바로 만들고, 디자인이 정해질 때까지는 로컬 사진과 목업으로 보이고 push 하지 않습니다.

### 2. 구현

「작업 순서」 3~7번대로 빨간 테스트 하나씩 세우며 고칩니다. 커밋은 책임 하나이고 **로컬에 모읍니다.** 작업 중에는 push 하지 않습니다.

### 3. 로컬에서 모든 테스트

```
npx supabase start
npm run pr:check
```

- `pr:check`(`scripts/pr-check.mjs`, 설정은 `scripts/pr-check.config.mjs`)는 `origin/main` 과 견줘 바뀐 패키지를 고르고,
  typecheck · 단위와 계약 테스트 · build · **바뀐 코드에 닿는 e2e 스펙** · 화면 글 스캔 · 아이콘 직접 import 검사를 돌린 뒤
  결과 표를 `.pr-check/result.md` 에 남깁니다. `vercel build` 칸은 Vercel 프로젝트를 잇기 전까지 「이 저장소는 쓰지 않음」입니다.
- GitHub Actions 는 tyohnn 저장소에서 돌지 않습니다(과금). 그래서 push 전의 게이트는 이 단계입니다.
- e2e 는 바뀐 화면에 닿는 스펙만 돕니다(`scripts/e2e-select.mjs`). 넓게 바뀌었거나 머지 전에 한 번 더 볼 때는
  `npm run pr:check -- --e2e full` 입니다. 같은 코드로 다시 부르면 통과한 앱은 건너뛰고 실패만 다시 돕니다(`--fresh` 로 처음부터).
- ⚠ e2e 포트(4400 · 4401 · 4410 · 4411)에 개발 서버가 떠 있으면 먼저 내립니다. `pr:check` 가 막습니다.
- 바뀐 동작은 프로덕션 빌드에 시드 계정으로 들어가 직접 누르고 사진을 찍습니다. 절차는 `docs/dev/local-verification.md` 에 있습니다.
- 실패가 이번 변경 때문이면 고칩니다. 아니면 `main` 에서도 빨간지 확인한 뒤 표에 「남의 빨강」과 그 까닭을 적습니다.
  **빈칸이나 까닭 없는 「못 돌림」은 두지 않습니다.** 못 돌린 칸은 `npm run pr:check -- --skip e2e="까닭"` 처럼 남깁니다.
- 결과는 **진행 도식으로도 스레드에 붙입니다.** `progress-board` 스킬대로 `.pr-check/progress/<이슈 키>.json` 에 옮기고 그린 SVG 를 올립니다.

### 4. 규약 점검

PR 을 열기 전에 아래를 모두 봅니다. 만든 대화를 모르는 새 눈이 보도록 **서브에이전트에게 볼 범위만 넘기고** 설계 의도는
넘기지 않습니다. 셋은 함께 띄웁니다.

| 칸 | 누가 보나 | 언제 |
|---|---|---|
| 보안 | `security-check` + 내장 `/security-review` | 늘 |
| 구조 · 컴포넌트 · 블록 · 정적 껍데기 · 클린 코드 | 서브에이전트 `convention-reviewer` | 코드가 바뀌면 |
| 화면 글 | `ux-writing` 을 읽고 서브에이전트 `ux-writing-reviewer` | **화면 · 메일 · 알림 문안이 바뀌면 반드시** |

`✗` 지적은 고치고 3단계를 다시 지납니다. `△` 는 고치거나, 두는 까닭을 PR 본문에 한 줄로 적습니다.

### 5. PR 은 한 번에

- 3 · 4단계가 끝난 뒤 `main` 을 로컬에서 한 번 받고 **한 번만 push** 합니다. base 는 `main` 이고 **초안**으로 엽니다.
- 본문은 `.github/pull_request_template.md` 를 채우고, 「검증」에 `.pr-check/result.md` 의 표와 4단계의 칸별 결과 한 줄을 붙입니다.
  「Why?」 첫 줄은 `Linear: SSO-123` 입니다. 스레드에도 같은 표와 진행 도식과 화면 사진을 올립니다.
- ⚠ **이 저장소는 공개다.** 사진과 본문에는 시드의 합성 데이터만 싣고, 비밀값 · 원격 주소 · 사람의 메일을 싣지 않습니다.
- Linear 이슈를 In Review 로 옮기고 PR 링크를 답니다. **머지는 사람이 확인한 뒤에** 합니다. 리뷰에서 고칠 것이 나오면 모아서 3 · 4단계를 다시 지나고 한 번 더 push 합니다.
- 첫 push 뒤에는 충돌이나 마이그레이션 · 불변식 번호가 겹칠 때만 `main` 을 다시 받습니다. 마이그레이션을 더한 PR 은
  머지 직전에 번호를 `main` 의 맨 뒤로 보냅니다(`docs/dev/migrations.md`).

### 6. 끝

머지되면 Linear 이슈를 Done 으로 옮기고, 하위 이슈의 형제가 모두 Done 이면 부모도 옮깁니다. 도식의 머지 칸을 채워 한 번 더 올립니다.

⚠ **아이콘은 `@hathway/ui/icons` 의 의미 이름을 먼저 씁니다.** 화면에서 `lucide-react` · `@hugeicons/*` 를 직접 import 하지 않고,
맞는 이름이 없으면 디자인 시스템에 이름을 더하는 일로 따로 올립니다. 옮겨 온 시장 화면은 `@phosphor-icons/react` 를 직접 부르는 자리가
남아 있습니다(`docs/개발-방법론.md` 「스캐폴드와 다른 자리」).

## 작업 순서

코드를 쓰기 전에 아래를 지납니다. 각 줄의 자세한 규약은 가리키는 곳에 있고 여기에 옮겨 적지 않습니다.
두 곳에 적으면 한쪽만 고치는 날이 옵니다.

1. **되돌리기 비용부터 봅니다.** 화면 배치와 문안처럼 되돌리기 싼 것은 바로 만듭니다. 문을 여는 판정과
   행 단위 판정과 상태 전이와 스키마와 밖으로 나가는 알림은 아래를 전부 지납니다. 기준은
   `.claude/skills/spec-by-test/SKILL.md` 에 있습니다.
2. **테스트 이름을 먼저 짓고 확인받습니다.** `it(...)` 목록과 그것이 붙을 공개 인터페이스를 적어
   사용자에게 보입니다. **테스트 이름이 도메인 규칙의 정본입니다.**
3. **빨간 것을 먼저 세웁니다.** 테스트 하나를 실패시키고 그것만 지나가도록 고치는 일을 되풀이합니다.
   테스트를 몰아 쓰고 구현을 몰아 쓰지 않습니다. 절차는 `.claude/skills/tdd/SKILL.md` 에 있습니다.
4. **판정은 순수 함수에 둡니다.** 도메인 패키지의 순수 규칙이 먼저 서고, 그것이 데이터베이스 없이 도는
   층을 만듭니다.
5. **포트와 어댑터는 다른 커밋입니다.** 포트는 `query(sql)` 같은 범용이 아니라 연산별 메서드로 나눕니다.
   계약 테스트 한 벌이 메모리 구현과 Postgres 구현을 함께 잽니다.
6. **의존은 한 방향입니다.** 앱이 도메인 패키지를 부르고 도메인 패키지가 `shared` 를 부릅니다. 도메인
   패키지에는 effect 밖의 런타임 의존을 넣지 않습니다.
7. **커밋은 책임 하나입니다.** 순서는 도구, 의존성, 패키지 골격, 도메인과 포트, 어댑터, 앱 배선, 인프라,
   문서입니다. 문서는 코드와 같은 커밋에 넣지 않습니다. 저장소의 첫 커밋도 이 순서로 나눕니다.
8. **고친 뒤에 돌립니다.** 아래 「자기 검증」의 명령을 지납니다.

⚠ **건너뛰기 쉬운 자리가 둘입니다.** 간단해 보이는 변경과, 테스트가 아직 없는 파일을 고치는 때입니다.
둘 다 3번을 생략하게 만드는데, 그렇게 들어간 판정은 나중에 아무도 다시 재지 않습니다.

개발 방법론의 정본은 `docs/개발-방법론.md` 입니다. 스택과 금지 목록, 서버 액션의 여섯 단계, 테스트 3층,
패키지 의존 방향, DB 접근 모델, 커밋 축이 모두 거기에 있습니다.

## 스택

| 자리 | 선택 |
|---|---|
| 모노레포 | npm workspaces + **Turborepo** |
| 앱 | **Next.js 16.3** App Router · `cacheComponents` · 서버 액션으로 완결(별도 API 서버 없음) |
| 도메인 | `packages/<도메인>` · **effect v4** 의 `Context.Service` 포트와 `Layer` 어댑터 |
| 검증 | Effect `Schema`(zod 는 Workflow 훅의 스키마에만) |
| DB | **Supabase** 로컬 도커 · 손으로 쓴 마이그레이션 · 스키마로 도메인을 나눈다 · 앱은 `pg` 직결 |
| 인증 | Supabase Auth. 로컬은 이메일/비밀번호, 배포는 구글. MCP 는 Supabase **OAuth 2.1** |
| 모델 | **Vercel AI SDK** v7 + **AI Gateway** |
| 에이전트 | **Workflow DevKit** + `WorkflowAgent`. 대화 하나가 durable 한 실행 하나 |
| UI | **tyohnn** 디자인 시스템(`packages/ui`) + 블록 층(`packages/blocks`). shadcn · Base UI |
| 테스트 | vitest 4 + `@effect/vitest`(단위 · 계약) · Playwright(e2e) · web 은 에이전트 e2e(`e2e`)를 나란히 둔다 |

## 플랫폼 계층

앱은 **누가 보는가(audience)** 로 나눕니다. 인증과 호스트와 내비게이션과 데이터 범위가 통째로
달라지는 경계가 audience 이고, 그것만이 앱을 나눌 자격을 갖습니다. 업무 영역은 앱 안의 전환입니다.

| 앱 | 쓰는 사람 | 보는 범위 | 포트 |
|---|---|---|---|
| **`web`** | 고객(`customer`)과 운영팀(`operator`), 그리고 로그인하지 않은 방문자 | 시장 화면(종목 · 부동산 · 산업 지도 · 리서치 보드)은 **로그인 없이 읽고** 보드의 쓰기만 로그인 뒤다. 자기 테넌트의 쪽지와 설정. 공개 화면(블로그 · 문서 · 새 소식 · 약관)과 MCP(`/api/mcp`)도 여기 하나다 | 4400 |
| **`agent`** | 운영팀(`operator`) | 자기가 연 에이전트 대화. 도메인 데이터는 도구를 지나서만 닿는다 | 4410 |

- **소속 판정은 `packages/access` 의 `canEnterApp` 하나입니다.** 앱이 자기 이름을 넘기면 그 앱을 여는 **테넌트
  종류**의 표(`access/membership.ts` 의 `APP_TENANTS`)가 답합니다. 플래그를 더하지 않습니다. 근거는
  `docs/decisions/2026-09-16-앱의-문은-테넌트-종류가-연다.md` 에 있습니다.
- ⚠ **모르는 앱은 거절합니다.** 새 앱이 서면 그 표와 `AppAudience` 에 줄을 더하는 것이 그 앱의 첫 작업입니다.
- **앱은 UX 경계이지 보안 경계가 아닙니다**(REQ-06). 행 단위 판정은 도메인 패키지의 술어 하나가 하고, 화면과
  에이전트의 도구와 MCP 가 그 술어를 함께 지납니다(REQ-02).
- 인증은 세 계층입니다. 세션(미들웨어 · 관문) → 소속(`canEnterApp`) → 행(도메인 술어). 실패하면 각각 `/login` ·
  `/no-access` · **부재**(목록에서 빠지고 상세는 404)로 갑니다.

## 워크스페이스

| 워크스페이스 | 스택 | 비고 |
|---|---|---|
| `apps/web` | Next 16.3 + MDX | 시장 화면(`(market)`: `/stocks` · `/real-estate`, `/` 는 `/stocks` 로 간다) · 쪽지 화면 · 로그인 · 공개 화면(`(site)`: 블로그 · 문서 · 새 소식 · 약관, 글은 `src/content/` 의 MDX) · MCP(`/api/mcp` · `/.well-known/oauth-protected-resource` · `/oauth/consent`). 포트 4400 |
| `apps/agent` | Next 16.3 + Workflow | 에이전트와의 대화. `src/workflows/chat.ts` 가 본체다. 포트 4410 |
| `packages/access` | effect v4 | 테넌트 · 계정 · 멤버십으로 앱의 문을 판정합니다. `Actor` 와 `canEnterApp`, 팀 관리의 판정(`access/team.ts`)과 포트(`TeamDirectory`)가 여기 있습니다 |
| `packages/market` | effect v4 | 시장 데이터의 조회. 포트 넷(`CompanyDirectory` · `FinancialPeriods` · `FilingLedger` · `FilingDocuments`)과 접고 고르는 규칙(`rules/`). 표는 `public` 의 적재 표다 |
| `packages/research` | effect v4 | 리서치 보드. 보드의 타입과 순수 규칙(누가 고치고 지우는가 · 판 대조 · 새 보드)과 포트(`BoardStore`) |
| `packages/schema` | zod | 적재(`platform/ingest`)와 화면이 함께 쓰는 행의 계약과 표기 · 분류(KSIC · 밸류체인) |
| `packages/notes` | effect v4 | **예시 도메인.** `notes` 스키마의 타입과 순수 규칙(`canSeeNote` 등)과 포트 |
| `packages/agents` | effect v4 | `agent` 스키마의 타입과 순수 규칙(`canOpenConversation` 등)과 포트. 대화의 장부 |
| `packages/adapters-postgres` | effect v4 + `pg` | 도메인 포트의 Postgres 구현(`market/` · `research/` 등). 전송은 `src/connection.ts` 하나입니다 |
| `packages/adapters-storage` | effect v4 | Supabase Auth 설정을 읽는 어댑터와, 공시 본문 조각을 Storage 에서 읽는 어댑터(`FilingDocumentsSupabase`) |
| `packages/analytics` | effect v4 | 제품 분석. 보낼 수 있는 이벤트의 카탈로그와 동의의 순수 규칙(`planCapture`)과 포트(`EventSink`) |
| `packages/preferences` | effect v4 | 사람이 조직 안에서 고른 설정. `preferences` 스키마의 타입과 순수 규칙(어느 칸을 어떤 값으로 고칠 수 있는가 `planPreferenceUpdate`)과 포트. 플러그인의 설정 화면이 읽고 쓴다 |
| `packages/adapters-posthog` | effect v4 + `posthog-node` | 이벤트 창구의 PostHog 구현과 키 없이 도는 연습 창구. posthog-node 는 여기에만 있다 |
| `packages/ui` | React + shadcn(Base UI) | 컴포넌트 · 3층 CSS · 블록(`src/blocks`)을 **tyohnn 에서 받아 둔 자리**입니다. 손으로 고치지 않습니다 |
| `packages/blocks` | React | 블록 층(앱 셸 · 목록 · 대화 · 로그인 판 · 노션 같은 블록 편집기 등). 규약은 `packages/blocks/CLAUDE.md` |
| `packages/shared` | raw TS | 도메인이 아닌 공용 모듈과 불변식의 공통 타입, 저장소 검사 스크립트 |

저장소의 나머지(`교재/` · `강의/` · `리서치/` · `research/` · `textbook-plan/` · `platform/ingest/` · `plugins/investment-analyst/` · 루트 `scripts/` 의
자막 파이프라인)는 `AGENTS.md` 가 다룹니다.

## 스킬

`.claude/skills/` 에 스킬이 있습니다. 33종은 resolv-ai 와 같은 벌이고 출처와 해시는 루트 `skills-lock.json` 이
고정합니다. `ux-writing` 은 이 스캐폴드에서 세운 화면 글의 규약입니다. 잠금에 없는 것(`spec-by-test` · `tdd` · `security-check` · `fluent-korean` 등)은 resolv-ai 에서 쓴 것이고,
그 가운데 저장소의 경로를 가리키는 `spec-by-test` · `security-check` 는 이 스캐폴드의 경로로 맞춰 두었습니다.
모듈이 들여온 스킬은 그 모듈과 함께 들어오고 나갑니다(`modules/<이름>/owns.json` 의 `skills`).

- **모듈을 나중에 붙이거나 뗄 때는 `/scaffold-add <모듈>` · `/scaffold-remove <모듈>` 입니다.** 원본 경로와 이 저장소를
  만든 설정(이름 · 포트 · 켠 모듈)은 루트 `scaffold.json` 에 있습니다. 스크립트가 원본에서 기준 둘을 찍어 차이를 옮기고,
  붙지 않은 자리는 에이전트가 그 모듈의 `wiring.md` 를 보고 풉니다.
- **복제한 화면을 제품에 맞출 때는 `/scaffold-fit` 입니다.** 만든 직후의 첫 일이고, 제품이 자라 화면 구조를 다시 짤 때도
  부릅니다. 고칠 화면 모듈은 먼저 제품 코드로 편입합니다(원본의 `scripts/module-adopt.mjs`). 편입한 모듈은 `scaffold.json` 의
  `adopted` 에 남고, 그 뒤로는 `/scaffold-add` · `/scaffold-remove` 가 다루지 않습니다.
- **공개 화면을 검색과 AI 답변에 드러낼 때는 SEO 세 스킬을 읽습니다.** `seo`(addyosmani/web-quality-skills)는 robots · sitemap · canonical · 제목과 설명 같은 기술 SEO 이고,
  `ai-seo`(coreyhaines31/marketingskills)는 AI 검색이 인용하기 좋은 글의 짜임과 AI 크롤러 · `llms.txt` 를 다룹니다(GEO).
  `schema`(같은 저장소)는 schema.org JSON-LD 입니다. 셋 다 잠금에 있습니다. Next 의 파일 규약(`sitemap.ts` · `robots.ts` · `opengraph-image`)은 `next-best-practices` 가 맡습니다.

- **화면 구조(라우트 그룹 · 목록 · 상세 · 탭 · 시트 · 다이얼로그 · 메뉴)를 정할 때는 `ia-design` 을 읽습니다.** 모양은 tyohnn 이,
  무엇이 어느 화면 · 어느 그릇에 서는지는 이 스킬이 맡습니다. 차례는 핵심 루프 → 객체 → 라우트 → 그릇이고, 검색 · 탐색형 제품은
  분류 체계와 공개 주소를 더 정합니다. `/scaffold-fit` 2번의 지도도 이것으로 그립니다.
- **ChatGPT 플러그인 제품을 처음부터 출시까지 세울 때는 `chatgpt-plugin-launch` 를 따릅니다.** 오픽뉴런과 한글파일럿에서
  실제로 밟은 순서(기획 · 출시 전 · 제출)와 함정을 단계마다 적은 체크리스트이고, 긴 설명은 그 폴더의 `references/` 에 있습니다.
- **기능을 만들기 전에는 `spec-by-test` 를 읽습니다.** 그다음 `tdd` 로 넘어갑니다.
- **PR 을 내기 전에는 `security-check` 를 돌립니다.** 일반적인 취약점은 내장 스킬 `security-review` 가 보므로 둘을
  함께 돌립니다.
- 코드 작업에서 자주 쓰는 것: `effect-ts`, `next-best-practices`, `next-cache-components`, `shadcn`, `supabase`,
  `supabase-postgres-best-practices`, `vercel-react-best-practices`, `vercel-composition-patterns`, `webapp-testing`,
  `ai-sdk`, `e2e-testing-patterns`.
- **화면의 글(단추 · 라벨 · 설명 · 빈 화면 · 오류)을 쓸 때는 `ux-writing` 을 읽습니다.** 코드가 선 다음 글만 따로
  한 번 보고, 끝나면 `node .claude/skills/ux-writing/scripts/scan-copy.mjs apps/<앱>/src` 를 돌립니다.
  그다음 서브에이전트 `ux-writing-reviewer` 에게 **볼 범위만** 넘겨 새 눈으로 검토받습니다(`.claude/agents/`).
  화면을 만든 대화를 모르는 자리라서 그 대화가 화면에 샌 글을 알아챕니다.
- 한국어 산문(문서 · PR · 주석)을 쓸 때는 `fluent-korean` 을 먼저 읽습니다. 화면의 글과 규약이 다릅니다. 문장 규약의 원문과 라이선스 사본은
  `.claude/output-styles/` 에 있습니다.

## 약어

약어는 **코드에 이름이 없는 것에만** 붙입니다. 정본은 `docs/decisions/2026-09-14-약어-규약.md` 입니다.

| 약어 | 무엇 | 정본 |
|---|---|---|
| `INV-ACCESS-01` | 접근 축의 불변식 | `packages/access/src/invariants.ts` |
| `INV-RESEARCH-01` | 리서치 보드의 불변식(읽기는 공개, 쓰기는 테넌트의 구성원) | `packages/research/src/invariants.ts` |
| `INV-NOTE-01` | 예시 도메인의 불변식 | `packages/notes/src/invariants.ts` |
| `INV-AGENT-01` | agent 도메인의 불변식 | `packages/agents/src/invariants.ts` |
| `INV-ANALYTICS-01` | 제품 분석의 불변식 | `packages/analytics/src/invariants.ts` |
| `INV-PREFERENCE-01` | 사람이 고른 설정의 불변식 | `packages/preferences/src/invariants.ts` |
| `REQ-01` | 도메인이 없는 저장소 규약 | `packages/shared/src/invariants/requirements.ts` |

- 도메인이 늘면 그 패키지가 자기 카탈로그(`INV-<도메인>-NN`)를 갖고 `packages/shared/scripts/check-invariants.mjs`
  의 목록에 줄을 더합니다.
- `npm run check:invariants -w @hathway/shared` 가 카탈로그를 함께 대조합니다. 없는 id 를 인용하거나 `enforced`
  인데 지키는 **테스트 파일**이 없으면 실패합니다.

## 명령어

```
npm install
npx turbo dev --filter=@hathway/web     # 포트 4400
npx turbo dev --filter=@hathway/agent   # 포트 4410
npx turbo build
npx turbo typecheck
npx turbo test
npm run e2e -w @hathway/web
npm run e2e -w @hathway/agent
```

## 로컬 스택

로컬 Supabase 를 도커로 올립니다. 포트는 **5436x** 입니다(API 54361 · DB 54362). 다른 저장소의 스택과
함께 떠 있어도 겹치지 않게 대역을 고릅니다(resolv-ai 5432x · genwood 5434x · hathway 5436x · agent-campus 5438x · scaffold 5440x).

```
supabase start -x realtime,imgproxy,mailpit,studio,edge-runtime,logflare,vector,supavisor,postgres-meta
cp apps/web/.env.example apps/web/.env.development.local
cp apps/agent/.env.example apps/agent/.env.development.local
```

- `start` 가 마이그레이션과 시드를 함께 적용합니다. 시드를 다시 깔 때만 `supabase db reset` 을 부릅니다.
  ⚠ `--linked` 는 원격을 지우므로 쓰지 않습니다.
- 시장 데이터는 `supabase/seeds/05-market.sql`(두 종목: 크래프톤 `259960` · 에코프로비엠 `247540`)이 심고, `06-fin-periods.sql` 이
  거기서 파생 지표 `fin_periods` 를 굽습니다. 공시 본문 조각(`filing_sections`)은 커서 따로 한 번 넣습니다.

  ```
  gunzip -c supabase/seed-filing-sections.sql.gz | docker exec -i supabase_db_hathway psql postgresql://postgres:postgres@127.0.0.1:5432/postgres
  ```
- 원격 데이터와 적재의 절차는 `platform/README.md` 에 있습니다. ⚠ 원격 DB 에 쓰는 일(적재 · `fin_periods_refresh`)은 되돌리기 비싼 쪽입니다.
- 로컬 계정은 `supabase/seed.sql` 이 심고 비밀번호는 모두 `hathway-local` 입니다.

  | 계정 | 누구 | web | agent |
  |---|---|---|---|
  | `ops@example.test` | 운영팀 소유주 | ✅ | ✅ |
  | `kim@example.test` | 고객사 A 구성원 | ✅ | `/no-access` |
  | `lee@example.test` | 고객사 A 소유주 | ✅ | `/no-access` |
  | `park@example.test` | 고객사 B 소유주 | ✅ | `/no-access` |
  | `both@example.test` | 운영팀 + 고객사 A 겸직 | ✅ | ✅ |
  | `leaver@example.test` | 고객사 A 구성원. e2e 가 팀에서 내보냈다가 다시 초대한다 | ✅ 또는 `/no-access` | `/no-access` |
  | `cee@example.test` | 고객사 C 소유주. 쪽지가 하나도 없는 조직이라 홈 e2e 가 첫날 점검표를 본다 | ✅ | `/no-access` |
  | `gone@example.test` | 나간 사람 | `/no-access` | `/no-access` |
  | `outsider@example.test` | 명부에 없는 사람 | `/no-access` | `/no-access` |


- ⚠ **로컬 계정 칸은 개발 서버에서만 섭니다.** 프로덕션 빌드에서 여는 길은 e2e 전용 `ALLOW_LOCAL_ACCOUNTS=1` 하나이고
  배포 환경변수에 넣지 않습니다(`src/lib/localAccounts.ts`).
- ⚠ **게이트웨이 키가 없으면 agent 는 연습 모델로 돕니다**(`AGENT_RUNNER=rehearsal`, `.env.example` 의 기본값).
  실물 모델을 쓰려면 터미널에서 `apps/agent/.env.local` 에 `AI_GATEWAY_API_KEY` 를 넣고 그 줄을 지웁니다. web 의 쪽지 요약도
  같다(`SUMMARY_RUNNER=rehearsal`).
- ⚠ **PostHog 토큰이 없으면 web 의 제품 분석은 연습 창구로 돕니다**(`NEXT_PUBLIC_POSTHOG_SINK=rehearsal`). 실물로 보내는 절차는 `modules/posthog/module.md` 에 있습니다.
- ⚠ **플러그인(`modules/plugin`)의 도구는 시장 데이터를 로그인한 계정 없이도 읽고, 보드에 담기만 그 계정의 조직으로 합니다.** 로컬 스택이 떠 있어야 답합니다. 실물 ChatGPT 에 붙이는 절차는 `modules/plugin/module.md` 에 있습니다.

## 화면: 정적 껍데기

`cacheComponents`(부분 사전 렌더) 위에서 새로고침과 메뉴 이동 모두 **첫 화면에 실제 틀이 곧바로 서게** 하는 규칙입니다.
한 줄로 줄이면 「틀은 미리 굽고, 기다림은 데이터 가까이에서, 같은 모양으로」입니다. 스캐폴드의 화면은 모두 이 규칙대로 서
있으니, 새 화면은 아래 표의 본보기를 따라 만듭니다.

⚠ **옮겨 온 시장 화면은 아직 이 규칙 밖에 있습니다.** 그 라우트는 `export const instant = false` 로 섰고, 조회가 `connection()` 을 기다려
요청마다 그립니다. 화면을 고칠 때 그 화면부터 규칙대로 다시 세우고 그 줄을 지웁니다(`next-cache-components-adoption` 스킬).

| 원칙 | 무엇을 하나 | 스캐폴드의 본보기 |
|---|---|---|
| 1. 요청과 상관없는 것은 미리 굽는다 | 제목 · 폼 · 단추 · 목록의 머리처럼 누가 열어도 같은 것은 `<Suspense>` **밖**에 둔다 | `apps/web/src/app/(app)/notes/page.tsx` 의 제목과 새 쪽지 폼 |
| 2. `<Suspense>` 는 데이터를 읽는 조각 바로 바깥에만 | 레이아웃이나 페이지를 통째로 감싸지 않는다. `params` · `searchParams` 는 맨 위에서 `await` 하지 않고 약속 그대로 안쪽 조각에 넘긴다 | `notes/[noteId]/page.tsx` 의 `NoteDetail`(`params`), `login/page.tsx` 의 `LoginPanel`(`searchParams`) |
| 3. 뼈대를 따로 그리지 않는다 | 기다리는 얼굴은 **같은 컴포넌트의 `loading`** 이다. 값 자리만 막대(`PendingText`)이고 틀 · 줄 높이 · 너비는 그대로라 값이 와도 움직이지 않는다 | 블록: `ItemList loading` · `PageHeader loading` · `AppShellAccount loading`. 화면: `NoteView view={null}` · `RenameForm account={null}` · `ConsentView request={null}` |
| 4. 권한 확인은 틀을 막지 않는다 | 게이트(`AuthGate`)는 본문을 감싸지 않고 옆의 `<Suspense fallback={null}>` 에 서서 소속이 아닌 사람만 돌려보낸다. **데이터는 조회마다 관문 `appRead` 가 지킨다.** 틀에는 데이터가 없으므로 먼저 보여도 새지 않는다 | `apps/*/src/app/(app)/layout.tsx` · `apps/*/src/lib/read.ts` |
| 5. 구울 수 없는 값을 틀에 넣지 않는다 | 쿠키 · 주소 값 · `new Date()` · `Date.now()` · `Math.random()` 은 값을 그리는 조각 안에서만 부른다. 기다리는 얼굴도 틀에 구워지므로 같은 규칙을 따른다 | 기다리는 얼굴(`NoteView view={null}`)은 값을 받지 않고 고정된 막대만 그린다. 날짜를 세는 일은 값을 그리는 조각의 몫이다 |

- 셸 안쪽 화면(`app/(app)/`)이 데이터를 읽는 길은 `appRead((actor) => …)` 하나입니다. 서버 액션의 `appAction` 과 짝입니다.
  행위자를 확정하고, 세션이 없으면 `/login`, 소속이 아니면 `/no-access` 로 보낸 뒤에만 읽습니다.
- `lib/readBoundary.test.ts` 가 둘을 막습니다. 셸 안쪽 화면이 행위자를 직접 얻거나 Effect 를 직접 돌리는 것, 그리고 화면이
  뼈대(`Skeleton` · `bg-skeleton`)를 따로 그리는 것입니다.
- 새 화면의 점검표
  - [ ] 페이지 · 레이아웃 맨 위에서 `await` 하는 것이 없는가(`params` · `searchParams` · 쿠키 · 조회)
  - [ ] 데이터를 읽는 조각마다 제 `<Suspense>` 가 있고, 기다리는 얼굴이 같은 컴포넌트의 `loading` 상태인가
  - [ ] 데이터가 필요 없는 제목 · 폼 · 단추가 `<Suspense>` 밖에 있는가. 데이터가 필요한 단추만 제 `<Suspense>` 에 넣고, 기다리는 동안
        같은 글자의 꺼진 단추를 세운다
  - [ ] 렌더 중에 `new Date()` · `Date.now()` · 난수를 부르지 않는가(필요하면 그 값을 실제로 그리는 자리에서만)
  - [ ] 조회가 `appRead`, 쓰기가 `appAction` 을 지나는가
  - [ ] `next build` 가 통과하고, 구운 HTML(`.next/server/app/<라우트>.html`)에 실제 틀이 들었는가
- 확인하는 법
  - 개발 서버: 원칙을 어기면 오버레이에 「Blocking Route」가 뜹니다.
  - `next build`: 맨 위의 요청 값 기다림과 틀 안의 불안정한 값을 실패로 막습니다. 표의 ◐ 는 틀이 있다는 뜻일 뿐이라,
    안에 무엇이 들었는지는 구운 HTML 에서 봅니다(`data-slot="page-header"` · `data-loading` 이 있고 공용 뼈대가 없는지).
  - 권한: `e2e/access.spec.ts` 가 소속이 아닌 계정의 원본 응답에 틀만 있고 쪽지가 없는지 잽니다.
- ⚠ 표 블록(`DataTable`)을 기다리는 얼굴로 쓸 때는 조심합니다. TanStack 이 개발 모드에서 `Date.now()` 를 불러 「Blocking Route」가
  뜹니다. 줄 없이 기다리는 표는 TanStack 을 세우지 않고 열 명세만으로 같은 모양을 그려야 합니다(아직 쓰는 화면이 없어 두지 않았습니다).

## 자기 검증

- 코드를 고친 뒤에는 `npx turbo typecheck` 를 돌려 타입 오류가 0개인 것을 확인합니다.
- 테스트가 있는 패키지를 고쳤으면 그 워크스페이스의 테스트를 돌립니다(`npx turbo test --filter=@hathway/notes`).
- 워크스페이스의 의존을 바꿨거나 새 패키지를 세웠으면 `npm run check:dependencies -w @hathway/shared` 를 돌립니다.
  층 표에 없는 패키지를 막으므로 새 패키지는 그 스크립트의 `LAYER` 에 줄을 더하는 것이 첫 작업입니다.
- 모듈(결제 등)이나 코어를 고쳤으면 `npm run check:modules -w @hathway/shared` 를 돌립니다. 코어가 모듈을 직접 부르거나,
  모듈 파일(`modules/<이름>/`)이 저장소와 어긋나면 실패합니다. 모듈의 코드 밖에서 잇는 자리를 새로 만들면 그 줄에
  `scaffold:module <이름>` 을 달고 그 모듈의 `wiring.md` 에 적습니다.
- 주석을 고쳤으면 `npm run check:comments -w @hathway/shared` 를 돌립니다. 기계로 잴 수 있는 셋(엠대시 · 명사형 종결 ·
  연결어미 종결)만 보므로 **초록인 것과 지침을 지킨 것은 다릅니다.**
- 어댑터를 고쳤으면 로컬 스택을 올리고 계약 테스트를 돌립니다(`npx turbo test --filter=@hathway/adapters-postgres`).
- ⚠ **`npx turbo test` 는 로컬 스택이 떠 있어야 통째로 초록이 됩니다.** 계약 테스트가 거기 붙고, 스택이 없으면 건너뛰지
  않고 실패합니다.
- 화면을 고쳤으면 그 앱의 e2e 를 돌립니다. 프로덕션 서버 둘(닫힌 서버 · 로컬 계정이 열린 서버)을 띄웁니다.
  ⚠ 같은 포트에 개발 서버가 떠 있으면 먼저 내립니다. e2e 가 그 서버를 재면 스모크가 빨개집니다.
  ⚠ 페이지를 열기도 전에 브라우저를 띄우지 못하고 모두 실패하면 Playwright 가 찾는 브라우저 판이 설치된 판과 다른 것입니다.
  `PLAYWRIGHT_CHROMIUM_PATH` 로 설치된 실행 파일을 가리키고 다시 돌립니다.

## 코드 스타일

- Allman brace, 4-space indent, 세미콜론을 씁니다. 여는 중괄호는 반드시 다음 줄에 둡니다.
- ⚠ `packages/ui/src/components/**` 와 `packages/ui/src/blocks/**` 는 예외입니다. tyohnn 이 내려준 원본이고 수정 금지 구역입니다.
- 주석과 커밋 메시지는 한국어로 씁니다. 사람이 읽는 한국어 산문(문서 · PR · 코드 주석)은
  `.claude/skills/fluent-korean/` 지침을 따릅니다. 커밋 메시지와 변수 이름과 로그 문자열은 대상이 아닙니다.
- TypeScript 에서 `any` 를 쓰지 않습니다. `unknown` 과 타입 가드를 씁니다.
- 검증은 Effect `Schema` 로 합니다. zod 가 아닙니다.
- 로그는 Effect 로 남깁니다. `Effect.logWarning` 계열을 쓰고, Effect 밖이라면 `runFork` 로 띄웁니다.

## 커밋

한 커밋은 한 가지 책임만 바꾸고, 각 커밋이 빌드와 타입체크를 통과해야 합니다. 책임의 순서와 타입 · 스코프
규약은 `docs/개발-방법론.md` 의 「커밋」 절이 정본입니다. 메인 브랜치는 `main` 입니다. PR 본문은
`.github/pull_request_template.md` 의 절을 채웁니다.

## 데이터베이스

정본은 `supabase/migrations/` 이고 절차는 `docs/supabase-migrations/README.md` 입니다.

| 스키마 | 무엇 | 붙는 롤 |
|---|---|---|
| `public` | DART 에서 적재한 시장 데이터(회사 · 공시 · 재무 원본과 파생 `fin_periods` · 지분 · 사건)와 리서치 보드. 적재가 PostgREST 로 쓰고, 정본과 함정은 `AGENTS.md` 「스키마 함정」이다 | `web_app`(읽기만, 표마다 GRANT. 리서치 보드는 읽고 쓴다) |
| `org` | 테넌트 · 계정 · 멤버십. 앱의 문이 여기서 열립니다 | `web_app` · `agent_app` (컬럼 단위 SELECT). `web_app` 은 팀 관리의 쓰기를 컬럼 단위로 더 받습니다 |
| `notes` | 예시 도메인의 쪽지 | `web_app`(읽고 쓴다) · `agent_app`(읽기만) |
| `agent` | 에이전트와 나눈 대화의 장부. 말은 쌓이기만 합니다 | `agent_app` |
| `preferences` | 사람이 조직 안에서 고른 설정. 사람마다 조직마다 한 줄입니다 | `web_app` |

- 접속 롤은 **앱마다 하나**이고 `bypassrls` 라 GRANT 가 유일한 경계입니다. 표마다 RLS 를 켜고 `deny_all` 을 둡니다.
- 마이그레이션은 손으로 씁니다. `db pull` 과 `db diff` 로 파일을 만들지 않습니다.
- 새 도메인은 **새 스키마**로 섭니다. 스키마를 앱 이름으로 짓지 않고 업무 영역으로 짓습니다.

## 디자인 시스템

tyohnn 의 **graphite**(어두운 고밀도 대시보드)와 phosphor 아이콘을 입습니다. 정본은 루트 `tyohnn.json` 이고 갈아입는 법은 `docs/design-system/README.md`
에 있습니다. 이 제품의 값(차트 색 · 오르고 내림)은 `packages/ui/src/product.css` 에 둡니다. 룩을 바꿀 때는 `packages/ui` 를 손으로 고치지 않고 tyohnn 에서 다시 받습니다.

```
npm run check:tokens -w @hathway/ui
```

1 · 2층이 정의한 토큰과 3층 · 블록 · 앱이 `var()` 로 읽는 것을 대조합니다. `turbo test` 가 함께 돌립니다.
