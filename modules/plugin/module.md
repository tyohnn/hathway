# 플러그인 익스텐션 (plugin)

이 제품의 MCP 를 ChatGPT 의 플러그인으로 세운다. 사이드바 · 대화 옆 패널 · 설정 · 컴포저 · 파일 뷰어에 제품이 제 자리를
갖는다. 스펙은 <https://github.com/openai/mcp-extensions/blob/main/docs/spec.md> 이고, 까닭과 사용자 결정은
`docs/decisions/2026-10-02-플러그인-익스텐션은-MCP-위의-표시이고-SDK-없이-얹는다.md` 에 있다.

익스텐션은 따로 서는 패키지가 아니라 **MCP 서버 위의 표시**다. 조각은 셋이다.

| 조각 | 무엇 | 자리 |
|---|---|---|
| 서버 | 도구의 `_meta` 와 capability 로 「이 도구를 사이드바에 세워라」를 말한다 | `apps/web/src/modules/plugin/` |
| 화면 | `ui://` 자원으로 내주는 HTML 한 장. 호스트가 iframe 으로 띄운다 | `apps/web/src/modules/plugin/app/` |
| 패키지 | 사람이 까는 묶음. 매니페스트 · 스킬 · 아이콘과 로컬 마켓플레이스 | `plugin/` · `.agents/plugins/marketplace.json` |

## 켜면 생기는 것

스펙의 익스텐션 열둘이 예시 도메인 `notes` 로 한 번씩 선다. 새 제품에서는 이 본보기를 제 도메인으로 바꾼다.

| 익스텐션 | 본보기 | 서는 자리 | 받는 곳 |
|---|---|---|---|
| 사이드바 앱 · 바로 가기 | `open_library` 쪽지 목록, 바로 가기 「쪽지 쓰기」 | `surface.ts` | 전부 |
| 대화 옆 패널 | `open_tray` 서랍 | `surface.ts` | 전부 |
| 파일 뷰어 · 편집기 | `open_file` 이 `.md` · `.txt` 를 열고 고쳐 저장한다 | `surface.ts` · `app/main.ts` 의 `loadFile` · `saveFile` | 데스크톱 |
| 구조화 설정 | `read_settings` · `update_settings` | `views.ts` 의 `settingsReadResult` | 전부 |
| 표시 방식 | 쪽지 목록은 전체 화면, 서랍은 대화 안 | `surface.ts` 의 `uiContents` | 전부 |
| 딥링크 | `/notes/<번호>` 로 그 쪽지를 펼친다 | `deepLink.ts` · `app/state.ts` | 안드로이드 제외 |
| 모델 컨텍스트 | 고른 쪽지를 제목 달린 첨부로 알린다 | `app/state.ts` 의 `modelContextFor` | 전부 |
| 메시지 | 「지금 대화에 보내기」 · 「새 대화에 보내기」 | `app/main.ts` 의 `sendMessage` | 전부 |
| 로컬 파일 열기 | 파일 뷰어의 「기본 뷰어로 열기」 | `usecases.ts` 의 `revealFilePath` | 데스크톱 |
| 컴포저 멘션 | `search_mentions` 가 `note://<번호>` 를 돌려준다 | `views.ts` 의 `mentionItems` | 데스크톱 |
| 리치 폼 | `pick_note` · `compose_note` · `attach_notes` | `forms.ts` · `requestState.ts` | 데스크톱 · 웹 |
| 온보딩 | `plugin/skills/setup` 이 할 수 있는 일을 알리고 홈을 연다 | `plugin/plugin.json` | 전부 |

## 채우는 확장 지점

| 확장 지점 | 이 모듈의 답 | 없을 때(코어의 기본) |
|---|---|---|
| `McpSurface` | 도구 열하나 · 화면 자원 셋 · `note://` 자원 · 설정 capability | 아무것도 더하지 않음 |

요금제의 문(`PlanLimits.mcp`)은 코어의 조립(`usecases/mcp.ts`)이 건다. 이 모듈의 도구와 `note://` 자원도 같은 문을 지나고,
화면 자원(`ui://`)만 문 앞에서 내준다.

## 지키는 것

- 쪽지는 코어의 유스케이스로만 읽고 쓴다. 쪽지 목록 · 서랍 · 멘션 · 폼의 선택지 · `note://` 자원이 모두 `listNotes` 와
  `openNote` 를 지난다(INV-NOTE-01 · INV-NOTE-02).
