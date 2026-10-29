# web

고객(`customer`)과 운영팀(`operator`)이 함께 쓰는 앱입니다. 로컬 개발 포트는 `4400` 이고 e2e 는 `4401` 에
로컬 계정이 열린 서버를 하나 더 띄웁니다. 이 제품의 **MCP 엔드포인트도 이 앱 하나**에 있습니다.

개발 방법론(스택 · 금지 목록 · 서버 액션의 여섯 단계 · 테스트 3층 · 커밋 축)의 정본은 `docs/개발-방법론.md` 이고
여기에 옮겨 적지 않습니다.

## 라우트

| 라우트 | 무엇 |
|---|---|
| `/` | `/stocks` 로 넘깁니다. 이 제품의 첫 화면은 종목 화면입니다(`(market)/page.tsx`) |
| `/stocks` · `/real-estate` | 시장 화면(`(market)` 묶음). 로그인 없이 읽고, 리서치 보드의 쓰기만 관문 뒤입니다. 아래는 테마마다 같습니다 |
| `/stocks/analysis/[stockCode]` · `/[section]` | 종목 하나. 기업정보 첫 화면(Snapshot)과 8단계 분석이 다음 마디를 나눠 씁니다 |
| `/stocks/macro` · `/stocks/macro/industries` · `/[slug]` | 거시경제와 산업 지도 |
| `/stocks/news` · `/stocks/boards` · `/[boardSlug]` | 전체 뉴스와 리서치 보드. 보드는 테넌트의 구성원만 고치고 지웁니다(INV-RESEARCH-01) |
| `/blog` · `/blog/[slug]` | 블로그. 글은 `src/content/blog/` |
| `/docs` · `/docs/[slug]` | 문서. 글은 `src/content/docs/`, 「MCP 도구」는 `TOOLS` 에서 그립니다 |
| `/changelog` · `/changelog/[version]` | 새 소식. 뿌리는 판을 모두 세운 피드이고 제목을 누르면 판 하나가 열립니다. 글은 `src/content/changelog/`, 큰 그림은 `public/changelog/` |
| `/privacy` · `/terms` | 개인정보 처리방침과 이용약관. 글은 `src/content/legal/` 이고 운영자와 시행일은 그 폴더의 `index.ts` 하나가 갖습니다. 대괄호 값은 제품을 세울 때 채웁니다. 모듈이 맡는 문단은 `scaffold:module` 표시가 있어 모듈과 함께 빠집니다. Google OAuth 브랜딩 인증과 ChatGPT 앱 디렉터리가 이 두 주소를 읽습니다 |
| `/login` · `/no-access` | 셸이 없는 두 화면. 로컬 계정 칸은 개발 서버에서만 섭니다 |
| `/auth/callback` | 구글 OAuth 가 돌아와 코드를 세션으로 바꾸는 자리 |
| `/home` | 홈. 로그인한 사람이 처음 오는 자리입니다. 만들기 · 처리할 것 · 최근 쪽지가 서고, 이어 할 쪽지가 없으면 최근 대신 시작 점검표가 섭니다 |
| `/notes` | 예시 도메인. 볼 수 있는 쪽지를 20개씩. 찾는 말과 쪽 번호가 주소에 남고(`?q=` · `?page=`), 거르고 자르고 세는 일은 질의(`listPage`)가 합니다. 실제 데이터 위 목록 배관의 본보기입니다 |
| `/notes/new` | 새 쪽지. 쪽지 화면에서 누르면 다이얼로그(`@modal/(.)new`), 주소로 바로 오면 전체 페이지입니다. 쓰면 목록으로 돌아갑니다 |
| `/notes/[noteId]` | 쪽지 하나. 머리(제목 · 상태 · ⋯ 메뉴) → 본문과 속성 기둥(공개 범위 · 쓴 사람 · 쓴 날)입니다. 볼 수 없으면 404 이고, 보관은 쓴 사람의 ⋯ 메뉴 맨 아래에만 섭니다 |
| `/settings/team` | 지금 들어온 조직의 사람들. 초대 · 역할 · 내보내기는 소유주와 관리자에게만 섭니다(INV-ACCESS-09) |
| `/settings/account` | 내 계정. 이름을 고칩니다 |
| `/api/analytics/rehearsal` | 연습 창구가 이 서버에 모은 분석 이벤트. 연습일 때만 서고 e2e 가 읽습니다 |
| `/api/mcp` | MCP(JSON-RPC). Authorization 헤더의 Supabase OAuth 토큰으로 들어옵니다 |
| `/.well-known/oauth-protected-resource` | MCP 클라이언트에게 인증 서버를 알리는 문서(RFC 9728) |
| `/oauth/consent` | Supabase OAuth 서버가 사람을 보내는 동의 화면 |

