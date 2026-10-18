# 분석 모듈을 코어에 잇는 자리

모듈이 가진 자리(`owns.json` 의 `paths`)는 통째로 복사하거나 지우면 된다. 이 파일은 그 밖에서 **코어의 파일에 잇는 자리**를
적는다. 둘로 나뉜다.

- **표시 줄(기계식).** 줄 끝이나 블록에 `scaffold:module posthog` 이 붙어 있다. 뗄 때는 그 줄(블록은 `begin` ~ `end`)을 걷고,
  붙일 때는 아래의 줄을 그 파일의 같은 자리에 되살린다. `create.sh --with` 와 `module-patch.mjs` 가 이 일을 한다.
- **판단이 드는 자리(에이전트).** 표 · 문장처럼 표시를 달 수 없거나, 프로젝트마다 모양이 갈라졌을 수 있는 자리다.
  `/scaffold-add` · `/scaffold-remove` 스킬이 이 파일을 읽고 그 프로젝트에 맞춰 고친 뒤 무엇을 고쳤는지 보고한다.

붙이거나 뗀 뒤에는 `acceptance.json` 의 검사를 모두 지난다.

## 표시 줄

| 파일 | 줄 | 하는 일 |
|---|---|---|
| `apps/web/src/lib/modules.ts` | `import { posthogExtensions } …` · `posthogExtensions,` | 확장 지점 `ProductEvents` 를 채운다 |
| `apps/web/src/lib/moduleClient.ts` | import 세 줄 · `AnalyticsRoot,` · `Identify,` · `Reset,` | 브라우저 쪽 자리 셋(모든 화면 · 로그인한 셸 · 로그인 화면) |
| `apps/web/src/middleware.ts` | `if (…startsWith("/ingest")) return NextResponse.next();` | 분석 이벤트를 로그인으로 돌리지 않는다 |
| `apps/web/next.config.ts` | `POSTHOG_HOSTS` 블록 · 옮겨 쓰는 패키지 두 줄 · `skipTrailingSlashRedirect` 와 `rewrites` 블록 | `/ingest` 를 PostHog 로 넘긴다 |
| `apps/web/playwright.config.ts` | `begin` ~ `end` 블록 둘 · `use` 의 `storageState` 한 줄 | e2e 서버를 연습 창구로 띄우고, 다른 스펙은 동의를 이미 고른 사람으로 돈다 |
| `apps/web/e2e-agent/auth.setup.e2e.ts` | `browser.setCookies` 한 줄 | 에이전트 e2e 의 세션은 동의를 이미 고른 사람으로 돈다 |
| `apps/web/.env.example` | `begin` ~ `end` 블록 · 배포 값의 `NEXT_PUBLIC_POSTHOG_TOKEN` 한 줄 | 연습 창구와 토큰 · 리전 |
| `packages/shared/scripts/check-dependencies.mjs` | `LAYER` 의 두 줄 | 새 패키지의 층 |
| `packages/shared/scripts/check-invariants.mjs` | `CATALOGS` 의 한 줄 · 머리말 한 줄 · `SCAN_ROOTS` 의 한 줄 | `INV-ANALYTICS-*` 카탈로그 |
| `apps/web/src/content/legal/privacy.mdx` | 한눈에 보기 · 4 · 6 · 7 · 8절의 줄 · 1절과 7절의 `begin` ~ `end` 블록 | 처리방침의 이용 기록 · 방문 기록, PostHog 에 맡기는 일, 분석 쿠키. 리전(`NEXT_PUBLIC_POSTHOG_REGION`)을 eu 로 바꾸면 7절의 나라를 고친다 |

⚠ `next.config.ts` 에 다른 모듈도 `rewrites` 를 두게 되면 한 함수로 합쳐야 한다. 두 번 적으면 뒤의 것이 앞의 것을 덮는다.

## 판단이 드는 자리

### package.json (`owns.json` 의 `dependencies`)

