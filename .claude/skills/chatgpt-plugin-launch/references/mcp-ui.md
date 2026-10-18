# MCP 화면과 익스텐션

정본은 scaffold 의 `modules/plugin/module.md` 와 결정 문서(2026-10-02)다. 이 문서는 두 제품을 붙이며 알게 된 것을 모은다.
옛 연구는 `/mnt/project-files/library/1-opic/플러그인-화면/`(how-screens-load.md · extension-vs-mod.md · extensions-check.md · ux-research.md)에 있다.

## 화면을 고르는 법

**제품은 대화이고, 화면은 다음 한 걸음을 돕기만 한다.** 정본은 같은 폴더의 방법론 문서
`ux-methodology.md` 이고 여기에 옮겨 적지 않는다.

- §2 쓸 수 있는 자리(글 · 인라인 카드 · 캐러셀 · 크게 보기 · PiP · 사이드바 · 스레드 패널 · 파일 탭 · 폼 · 설정 · 멘션)와 자리를 고르는 아홉 질문.
- §4 흐름표: 사람의 말에서 시작해 흐름 하나를 한 줄로 적고, 화면을 세울지 판정한다.
- §5 도구 하나마다의 점검표(열한 칸).

정한 규약(사용자 결정, 2026-10-18):

- 제품마다 흐름표는 그 저장소의 `docs/` 에 두고, 도구 점검표의 답은 그 도구를 바꾸는 PR 본문에 적는다.
- **스레드 패널**의 주 단추는 「대화에 추가」(`ui/update-model-context`)다. 고른 것을 지금 대화의 맥락에 넣는다.
- **사이드바**의 주 단추는 그 일을 시작하는 말을 보내는 단추(`ui/message`)다.
- **「확장 안에서 끝낸다」**는 확장이 사람을 웹으로 내보내지 않는다는 뜻이다. 웹은 웹대로 실제 기능을 가질 수 있다.
- **PiP**: UI 지침에는 있지만 확장 명세는 ChatGPT 가 inline 과 fullscreen 만 지원한다고 적는다(2026-10-18 다시 확인).
  호스트의 `availableDisplayModes` 에 `pip` 이 있을 때만 청한다. 없으면 진행 중인 세션은 턴마다 같은 모양의 새 카드로 보인다.

## 화면이 뜨는 다섯 걸음

1. `tools/list`: 도구가 `_meta.ui.resourceUri`(`ui://…`)와 `"openai/ui": { entrypoints: [{ type: "global" | "thread" }] }` 를 단다.
2. `resources/read`: `mimeType "text/html;profile=mcp-app"` 로 HTML **한 파일**을 낸다. esbuild IIFE 로 굽고 `bundle.generated.ts` 를 커밋한다
   (`package.test.ts` 가 구운 것이 원본과 같은지 잰다). `_meta["openai/ui"].preferredDisplayMode` 와 `ui.csp` 의
   `connectDomains` · `resourceDomains` 를 단다. ⚠ `ttlMs` · `cacheScope` 가 없으면 ChatGPT 가 HTML 을 버린다.
3. `tools/call`: `content`(모델이 읽는 글)와 `structuredContent`(화면이 그리는 값)를 낸다.
4. iframe 안: postMessage JSON-RPC 로 `ui/initialize`(protocolVersion `"2026-01-26"`), 호스트 스타일을 받고, `ui/notifications/tool-result` 로 값을 받는다.
5. 행동: `ui/message`(새 대화는 `_meta["openai/message"]`), `ui/update-model-context`(「대화에 추가」), `ui/request-display-mode`.

## 열두 익스텐션

사이드바 앱 · 바로가기, 스레드 패널, 파일 보기 · 편집(데스크톱), 구조화된 설정, 표시 모드, 딥링크, 모델 맥락, 메시지,
로컬 파일 열기, 입력창 멘션(데스크톱), 폼(`PLUGIN_STATE_SECRET` 이 상태를 서명), 온보딩 스킬.
흐름 50개에서 실제로 쓰는 것만 고른다.

## 실물 ChatGPT 에 붙이기