경로는 `src/lib/paths.ts` 하나가 만듭니다. 절대 경로를 문자열로 적지 않습니다.

## 셸

사이드바는 `/ia-design` 의 대시보드 해부도(`.claude/skills/ia-design/references/dashboard.md` 2번)대로 섭니다.

| 자리 | 무엇 | 어디 |
|---|---|---|
| 머리 | 브랜드 | `(app)/_components/AppShell.tsx` |
| 도구 줄 | 찾기(⌘K 팔레트) · 만들기 | `(app)/_components/CommandPalette.tsx`. 만들 수 있는 것은 `lib/paths.ts` 의 `creatables` |
| 개인 묶음 | 「나」를 기준으로 거른 관점(홈 · 받은 것 · 내 일). 지금은 홈 한 줄입니다 | 메뉴 줄의 `place: "personal"` |
| 객체 메뉴 | 쪽지와 모듈의 화면. 모듈마다 구분선으로 갈립니다 | `lib/paths.ts` 의 `navigation` · `lib/moduleNav.ts` |
| 발치 | 설정 · 제품 문서, 그 아래 계정 | `lib/paths.ts` 의 `footerNavigation` |

- **설정은 사이드바의 한 줄입니다.** 들어가면 `settings/layout.tsx` 의 옆 메뉴가 개인 · 조직 · 결제 갈래로 섭니다. 설정 화면을 더할 때는
  메뉴 줄에 `place: "settings"` 와 `settingsGroup` 을 답니다. 모듈의 설정 화면(요금제 · 알림)도 같고, 사이드바에는 서지 않습니다.
- 위 띠의 위치는 설정 안의 자리까지 적습니다(「설정 › 팀」). 메뉴 한 벌을 자리마다 다시 뽑는 일은 `(app)/_components/navGroups.tsx` 가 합니다.
- ⌘K 팔레트에 따로 적는 항목은 없습니다. 메뉴의 정본에서 뽑으므로 메뉴로 갈 수 없는 곳이 팔레트로만 열리지 않습니다.
- **홈은 해부도 3번대로 섭니다.** 위에서부터 만들기(만들 수 있는 것마다 단추) → 처리할 것 → 최근입니다. 무엇이 어느 칸에 서는지는
  `usecases/home.ts` 의 `planHome` 이 정하고, 판정은 다시 하지 않습니다(이미 판정을 지난 쪽지와 팀 목록을 나눌 뿐입니다).
  처리할 것은 실제로 사람을 기다리는 일만 세웁니다. 객체가 늘면 `HomeTodo` 에 갈래를 더하고, 첫날의 점검표에도 그 제품의 첫 일을 더합니다.

## 공개 화면과 글

까닭은 `docs/decisions/2026-09-29-공개-화면은-web-에-두고-글은-저장소의-MDX-다.md` 에 있습니다.

- 공개 화면은 `src/app/(site)/` 이고 앱의 셸도 게이트도 없습니다. 공개 경로를 더하면 `src/middleware.ts` 의 `PUBLIC_PATHS` 에도
  더합니다. ⚠ 이 묶음에서 조직의 데이터를 읽지 않습니다.
- 소개 첫 화면(`(marketing)/page.tsx`)은 두지 않았습니다. `/` 가 종목 화면으로 가기 때문입니다. `src/content/landing.ts` 는 사이트 색인(`lib/siteIndex.ts`)이 읽어 남겼습니다.
- 틀이 셋입니다. 블로그는 `(marketing)`(위 머리 · 아래 발치), 문서는 `docs/layout.tsx`(tyohnn `block-docs`: 왼쪽 사이드바 · 목차 기둥),
  새 소식은 `changelog/layout.tsx`(위 머리 · 아래 발치)이고 판마다 왼쪽 날짜 칸 · 제목 · 큰 그림 · 본문이 섭니다(`changelog/_components/ReleaseEntry.tsx`). 템플릿의 스타일은 `site.css` 에 있습니다.
- 글을 더할 때는 `src/content/<모음>/` 에 MDX 를 두고 그 모음의 `index.ts` 와 `bodies.ts` 에 한 줄씩 더합니다(제목 · 날짜 · 차례는
  `index.ts`). 짝이 어긋나면 타입이, 파일과 목록이 어긋나면 `content.test.ts` 가 막습니다.