- 도구의 인자로 테넌트나 계정을 받지 않는다. 설정의 포트도 행위자만 받는다.
- 화면과 도구의 답에는 고른 칸만 싣는다. 테넌트와 쓴 사람의 id 는 싣지 않는다.
- 폼의 답은 밖에서 온 입력이다. 서명된 상태가 맞아야 받고, 받은 답도 유스케이스로 다시 연다.

`packages/preferences/src/invariants.ts` 의 `INV-PREFERENCE-*` 는 이렇다.

- 01 설정은 그 사람이 그 조직에서 고른 것이고, 자기 것만 읽고 쓴다.
- 02 모르는 칸과 어휘 밖의 값은 고치지 않는다. 하나라도 틀리면 통째로 받지 않는다.
- 03 한 사람이 한 조직에서 갖는 설정은 한 줄이다.

## 요구하는 것

- 다른 모듈: 없다. 결제 모듈이 있으면 무료 조직은 도구를 부를 때 까닭을 답으로 듣는다.
- 환경값: 따로 없다. 시장 데이터와 보드는 앱의 접속(`WEB_DATABASE_URL`)으로 읽고 쓴다. 폼으로 되묻는 도구가 없어서
  상태를 서명할 비밀도 두지 않는다(`requestState.ts` 는 그런 도구를 다시 세울 때를 위해 남겼다).
- 스키마: `preferences`. `web_app` 이 읽고 고친다.

## 화면을 고칠 때

화면은 `app/` 의 TypeScript 를 esbuild 로 구운 HTML 한 장이고, 구운 것(`app/bundle.generated.ts`)을 커밋한다.

```
node apps/web/src/modules/plugin/app/build.mjs
```

- `app/` 을 고치고 굽지 않으면 `package.test.ts` 의 「구운 앱이 소스와 같다」가 빨개진다.
- `app/` 의 파일은 서버의 것을 import 하지 않는다. 서버와 함께 쓰는 조각은 `shared.ts` 와 `deepLink.ts` 뿐이다.
- 화면을 크게 바꿔 호스트가 옛 화면을 붙들고 있으면 안 될 때는 `surface.ts` 의 `ui://` 주소 끝에 판을 붙여 바꾼다.
- 화면은 제품의 디자인 시스템을 입지 않고 호스트가 주는 CSS 변수를 읽는다(`app/app.css`).

## 눈으로 보려면 (로컬 미리 보기)

호스트를 흉내 낸 창을 로컬에 띄운다. 서버 · DB · 화면은 진짜이고 호스트만 가짜다.

```
npx turbo dev --filter=@hathway/web
node apps/web/src/modules/plugin/preview/server.mjs
```

찍힌 주소(web 의 포트에 5 를 더한 것)를 열면 개발 서버의 로그인과 동의를 지나 미리 보기가 선다. MCP 클라이언트가 붙는 사슬
(동적 등록 · PKCE · 동의 · 토큰)을 그대로 밟으므로 로그인 사슬도 함께 확인된다.

창은 ChatGPT 의 자리를 그대로 따랐다(스펙의 화면 갈무리가 본이다).

| 진짜 호스트의 자리 | 이 창에서 |
|---|---|
| 사이드바의 앱 | 왼쪽 「앱」의 「쪽지」. 가운데가 그 화면이 되고 오른쪽 아래에 컴포저가 뜬다. 쪽지를 고르면 컴포저에 첨부가 서고, ✕ 로 떼면 화면도 고른 표시를 푼다. 옆의 「＋」는 바로 가기다 |
| 대화 옆 패널 · 파일 | 대화 위의 「옆에 열기 ＋」. 「쪽지 서랍」과 호스트가 쥔 `메모.md` 가 탭으로 열린다 |
| 대화 안의 화면 · 폼 | 예시 프롬프트를 누르거나 글을 보낸다. 도구가 되물으면 대화 안에 폼 카드가 서고, 답하면 화면이 선다 |
| 컴포저의 멘션 | 글 칸에 `@` 를 친다 |
| 플러그인 화면 | 왼쪽 「플러그인」. 소개 · 구조화 설정 · 스킬이 서고, 「설정 시작」이 온보딩을 돌린다 |
| (없음) | 왼쪽 아래 「개발 도구」. 테마 · 데스크톱 능력 끄기 · 딥링크 · 밖에서 파일 바꾸기와, 화면 ↔ 호스트 ↔ 서버 사이에 오간 말 |