- `apps/web/package.json` 의 `@hathway/analytics` · `@hathway/adapters-posthog` · `posthog-js`
- 고친 뒤 `npm install` 로 `package-lock.json` 을 다시 세운다. 잠금 파일을 손으로 고치지 않는다.

### 문서 (`owns.json` 의 `docs`)

만들 때(`create.sh --with`)는 `owns.json` 의 `docs` 가 가리키는 줄을 기계식으로 걷는다. 이미 갈라진 프로젝트에서는 아래
표를 보고 같은 뜻의 줄을 찾아 고친다.

### 루트 CLAUDE.md

| 절 | 분석의 자리 |
|---|---|
| 워크스페이스 표 | `packages/analytics` · `packages/adapters-posthog` 두 줄 |
| 약어 표 | `INV-ANALYTICS-01` 줄 |
| 로컬 스택 | 「PostHog 토큰이 없으면」 줄 |

### apps/web/CLAUDE.md

| 절 | 분석의 자리 |
|---|---|
| 라우트 표 | `/api/analytics/rehearsal` 줄 |
| 확장 지점과 모듈 | `src/modules/posthog/` 줄, 「분석 모듈이 있으면 그 이벤트의」 줄 |
| e2e 표 | `analytics.spec.ts` 줄 |

### 코어의 동작이 분석에 기대는 자리

- **액션의 ⑥.** 코어의 액션(`actions/notes.ts` · `actions/summary.ts`)은 `ProductEvents.capture` 로 알리기만 한다. 모듈이 없으면
  기본 구현이 아무것도 하지 않으므로 걷지 않아도 된다. 새 이벤트는 코어가 알리고 이 모듈의 카탈로그(`packages/analytics`)에
  한 줄을 더해야 간다. 카탈로그에 없는 이름은 조용히 떨어진다(INV-ANALYTICS-03).
- **브라우저 쪽 자리 셋.** 코어(`app/_components/ModuleSlots.tsx`)가 그린다. 이 모듈을 떼어 자리가 비면 아무것도 그리지 않는다.
- **동의 쿠키의 이름**(`analytics_consent`). 다른 모듈이 동의를 따로 묻지 않게, 동의가 필요한 모듈이 새로 생기면 이 쿠키와
  배너를 코어로 내릴지 판단한다.

## 붙일 때의 차례

`/scaffold-add posthog` 스킬이 이 차례를 밟는다.

1. `node <원본>/scripts/module-patch.mjs add posthog --project .` 이 가진 자리를 복사하고 표시 줄 · 의존 · 문서 줄을 패치로 붙인다.
2. 붙지 않은 조각(`.rej`)을 위 표를 보고 같은 뜻의 자리에 잇는다. 브라우저 쪽 자리 셋(`lib/moduleClient.ts`)이 없는 오래된
   코어라면 멈추고 알린다. 코어부터 원본에 맞추는 것은 다른 일이다.
3. 프로젝트의 액션이 알리는 이벤트가 카탈로그에 있는지 본다. 프로젝트에서 새로 만든 액션이면 사람과 함께 이벤트 이름과 속성을 정한다.
4. `npm install` 뒤 `acceptance.json` 을 모두 지난다.
5. 고친 자리를 목록으로 보고한다. 사람이 할 일(`module.md` 의 「실물로 보내려면」)을 함께 적는다.

## 뗄 때의 차례

`/scaffold-remove posthog` 스킬이 이 차례를 밟는다.

1. `node <원본>/scripts/module-patch.mjs remove posthog --project .` 이 가진 자리를 지우고 표시 줄 · 의존 · 문서 줄을 걷는다.
2. 붙지 않은 조각과 남은 표시 줄을 걷는다. 액션의 `ProductEvents.capture` 는 그대로 둔다(기본 구현이 받는다).
3. `npm install` 뒤 `acceptance.json` 의 `checks` 와 코어의 검사(turbo typecheck test · web e2e)를 지난다.
4. PostHog 프로젝트 · Vercel 의 환경변수 · 개인정보처리방침의 문장은 사람이 치운다. 보고에 적는다.