- 본문은 조판 축(`.typeset`)이 그립니다. 제목과 날짜도 그 안에 두고, 비산문 요소에는 `not-typeset` 을 답니다.
- MDX 에서 가져오지 않고 쓰는 조각은 `Callout` · `Steps` · `Step` 이고, 울타리 코드는 머리와 복사 단추가 달린 코드 블록이 됩니다
  (`mdx-components.tsx` → `(site)/_components/prose.tsx`). TSX 로 쓴 문서는 같은 조각을 가져다 씁니다. 목차에 서는 제목은 `H2` · `H3` 입니다.
- ⚠ 본문을 `() => import()` 로 불러오지 않습니다. 동적으로 불러온 본문 안의 클라이언트 컴포넌트는 개발 서버에서 깨집니다.
- 공개 화면의 글도 `ux-writing` 을 지납니다. 블로그 · 문서의 본문은 제품의 말투(해요체)로 짧게 씁니다.
- 처리방침과 약관(`src/content/legal/`)은 코드가 실제로 모으고 맡기는 것만 적습니다. 데이터를 새로 모으거나, 맡기는 회사를 바꾸거나,
  쿠키를 더하면 같은 PR 에서 처리방침을 고칩니다. Google 로그인을 배포하면 Search Console 의 HTML 파일(`public/google<번호>.html`)로
  홈페이지의 소유권을 확인하고, 그 파일은 미들웨어가 지나지 않습니다(`src/middleware.ts` 의 `matcher`).

## 서버 액션과 유스케이스

| 자리 | 무엇 |
|---|---|
| `src/lib/action.ts` | 관문 `appAction`. ① Schema 파싱 ② 행위자 확정을 강제합니다 |
| `src/lib/read.ts` | 화면의 관문 `appRead`. 행위자를 확정하고 돌려보낸 뒤에만 읽습니다(루트 `CLAUDE.md` 「정적 껍데기」) |
| `src/actions/notes.ts` | 관문을 지난 액션 둘(쓰기 · 보관). ⑥ 에서 한 일을 `ProductEvents` 에 알립니다 |
| `src/actions/team.ts` · `src/usecases/team.ts` | 초대 · 역할 바꾸기 · 내보내기 · 내 이름. 판정은 `packages/access` 의 `access/team.ts` 계획 함수가 합니다 |
| `src/actions/summary.ts` · `src/usecases/summary.ts` | 쪽지 요약. 크레딧을 쓰는 기능의 본보기입니다. 새 AI 기능은 이 모양(볼 수 있는가 → `CreditMeter.meter`)을 따릅니다 |
| `src/usecases/notes.ts` | 조립. ③ 행 단위 판정과 ④ 도메인 규칙은 `packages/notes` 의 순수 함수가 합니다 |
| `src/usecases/mcp.ts` | MCP 요청 하나의 조립. 봉투(`lib/mcp.ts`)가 세운 계획을 유스케이스와 확장 지점에 잇고, 요금제의 문을 한 번 겁니다 |
| `src/actions/session.ts` · `src/actions/consent.ts` | **관문을 지나지 않는 액션**. 행위자가 아직 없는 자리이고 도메인 데이터를 만지지 않습니다 |

- ⚠ **`"use server"` 파일에는 관문을 지난 액션만 둡니다.** 그 파일의 export 는 전부 공개 엔드포인트입니다.
- ⚠ **관문 밖의 액션을 늘리지 않습니다.** 세션 셋과 동의 둘이 전부입니다.
- 화면(서버 컴포넌트)은 `appRead((actor) => …)` 로 요청마다 행위자를 다시 세우고 같은 유스케이스를 부릅니다.

## 확장 지점과 모듈

까닭은 `docs/decisions/2026-09-29-모듈은-코어의-확장-지점을-채우고-한-파일에서만-잇는다.md` 에 있습니다.