⚠ **모델이 없다.** 보낸 글의 낱말을 보고 도구를 고르고(`host.html` 의 `ROUTES`), 온보딩은 스킬의 차례를 대본으로 옮겨 돌린다.
   진짜 호스트에서는 모델이 도구의 설명과 스킬을 읽고 한다.

⚠ 이 창은 우리가 스펙을 읽은 대로 만든 것이다. 스펙을 잘못 읽었으면 서버와 이 창이 함께 틀린다. 실물의 확인을 대신하지 않는다.

## 실물 ChatGPT 에 붙이려면 (사람이 할 일)

로컬 e2e 는 호스트를 흉내 낸 창으로 우리 쪽의 말만 잰다. 호스트가 그 말을 알아듣는지는 붙여 본 사람이 확인한다.

1. 서버를 공개 HTTPS 주소로 띄운다. 배포하거나, 로컬이면 [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)
   이나 HTTPS 터널을 쓴다.
2. 원격 Supabase 의 대시보드에서 OAuth 서버와 동적 등록을 켠다(`docs/supabase-migrations/README.md` §3).
3. 배포 환경에 `WEB_DATABASE_URL` 이 있는지 본다. 도구가 시장 데이터를 거기서 읽는다.
4. ChatGPT 의 설정 › 보안 및 로그인에서 개발자 모드를 켜고, [chatgpt.com/plugins](https://chatgpt.com/plugins) 의 더하기 단추로
   `https://<주소>/api/mcp` 를 등록한다. 로그인하고 허용하면 도구 목록이 뜬다.
5. 주소창의 `plugin_asdk_app_…` 을 `plugin/.app.json` 의 `apps` 에 `{"<이름>": {"id": "asdk_app_…"}}` 꼴로 적는다.
   `plugin/mcp.json` 의 주소도 배포한 주소로 바꾼다.
6. ChatGPT 데스크톱 앱을 다시 띄우고 플러그인 디렉터리에서 이 저장소의 마켓플레이스를 골라 깐다.
   (`.agents/plugins/marketplace.json` 이 `./plugin` 을 가리킨다.)
7. 아래를 하나씩 본다. 틀린 것은 결정 기록의 「확인하지 못한 것」과 대조한다.
   - 사이드바에 「쪽지」가 서고, 대화의 탭에 「쪽지 서랍」이 선다
   - 플러그인 상세 화면의 설정이 바꾼 값을 다음에도 보인다
   - 컴포저에서 `@` 로 쪽지가 찾아진다(데스크톱)
   - `.md` 파일을 열면 우리 화면이 뜬다(데스크톱)
   - 「쪽지 골라 줘」에 폼이 뜬다. 뜨지 않으면 `forms.ts` 의 `FORM_METHOD` 를 본다

## 알고 둘 한계

- **폼은 새 판(2026-07-28)의 클라이언트에만 뜬다.** `initialize` 로 악수하는 클라이언트에는 같은 도구가 글로 안내한다.
- **앱만 부르는 도구도 목록에는 선다.** MCP Apps 를 아는 호스트는 `visibility: ["app"]` 인 도구를 모델에게 보이지 않지만,
  모르는 클라이언트(클로드 코드 등)는 목록 그대로 보인다. 불려도 해롭지 않게 서 있다. `reveal_file_path` 는 호스트가 얹은
  자리가 없으면 오류로 답한다.
- **요금제의 문에 서는 글이 「Claude 연결」이다.** 코어의 글이라 이 모듈이 바꾸지 않았다(`wiring.md`).
- **설정의 선택지는 값이 곧 화면의 글이다.** 공개 범위의 말을 바꾸면 이미 저장된 값은 그대로이고(표에는 `private` ·
  `tenant` 가 적힌다) 화면의 말만 바뀐다.

## 파일

| 파일 | 무엇 |
|---|---|
| `owns.json` | 이 모듈만 갖는 자리 · 패키지 · 의존성 · 환경값. `check:modules` 가 읽는다 |
| `wiring.md` | 코어에 잇는 자리와 잇는 법. 기계식 표시 줄과 판단이 드는 자리 |
| `acceptance.json` | 붙이거나 뗀 뒤 지나야 할 검사 |
