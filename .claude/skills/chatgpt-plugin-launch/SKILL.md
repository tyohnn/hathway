---
name: chatgpt-plugin-launch
description: 새 ChatGPT 플러그인 제품을 scaffold 복제부터 ChatGPT 앱 제출까지 세울 때 쓰는 단계별 체크리스트. 오픽뉴런과 한글파일럿을 출시하며 실제로 밟은 순서와 함정을 담았다.
---

# ChatGPT 플러그인 제품 출시 체크리스트

오픽뉴런(tyohnn/opic)과 한글파일럿(tyohnn/hwp-pilot)을 만들며 실제로 한 일을 차례대로 묶었다. 새 제품은 이 순서를
위에서 아래로 지나간다. 단계마다 **할 일 · 사용자에게 받을 것 · 쓸 도구 · 함정**이 있다. 긴 설명은 `references/` 에 있다.

참고 문서는 이 스킬 폴더의 `references/` 에 있다. 공유 폴더 경로(`/mnt/project-files/…`)는 Pax Humana 프로젝트 안에서만 열린다.

| 파일 | 무엇 |
|---|---|
| `mcp-ui.md` | MCP 화면(익스텐션)이 뜨는 길, 열두 익스텐션, 실물 ChatGPT 연결, 함정 |
| `seo-gsc.md` | SEO · GEO · Search Console · 도메인 |
| `legal-auth.md` | 처리방침 · 약관, 구글 로그인 브랜딩, PostHog 동의 |
| `review-submission.md` | 리뷰 계정, 테스트 케이스, 제출 양식 |
| `pitfalls.md` | 저장소 밖의 함정(Vercel · GitHub · PR · 공유 폴더) |

## 시작하기 전에: 빨리 가는 법

- **사용자에게 한 번에 묻는다.** 아래 「받을 것」을 단계마다 따로 묻지 말고, 0단계에서 한 장으로 모아 묻는다.
  답이 없는 칸은 합리적인 기본값을 고르고, 무엇을 골랐는지 말한 뒤 계속 간다.
- **사람만 할 수 있는 일을 일찍 꺼낸다.** 도메인 구매 승인, 구글 콘솔 브랜딩, Search Console 소유 확인,
  OpenAI 대시보드의 앱 만들기, PostHog 토큰은 사용자가 한다. 기다리는 동안 코드 일을 하도록 맨 앞에 요청한다.
- **화면은 기획 단계에서 정하고 만든다.** 홈 · 온보딩 · MCP 화면은 사용 흐름에서 바로 나오므로 1단계에 둔다.
  2단계는 그 화면을 세상에 내놓기 위한 일(도메인 · 법률 · 로그인 · 분석 · 검색 · 영어)이다.
- **스레드 하나가 Linear 하위 이슈 하나, PR 하나다.** 서로 닿지 않는 단계(로고 · 법률 문서 · SEO · 온보딩)는 스레드를
  나눠 함께 돌린다. 같은 파일(예: `middleware`, `layout.tsx`)을 고치는 단계는 차례로 둔다.

## 0. 일하는 방식(모든 단계 공통)

1. **Linear 이슈부터.** 팀 `Pax Humana`(키 `SSO`)에 제품 프로젝트를 하나 만든다(예: 「OPIc 런칭」 · 「HWP Pilot Launching」).
   하위 이슈 하나가 PR 하나다. 시작하면 In Progress, PR 을 열면 In Review, 머지되면 Done 으로 옮긴다. GitHub 이슈는 쓰지 않는다.