| 자리 | 무엇 |
|---|---|
| `src/extensions/PlanLimits.ts` | 조직이 무엇까지 쓰는가(멤버 한도 · MCP). 기본 구현은 한도 없음 |
| `src/extensions/CreditMeter.ts` | AI 기능을 재며 부르는가. 기본 구현은 부르기만 함 |
| `src/extensions/ProductEvents.ts` | 사람이 한 일을 제품 분석에 알리는가. 기본 구현은 알리지 않음 |
| `src/extensions/McpSurface.ts` | MCP 에 무엇을 더하는가(도구 · 자원 · capability). 기본 구현은 더하지 않음 |
| `src/lib/modules.ts` · `src/lib/moduleNav.ts` · `src/lib/moduleClient.ts` | 켠 모듈을 확장 지점 · 메뉴 · 브라우저 쪽 자리(모든 화면 · 로그인한 셸 · 로그인 화면)에 잇는 세 곳. 줄마다 `scaffold:module <이름>` |
| `src/modules/posthog/` | 분석 모듈이 가진 web 코드(동의 배너 · posthog-js · 확장 지점 구현). 라우트는 `app/api/analytics` |
| `src/modules/plugin/` | 플러그인 모듈이 가진 web 코드(익스텐션의 선언 · 도구의 조립 · 폼 · 화면 `app/`). 익스텐션마다의 자리는 `modules/plugin/module.md` |

- ⚠ **코어의 화면 · 유스케이스 · 액션은 모듈을 import 하지 않습니다.** 확장 지점만 알고, 모듈은 `lib/modules.ts` 가 잇습니다.
  `npm run check:modules -w @hathway/shared` 가 막습니다.
- 새 AI 기능은 `CreditMeter.meter` 로 감쌉니다. 모듈이 없으면 재지 않고 부릅니다.
- 사람이 한 일을 알릴 때는 액션의 ⑥ 에서 `ProductEvents.capture` 를 부릅니다. 모듈이 없으면 아무것도 보내지 않습니다.
- 분석 모듈이 있으면 그 이벤트의 이름과 속성을 `packages/analytics` 의 카탈로그(`EVENTS`)에 더해야 갑니다.

## 인증

| 계층 | 묻는 것 | 어디서 | 실패하면 |
|---|---|---|---|
| 세션 | 로그인했는가 | `src/middleware.ts` 와 관문 | `/login`. 원래 가려던 주소를 들고 갑니다 |
| 소속 | 이 앱을 쓸 수 있는 사람인가 | `packages/access` 의 `canEnterApp` | `/no-access` |
| 행 | 이 행을 볼 수 있는가 | 모든 조회와 쓰기마다 도메인 술어 | 목록에서 빠지고 상세는 404 |

- ⚠ **미들웨어는 문 앞의 안내이지 자물쇠가 아닙니다.** 소속 판정은 셸의 게이트(`(app)/_components/AuthGate.tsx`)와
  화면의 관문(`appRead`)이 매 요청 다시 합니다. 게이트는 본문을 감싸지 않고 옆에 서서 틀을 막지 않습니다.
- ⚠ **`getUser()` 를 씁니다.** `getSession()` 은 쿠키를 그대로 믿습니다.
- 로컬은 이메일과 비밀번호, 배포는 구글입니다. 로컬 계정 문의 규칙은 `src/lib/localAccounts.ts` 하나가 갖고 화면과
  액션이 같은 함수를 읽습니다.

## MCP

`docs/decisions/2026-09-29-MCP-는-web-의-라우트-하나이고-Supabase-OAuth-로-로그인한다.md` 가 까닭을 갖습니다.

```
클라이언트 ──POST /api/mcp──▶ 401 + WWW-Authenticate: Bearer resource_metadata=…
          ──GET /.well-known/oauth-protected-resource──▶ authorization_servers: [<supabase>/auth/v1]
          ──동적 등록 · PKCE 인가──▶ Supabase Auth ──▶ /oauth/consent (사람이 허용)
          ──코드 교환──▶ access_token
          ──POST /api/mcp (Bearer)──▶ tools/list · tools/call
```

- 토큰은 `src/lib/bearerActor.ts` 가 쿠키 길과 **같은 계층을 같은 순서로** 지나 행위자로 바꿉니다.
- 도구(`src/lib/mcp.ts` 의 `TOOLS`)는 화면과 **같은 유스케이스**를 부릅니다. 도구의 인자로 테넌트나 계정을 받지 않습니다.
- 도구를 더할 때는 `mcp.ts` 의 `TOOLS` 와 `McpPlan` 에 한 줄씩 더하고 조립(`src/usecases/mcp.ts`)이 그 계획을 유스케이스에 잇습니다.
  라우트는 토큰으로 행위자를 세우고 저장소와 확장 지점을 붙이는 데까지만 합니다.