1. 공개 HTTPS(자기 도메인), Supabase OAuth 2.1 서버 + 동적 클라이언트 등록, 동의 경로 `/oauth/consent`.
2. ChatGPT 개발자 모드 → chatgpt.com/plugins 에 `https://<도메인>/api/mcp` 등록.
3. 받은 `plugin_asdk_app_…` 를 `plugin/.app.json` 과 Vercel `PLUGIN_DIRECTORY_ID` 에, 주소를 `plugin/mcp.json` 에.
4. Mac 로컬 마켓플레이스 `~/.agents/plugins/marketplace.json`(paxhumana-local)에 저장소의 `plugin/` 폴더를 더한다.
   새 세션이 옛 주소를 부르면 앱을 ⌘Q 로 끄고, 필요하면 지웠다가 다시 설치한다.
5. 환경변수: `PLUGIN_STATE_SECRET`, `PLUGIN_DIRECTORY_ID`.

## 동의 화면

도구마다 이름 라벨과 자세한 권한(읽기 · 쓰기 배지, Supabase 식 구분선)을 보인다(scaffold#15). 한국어 라벨은
`_meta["<제품>/title-ko"]` 에 둔다. 도구 제목과 설명은 심사를 위해 영어로 쓴다.

## 함정

- **화면은 도구마다 고정이고, 데이터는 도구 결과로만 온다.** 화면이 더 필요한 값이 있으면 `visibility: ["app"]` 인 화면 전용 도구를 더한다.
- **서버에서 칸을 글 덩이 하나로 납작하게 펴지 않는다.** 모델은 `content`, 화면은 칸이 살아 있는 `structuredContent` 를 받는다(오픽 `Card.body` 의 교훈).
- **`content` 에는 다음 한 걸음만 적는다.** 카드가 무엇을 보였는지와 다음에 할 일이면 된다. 길게 쓰면 모델이 카드를 다시 읽어 준다.
- **카드의 단추는 둘까지다**(주 하나 · 보조 하나).
- 화면이 없는 도구는 옆 탭을 열 수 없다(`openai/files/open` 은 위젯만 보낸다).
- **파일 entrypoint 가 있는 도구 이름을 바꾸지 않는다.** 데스크톱은 「항상 이 앱으로 열기」를 `~/.codex/config.toml` 의
  `desktop.preferred-file-viewers` 에 `<app id>.<도구 이름>` 으로 저장한다. open_form → open_hwp 이름을 바꾼 뒤
  「…을(를) 표시하지 못했습니다」가 떴다. 바꿔야 하면 사용자에게 앱을 다시 고르게 안내한다.
- ChatGPT 데스크톱은 위젯(`codex-sandbox:`)을 `app:` 안에 겹친다. CSP `frame-ancestors` 와 부모 출처 검사가 두 스킴을 허락해야 한다.
- 첨부 파일은 `openai/fileParams` 로 오고 바이트는 위젯이 브라우저에서 받는다. 서버로 받지 않는다. 받는 호스트를 CSP 에 더한다(실물로 확인).
- 처음엔 작은 인라인 카드로 열고, 열 문서가 있을 때만 옆 탭으로 넓힌다(hwp-pilot#38).
- 사이드바 카드는 사이드바 안에서 목록 · 상세를 열고 「대화에 추가」를 둔다(hwp-pilot#40). 웹으로 내보내지 않는다.
- 데스크톱이 로컬 경로로 연 옆 탭의 흰 아이콘은 ChatGPT 가 고른다. 우리 쪽에서 못 고친다.
- iframe 캔버스로 그린 편집기는 computer use 에 보이지 않는다. 화면 확인은 사용자의 사진이나 로컬 미리보기로 한다.
- 로컬 미리보기 호스트(`preview/server.mjs`, 앱 포트 + 5)는 실물 확인을 대신하지 못한다.
- **앱을 함부로 다시 만들지 않는다.** 옛 앱이 「플러그인을 삭제하지 못했습니다」로 남을 수 있고 길은 support@openai.com 뿐이다.
  다시 만들면 id 가 바뀌어 `.app.json` · 홈 링크 · e2e 기대값을 모두 고쳐야 한다.