2. **dev-playbook 을 깐다.** 새 저장소에 `install.sh` 로 넣으면(opic#9 · hwp-pilot#1) CLAUDE.md 「개발 과정」 일곱 단계와
   `npm run pr:check`(`scripts/pr-check.mjs`), 서브에이전트 `convention-reviewer` · `ux-writing-reviewer` 가 들어온다.
3. **차례:** 이슈 → 테스트 이름(`spec-by-test`) → 빨강에서 초록(`tdd`) → `npx supabase start` 와 `npm run pr:check` →
   규약 점검(보안 · 구조 · 화면 글을 서브에이전트 셋이 함께) → `main` 을 받고 한 번만 push, 초안 PR → 머지 → Done.
4. **진행 카드.** 스레드 보고는 `progress-board` 스킬로 그린 카드(이슈부터 머지까지의 칸, 테스트 표, 「필요한 것」 막대)를 붙인다.
   저장소 밖의 일은 `/mnt/project-files/templates/test-status-card/` 의 `render.mjs` 를 쓴다. 손으로 그리지 않는다.
5. **글.** 화면 글은 `ux-writing` 을 읽고 `scan-copy.mjs` 를 돌린다. 문서 · PR · 주석은 `fluent-korean` 을 읽는다.

**받을 것(한 장으로):** 제품 한 줄 설명과 주 사용자, 제품 이름 후보, 저장소 이름, 원하는 분위기(디자인 시스템 후보),
도메인 예산, 결제를 붙일지, 운영 주체가 팍스휴마나인지.

---

## 1단계. 기획 · 기반

### 1-1. scaffold 로 저장소 만들기

- **할 일**
  - tyohnn/scaffold 에서 `./create.sh <이름> --title "<화면 이름>" --brief "<제품 설명>" --with <모듈들>` 을 돌린다.
    모듈: billing · content · dashboard · orders · planning · plugin · posthog · templates-kit · workspace.
    ChatGPT 플러그인 제품이면 `plugin` 과 `posthog` 는 반드시 켠다.
  - 포트는 주지 않으면 이웃 저장소를 훑어 비어 있는 대역을 고른다. 고른 대역을 CLAUDE.md 「로컬 스택」의 이웃 목록에 더한다
    (opic 4100 · 5452x, hwp-pilot 4200 · 5458x).
  - GitHub `tyohnn/<이름>` 비공개 저장소를 만들고, 첫 커밋을 책임별로 나눈다(도구 → 의존성 → 패키지 골격 → … → 문서).
  - 바로 이어서 `/scaffold-fit` 을 부른다. 제품의 명사와 일로 라우트 지도를 그려 확인받고, 템플릿 화면을 걷는다.
    고칠 화면 모듈은 `scripts/module-adopt.mjs` 로 먼저 편입한다.
  - Supabase 프로젝트(서울 리전)와 Vercel 프로젝트(팀 Pax Humana, Root `apps/web`, 리전 `icn1`, Node 22)를 만든다.
- **받을 것:** 이름(스코프가 된다), 화면 이름, 제품 설명, 켤 모듈.
- **함정**
  - scaffold 원본에 제품 코드를 쓰지 않는다. 공용 기반을 고칠 일이면 scaffold 에 PR 을 따로 낸다.
  - 처음 로그인한 사람이 혼자의 고객 테넌트로 가입되는지 본다. opic 은 `org.sign_up`(INV-ACCESS-11)이 있었고
    hwp-pilot 은 처음에 없어서 새 사람이 `/no-access` 로 갔다.
  - Vercel 프리뷰 빌드는 처음부터 끈다(`pitfalls.md` 「Vercel」).

### 1-2. 이름 · 도메인

- **할 일:** 이름 후보마다 도메인(.com · .app · .ai · .io)이 비어 있는지와 상표 위험을 본다. **도메인은 이 단계에서 산다.**
  구글 OAuth 브랜딩이 `vercel.app` 홈페이지를 계속 거절했고, `hwpilot.com` 을 사고서야 통과했다. 색인이 쌓인 뒤에 주소를 옮기면 비싸다.
- **받을 것:** 고른 이름(한글 · 영문), 도메인 구매 승인(Vercel 에서 산다, 등록자 정보 필요).
- **함정**
  - 남의 상표를 이름에 쓰면(OPIc 은 ACTFL 의 것) 바닥글 · ChatGPT 앱 설명 · 법률 문서에 「관계없음」 한 줄을 넣는다.
    앱 심사는 사칭을 막는다.
  - ChatGPT 에 보이는 이름은 네 곳에서 온다. OpenAI 대시보드의 앱 이름, `plugin.json` 의 `displayName`, MCP `serverInfo.title`,
    사이드바 도구의 제목이다. 넷을 같은 이름으로 맞춘다.

### 1-3. 디자인 시스템(tyohnn/ui)

- **할 일**
  - tyohnn 의 시스템(graphite · loam · cirrus · halo · nocturne · vellum · clover)을 미리보기로 보이고 하나를 고르게 한다.
    고른 값은 루트 `tyohnn.json` 이 정본이고, 갈아입는 법은 `docs/design-system/README.md` 에 있다.
  - 제품에만 쓸 주 색이 필요하면 `apps/web` 의 `globals.css` 밝은 모드 블록에서 덮는다. 시스템 자체를 바꾸지 않는다.
  - `npm run check:tokens -w @<스코프>/ui` 로 정의 없는 토큰이 0 인지 본다.
- **받을 것:** 시스템 이름, 밝은 모드만 쓸지, 제품 주 색.
- **함정:** `packages/ui` 를 손으로 고치지 않는다(받아 둔 자리다). 아이콘은 `@<스코프>/ui/icons` 의 의미 이름으로만 쓰고
  `@hugeicons/*` · `lucide-react` 를 화면에서 직접 부르지 않는다. 맞는 이름이 없으면 tyohnn 에 이름을 더하는 일로 따로 올린다.
  한글파일럿은 vellum, 오픽뉴런은 clover 다.

### 1-4. 웹 · 플러그인 UX 와 사용 흐름

- **할 일**
  - `ia-design` 순서(핵심 루프 → 객체 → 라우트 → 그릇)로 **웹과 플러그인을 따로** 지도를 그린다.
    원칙: 제품은 대화이고 화면은 다음 한 걸음을 돕는다. 확장은 사람을 웹으로 내보내지 않지만, 웹은 웹대로 실제 기능을 가질 수 있다.
    화면을 고르는 법은 `mcp-ui.md` 「화면을 고르는 법」과 방법론 문서 `ux-methodology.md` 를 따른다.
  - 사용 흐름 50개를 써 본다(「누가 · 언제 · ChatGPT 에 뭐라고 말하고 · 어느 도구가 · 어떤 화면을 내는가」).
    본보기: `/mnt/project-files/플러그인-사용-흐름-50*.md`. 흐름에서 도구 목록과 각 도구의 화면이 나온다.
  - 카탈로그형 제품이면 갤러리 홈(구획마다 제목과 「모두 보기」, 한 줄에 카드 넷, 아래에 분류 타일)을 제안한다.
    scaffold dashboard 모듈의 `/explore` 와 블록 `GallerySection` 이 본보기다.
  - 화면 지도를 아티팩트로 올려 확인받는다.
- **받을 것:** 주 사용자가 누구인지(한글파일럿은 공고를 읽는 창업자보다 매일 한글을 쓰는 공공기관 사람이 많았다), 핵심 행동 하나.
- **함정**
  - 모든 화면의 첫째 행동은 「ChatGPT에서 열기」다. 주소는 `https://chatgpt.com/plugins/<app id>?open_in_app` 이고 상수 하나에 둔다.
  - `GallerySection` 에 넘기는 링크 요소는 클라이언트 컴포넌트에서 만든다. 서버에서 만들면 React #130 으로 빈 화면이 된다.

### 1-5. 홈 화면

- **할 일:** 웹 홈과 사이드바 홈을 같은 짜임으로 만든다(한글파일럿 hwp-pilot#37). 첫째 단추는 「ChatGPT에서 열기」(또는 설치 전이면
  「ChatGPT에 추가하기」). 공개 첫 화면(랜딩)은 제목 한 줄과 영상과 아주 큰 단추 하나로 짧게 둔다. 중복되는 구획은 걷는다.
  사이드바 글은 한 파일(`app/copy.ts`)에 모은다.
- **함정:** 사용자의 문장을 그대로 붙이지 말고 다시 쓴다. 「삭제」처럼 정한 낱말을 지킨다.

### 1-6. 로그인 뒤 온보딩

- **할 일:** 처음 로그인하면 `/welcome` 으로 보내 질문 서넛을 묻는다(한글파일럿: 어디서 일하는지 · 한글을 언제 쓰는지(여럿 고름) ·
  뭐라고 불러야 하는지). 오른쪽에 답이 바로 반영되는 미리보기를 둔다. 답은 제 표(예: `workprofile`)에 두고 홈 묶음의 기본 차례를 정한다.
  설정에서 끌어서 차례를 바꾸고 「기본 차례로 되돌리기」를 둔다. 건너뛴 사람은 홈 맨 위에 카드로 다시 권한다.
  플러그인 사이드바도 같은 답을 따른다.
- **함정:** 이름 바꾸기는 소유주 · 관리자만. e2e 는 시작마다 온보딩 줄을 지우는 전용 계정을 쓴다(`fresh@example.test`).

### 1-7. ChatGPT 안에서만 도는 MCP 화면과 익스텐션

- **할 일:** 1-4 의 사용 흐름에서 도구 목록과 도구마다의 화면(인라인 카드 · 옆 탭 · 사이드바)을 먼저 정한다. 그다음 scaffold `modules/plugin/module.md` 를 따른다. 익스텐션은 따로 된 꾸러미가 아니라 MCP 서버의 표시다.
  도구마다 `_meta.ui.resourceUri` 와 `"openai/ui"` entrypoint 를 달고, 화면은 HTML 한 파일로 구워 커밋한다.
  사이드바 홈 · 스레드 패널 · 파일 열기 · 표시 모드 · 「대화에 추가」(`ui/update-model-context`) · 메시지 보내기를 흐름에 맞춰 고른다.
  로컬 미리보기 호스트로 먼저 보고, **실물 ChatGPT 에서 꼭 확인한다.**
- **받을 것:** OpenAI 대시보드에서 앱을 만들고 받은 `plugin_asdk_app_…` id, 개발자 모드.
- **함정:** 도구 이름을 바꾸면 사용자가 저장한 「항상 이 앱으로 열기」가 깨진다. 화면은 도구마다 고정이다. `resources/read` 에
  `ttlMs` · `cacheScope` 가 없으면 ChatGPT 가 HTML 을 버린다. 데스크톱은 `codex-sandbox:` 를 `app:` 안에 겹친다.
  앱을 다시 만들면 id 가 바뀌고, 옛 앱은 지워지지 않을 수 있다. 자세한 것은 `mcp-ui.md`.

### 1-8. 로고

- **할 일:** SVG 시안 셋을 그리고 512 · 32 · 16px PNG 로 구워 작은 크기에서도 읽히는지 보인다. 고른 것을 아래에 모두 넣는다.
  `favicon.ico` · `app/icon.svg` · `apple-icon.png` · `plugin/assets` · MCP 의 `ICON_SVG` · `Brand.tsx`.
  ChatGPT 앱 로고는 **10KB 미만**(256px)으로 따로 만든다. 사이드바 아이콘은 한 가지 색의 선 그림이어야 한다.
- **받을 것:** 고른 시안.
- **함정:** 남의 로고와 닮지 않게 한다(한컴의 파랑 + ㅎ + 띠). 공유 폴더는 PNG · SVG 에 C2PA 메타데이터를 6KB 쯤 붙이므로
  저장소에 옮기기 전에 걷는다. 그대로면 10KB 를 넘는다.

---

## 2단계. 출시 전

### 2-1. 배포와 도메인 잇기

- **할 일:** 도메인을 Vercel 프로젝트에 붙이고(www 는 apex 로 308), 사이트 주소 설정(`NEXT_PUBLIC_SITE_URL`)과 Supabase
  `site_url` · 허용 주소, canonical, sitemap, 플러그인 매니페스트, MCP 주소를 **같은 PR 하나에서** 옮긴다(hwp-pilot#29).
  환경변수는 production 에만 실물 값을 넣는다. `WEB_DATABASE_URL` 은 풀러(6543)이고 앱 롤 비밀번호는 Vercel 에만 둔다.
- **함정:** 머지 뒤 production 배포가 CANCELED 로 끝나지 않았는지 꼭 본다(`pitfalls.md`).

### 2-2. 개인정보처리방침 · 이용약관

- **할 일:** `/privacy` · `/terms` 를 **코드의 실제 데이터 흐름에서** 쓴다(수집 항목 · 위탁사 · 보관 기간 · 국외 이전).
  내용은 `apps/web/src/content/legal/index.ts` 의 `SERVICE` 상수에 모은다. 운영 주체 정보는 메모리 `paxhumana-operator-facts`.
  구글 사용자 데이터 절(Limited Use 문장, 한국어 · 영어)을 넣는다. 바닥글에 처리방침을 굵게, 연결 동의 화면에 약관 안내를 둔다.
- **받을 것:** 운영 주체가 팍스휴마나가 아니면 그 사업자 정보.
- **함정:** 글과 코드가 어긋나면 심사에서 걸린다(PostHog 를 「거절하면 안 보낸다」고 적었으면 코드도 그래야 한다, hwp-pilot#8).
  scaffold 에는 자리표시만 둔다. 사업자등록증의 주민번호 조각은 어디에도 옮기지 않는다. 자세한 것은 `legal-auth.md`.

### 2-3. 구글 로그인

- **할 일:** 사용자가 GCP 에서 OAuth 클라이언트를 만들고 Supabase Auth 의 Google 제공자에 넣는다. 브랜딩에 홈페이지 ·
  `/privacy` · `/terms` 를 **자기 도메인**으로 적고, 승인된 도메인을 더하고, 검증을 요청한다.
- **받을 것:** 사용자의 콘솔 작업(클라이언트 ID · 비밀값은 Supabase 대시보드에만 넣게 한다. 채팅으로 받지 않는다).
- **함정:** 동의 화면의 앱 이름이 사이트의 이름과 글자까지 같아야 한다. Search Console 소유자와 GCP 소유자가 같은 계정이어야 한다
  (felix@paxhumana.io). 지원 메일은 contact@paxhumana.io.

### 2-4. PostHog

- **할 일:** US 리전 프로젝트, 토큰은 Vercel production 에만(프리뷰는 `NEXT_PUBLIC_POSTHOG_SINK=rehearsal`), `/ingest` 프록시,
  거절하면 쿠키 없이(`cookieless_mode: on_reject`). 쿠키 배너 글: 「더 나은 서비스를 위해 쿠키를 사용해요. 거절해도 서비스는 그대로 쓸 수 있어요.」
  배포 뒤 동의 · 거절 두 길을 실물에서 확인한다.
- **받을 것:** `phc_` 토큰, 세션 리플레이를 켤지(켜면 처리방침에 한 줄: 동의한 사람만, 입력은 가림, 30일 보관).
- **함정:** posthog-js 는 HeadlessChrome 을 버린다. 데스크톱 UA 와 `--disable-blink-features=AutomationControlled` 로 확인한다.
  결제 한도는 $0 으로 둔다.

### 2-5. SEO · GEO · Search Console

- **할 일:** `seo` · `ai-seo` · `schema` 스킬을 읽는다. 뿌리 레이아웃은 noindex 로 두고 `(site)/layout.tsx` 에서 색인을 연다.
  robots · sitemap · `llms.txt` · JSON-LD · OG 그림(`app/opengraph-image.tsx`) · 문장으로 쓴 설명 · 얇은 페이지 noindex.
  Search Console 에 Domain 속성(TXT)과 HTML 파일 확인을 하고, 서비스 계정을 사용자로 더하고, sitemap 을 낸다
  (`/mnt/project-files/tools/gsc/gsc.mjs`).
- **받을 것:** Search Console 소유 확인(사용자만 할 수 있다).
- **함정:** `public/` 에 새 확장자 파일을 두면 미들웨어 matcher 제외에 더해야 한다. 아니면 로그인 안 한 사람에게 `/login` 으로 307 이 간다.
  확인 파일은 지우지 않는다. 자세한 것은 `seo-gsc.md`.

### 2-6. 영어 화면

- **할 일:** 심사자가 영어로 보므로 브라우저 언어로 고르는 ko/en 두 벌을 만든다(숨은 `[lang]` 마디, 쿠키, `generateStaticParams`).
  MCP 도구의 제목과 설명은 영어로 쓴다(`tools/list` 에는 언어가 오지 않는다). 위젯은 `openai/locale` 을 따른다.

---

## 3단계. 제출

1. **리뷰 계정**: 이메일 + 비밀번호, MFA · 메일 코드 · 매직 링크 없음, 기능 전부와 본보기 데이터, 다음 심사까지 남는 계정.
   전용 `/review-login`, 허용 목록 환경변수, 멱등 시드. 비밀번호는 만든 스레드 밖으로 옮기지 않는다. `review-submission.md`.
2. **테스트 케이스**: 성공 5개와 실패 3개를 정확히 쓴다(무엇을 말하고, 어느 도구가 불리고, 무엇이 보여야 하는가).
3. **데모 영상**: 실물 ChatGPT 에서 설치부터 핵심 흐름까지.
4. **이름 · 아이콘 · 고지**: 앱 이름 네 곳 일치, 10KB 미만 로고, 상표 고지, 처리방침 · 약관 주소.
5. **제출 양식의 Review details** 에 리뷰 계정과 순서를 적는다(꾸러미 안이 아니다).
6. **제출 뒤**: 딥링크와 홈의 「ChatGPT에서 열기」 주소를 확정하고, Linear 이슈를 정리한다.

## 끝내는 기준

- 실물 ChatGPT(웹 · 데스크톱)에서 핵심 흐름이 돈다.
- 공개 페이지가 로그아웃 상태로 200 이고(curl -I), sitemap 이 Search Console 에서 오류 0 이다.
- PostHog 동의 · 거절 두 길이 처리방침 글과 같다.
- 리뷰 계정으로 로그인해 기능 전부를 쓸 수 있다.
- Linear 프로젝트의 하위 이슈가 모두 Done 이다.