- 모듈이 더하는 도구와 자원은 확장 지점 `McpSurface` 로 들어옵니다. 요금제의 문은 조립이 한 번 걸어서 모듈의 도구도 같은 문을 지납니다.
- 한 주소가 두 시대를 받습니다. `initialize` 로 악수하는 옛 판과, 요청마다 판을 싣고 오는 새 판(2026-07-28)입니다. 서버가 사람에게
  되묻는 일(폼)은 새 판의 왕복으로만 합니다. 이 라우트는 요청 사이에 아무것도 기억하지 않습니다.
- 플러그인 모듈이 있으면 같은 주소가 ChatGPT 의 플러그인이 됩니다. 사이드바 · 대화 옆 패널 · 설정 · 멘션 · 파일 뷰어 · 폼이 섭니다.
- 로컬에서 붙여 보려면 개발 서버를 띄우고 클로드 코드에서 `claude mcp add --transport http hathway http://127.0.0.1:4400/api/mcp`
  를 부른 뒤 브라우저에서 로그인 · 허용합니다. 원격은 대시보드에서 OAuth 서버를 켜야 합니다
  (`docs/supabase-migrations/README.md` §3).
- 사슬 전체는 `e2e/mcp.spec.ts` 가 로컬 스택에서 잽니다.

## e2e

`playwright.config.ts` 가 같은 빌드로 서버 둘을 띄웁니다. 닫힌 서버(4400)는 배포와 같은 모양이라 스모크만 돌고,
열린 서버(4401)에서 로그인해야 닿는 스펙이 돕니다. 결제 모듈이 있으면 토스 연습 창구로 도는 셋째 서버(3703)가 더 뜨고 `billing-toss.spec.ts` 만 거기서 돕니다. 시드(`supabase/seeds/10-notes.sql`)가 판정의 갈래를 한 벌씩 심어
두었고, 상태를 바꾸는 스펙은 제 쪽지를 새로 만들어 씁니다.

| 스펙 | 지키는 것 |
|---|---|
| `smoke.spec.ts` | 세션 없이는 셸에 닿지 못하고, 배포 빌드에는 로컬 계정 칸이 없다 |
| `market.spec.ts` | 시장 화면이 로그인 없이 열리고 시드의 종목이 화면까지 오며, 옛 주소가 새 주소로 넘어간다 |
| `access.spec.ts` | 문(`canEnterApp`)이 화면에서 걸린다 |
| `notes.spec.ts` | 행 단위 판정(INV-NOTE-01~03)이 화면에 드러난다. 찾기가 주소에 남고, 쪽을 넘기고, 조건을 지우고, 다이얼로그와 전체 페이지로 쓴다. 상세의 ⋯ 메뉴와 속성 기둥. 쪽지를 쓰는 스펙은 `writeNote.ts` 하나를 지난다 |
| `mcp.spec.ts` | MCP 로그인 사슬과, 토큰으로 불러도 같은 술어를 지난다는 것 |
| `team.spec.ts` | 팀 관리의 자격(INV-ACCESS-09)과 소유주(INV-ACCESS-10), 내보낸 사람이 문을 못 지난다는 것(INV-ACCESS-03) |
| `analytics.spec.ts` | 고르기 전과 거절한 뒤에는 서버도 브라우저도 보내지 않고, 동의하면 계정 id 와 조직으로만 보낸다(INV-ANALYTICS-01~03). 차례대로 돈다 |
| `plugin.spec.ts` | 플러그인 익스텐션. 진입점 도구의 답, 호스트를 흉내 낸 창 안의 화면(악수 · 컨텍스트 · 딥링크 · 파일), 폼의 왕복, 설정이 표에 남는 것. 차례대로 돈다 |
| `plugin-scenarios.spec.ts` | 사용자 시나리오 다섯(`docs/plugin/시나리오와-화면-짜임.md`)을 도구 → 화면 → 단추가 청하는 일까지 끝까지 밟는다. 빈 화면 · 없는 종목 · 적자 · 느린 망 · 호스트의 거절도 함께 잰다. `E2E_SCENARIO_SHOTS=<폴더>` 를 주면 단계마다 사진을 남긴다 |
| `site.spec.ts` | 공개 화면이 로그인 없이 열린다는 것 |
| `shell.spec.ts` | 셸의 해부도. 설정이 사이드바의 한 줄이고 옆 메뉴가 갈래로 서는 것, ⌘K 팔레트의 이동, 만들기가 쪽지 폼의 제목 칸에 커서를 두는 것 |
| `home.spec.ts` | 홈의 해부도. 로그인하면 홈으로 오는 것, 관리하는 사람에게만 아직 로그인하지 않은 초대가 서는 것, 쪽지가 없는 조직의 시작 점검표 |

⚠ **볼 수 없는 쪽지의 상세는 상태 코드가 200 입니다.** 셸이 먼저 스트리밍된 뒤 본문이 `notFound()` 를 부르기
때문이고(PPR), 그래서 e2e 는 코드가 아니라 「페이지를 찾을 수 없어요」 화면(`app/not-found.tsx`)을 봅니다.

⚠ **메뉴나 링크로 옮겨 온 화면은 `locator("visible=true")` 로 좁힙니다.** Next 는 클라이언트 이동 뒤에도 앞 화면을 숨긴 채
DOM 에 남겨서, 두 화면에 같은 글이 있으면 둘 다 잡힙니다. 주소로 바로 가는 스펙(`signIn(page, email, "/orders")`)은 이 일을 겪지 않습니다.

## 에이전트 e2e

Playwright 옆에 러너가 하나 더 섭니다([tester-army/e2e](https://github.com/tester-army/e2e), 2026-10-02 시험 삼아 들임).
목표를 말로 주고(`agent.act`) 결과를 `expect` 로 못 박습니다. 설정은 `e2e.config.ts`, 테스트는 `e2e-agent/*.e2e.ts` 이고
서버는 `4402` 에 따로 뜹니다.

```
npm run e2e:agent -w @hathway/web          # 녹화가 있으면 모델을 부르지 않는다
npx e2e run --no-cache                      # 녹화 없이 모델로 처음부터 (apps/web 에서)
npx e2e explore --session kim '<목표>'      # 테스트 없이 돌아다니며 결함을 보고한다 (apps/web 에서)
```

- **불변식은 Playwright 가 잽니다.** 「보이면 안 된다」처럼 정확히 재야 하는 것은 옮기지 않습니다. 여기에는 자주 바뀌는
  긴 흐름을 둡니다.
- **`act` 바로 뒤에 `expect` 를 둡니다.** 그 단언이 통과해야 걸음이 `.e2e/cache/` 에 녹화되고, 다음 실행은 모델 없이
  되풀이합니다. `agent.assert` · `waitFor` · `extract` 는 녹화되지 않고 매번 모델을 부릅니다.
- 녹화는 커밋합니다. 화면이 바뀌어 맞지 않으면 에이전트가 이어받아 다시 녹화하므로, 바뀐 파일을 함께 커밋합니다.
  실행마다 바뀌는 값은 `unique()` 로 감쌉니다.
- 모델을 부를 때는 저장소 뿌리의 `.env.local` 에 `AI_GATEWAY_API_KEY` 가 있어야 합니다. 녹화만 되풀이할 때는 필요 없습니다.
- ⚠ **탐색(`explore`)의 보고는 주장입니다.** 주소로 바로 열면 틀이 먼저 서는데(루트 `CLAUDE.md` 「정적 껍데기」) 탐색이
  그 틈을 「비어 있다」로 읽습니다. 2026-10-02 에 11건을 받아 6건이 그것이었습니다. 하나씩 가려낸 뒤에 결함이라고 합니다.
- ⚠ Playwright e2e 와 같은 `.next` 를 씁니다. 둘을 한꺼번에 돌리지 않습니다.
- 기능을 더 알아야 하면 `node_modules/e2e/skills/e2e/` 의 스킬 글을 읽습니다(`npx e2e guide <주제>` 가 같은 글을 찍습니다).

## 새 도메인을 붙일 때

1. `packages/<도메인>` 을 세우고 `check-dependencies.mjs` 의 `LAYER` 와 `check-invariants.mjs` 의 카탈로그에 줄을 더한다
2. 테스트 이름을 확인받고 순수 규칙 → 포트 → 메모리 구현과 계약 → 마이그레이션(새 스키마 · 이 앱의 롤에 GRANT) →
   Postgres 어댑터 → 유스케이스 → 액션 · 화면 → 시드 → e2e 차례로 세운다
   화면은 루트 `CLAUDE.md` 「정적 껍데기」의 점검표를 지난다(조회는 `appRead`, 기다리는 얼굴은 같은 컴포넌트의 `loading`)
   화면의 글은 코드가 선 다음 `ux-writing` 스킬로 따로 한 번 보고 `scan-copy.mjs` 를 돌린다
3. 예시 도메인 `notes` 가 그 한 벌의 본보기다. 필요 없어지면 패키지 · 마이그레이션 · 시드 · 라우트 · e2e 를 함께 걷는다
