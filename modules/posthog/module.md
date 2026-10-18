# 제품 분석 (posthog)

사람이 무엇을 하는지 PostHog 로 본다. 이번 조각은 **분석**(페이지뷰 · 서버에서 알린 일 · 동의)이다. 에러 추적 · LLM 분석 ·
기능 플래그는 다음 조각이고, Messaging 은 미뤘다. 까닭과 사용자 결정은
`docs/decisions/2026-09-29-모듈은-코어의-확장-지점을-채우고-한-파일에서만-잇는다.md` 의 「PostHog 모듈」 절에 있다.

## 켜면 생기는 것

- 모든 화면의 오른쪽 아래에 **동의 배너**가 선다. 고르기 전에는 서버도 브라우저도 아무것도 보내지 않는다.
- 동의하면 브라우저가 페이지뷰를 세고, 로그인한 사람을 계정 id 와 조직에 잇는다. 서버는 액션이 알린 일
  (`note_created` · `note_archived` · `note_summarized`)을 응답 뒤에 보낸다.
- 거절하면 쿠키 없이 방문 수만 센다(`cookieless_mode: "on_reject"`). 로그아웃하면 앞 사람과 끊는다.
- `/ingest` 가 PostHog 로 가는 길이 된다. 광고 차단기가 PostHog 의 주소를 막아도 이벤트가 온다.

## 채우는 확장 지점

| 확장 지점 | 이 모듈의 답 | 없을 때(코어의 기본) |
|---|---|---|
| `ProductEvents` | 동의를 쿠키에서 읽고, 카탈로그를 지난 이벤트를 응답 뒤에 보낸다 | 보내지 않음 |
| 브라우저 쪽 자리 셋(`lib/moduleClient.ts`) | 모든 화면: 배너와 posthog-js · 로그인한 셸: identify · 로그인 화면: reset | 아무것도 그리지 않음 |

구현은 `apps/web/src/modules/posthog/` 에 있다. 보낼 수 있는 이벤트와 속성은 `packages/analytics/src/domain/Event.ts` 의
카탈로그가 정한다. 새 이벤트를 보내려면 액션의 ⑥ 에서 `ProductEvents.capture` 를 부르고 카탈로그에 한 줄을 더한다.

## 지키는 것

`packages/analytics/src/invariants.ts` 의 `INV-ANALYTICS-*` 다.

- 01 동의하지 않은 사람(고르지 않은 사람 포함)의 이벤트는 서버에서도 보내지 않는다. MCP 처럼 동의를 물을 수 없는 길도 보내지 않는다.
- 02 사람은 계정 id 로만 가리킨다. 이메일 · 이름을 보내지 않는다.
- 03 카탈로그에 있는 이벤트와 속성만 간다. 쪽지의 제목 · 본문은 가지 않는다.
- 04 LLM 호출의 입력과 출력을 보내지 않는다(다음 조각에서 세운다).

## 요구하는 것

- 다른 모듈: 없다.
- 키: 로컬과 e2e 는 없어도 돈다(`NEXT_PUBLIC_POSTHOG_SINK=rehearsal`). 서버가 모은 것은 `/api/analytics/rehearsal`,
  브라우저가 모은 것은 `window.__rehearsalAnalytics` 에 있다.

## 실물로 보내려면 (사람이 할 일)

1. PostHog 에서 프로젝트를 만들고 리전(미국 · 유럽)을 고른다.
2. 프로젝트 설정 › Web analytics 에서 **「Cookieless server hash mode」를 켠다.** 켜지 않으면 거절한 사람을 세지 못한다.
3. 로컬은 `apps/web/.env.local`, 배포는 Vercel 환경변수에 넣는다. 토큰은 공개해도 되는 값이지만 저장소에는 적지 않는다.
   - `NEXT_PUBLIC_POSTHOG_TOKEN=phc_…`
   - 유럽이면 `NEXT_PUBLIC_POSTHOG_REGION=eu`
   - 로컬에서는 `.env.development.local` 의 `NEXT_PUBLIC_POSTHOG_SINK=rehearsal` 줄을 지운다.
4. 리전과 토큰은 빌드에 박힌다. 바꾸면 다시 빌드한다.
5. 개인정보처리방침에 제품 분석과 국외 이전(PostHog 의 리전)을 적는다.

## 파일

| 파일 | 무엇 |
|---|---|
| `owns.json` | 이 모듈만 갖는 자리 · 패키지 · 의존성 · 환경값. `check:modules` 가 읽는다 |
| `wiring.md` | 코어에 잇는 자리와 잇는 법. 기계식 표시 줄과 판단이 드는 자리 |
| `acceptance.json` | 붙이거나 뗀 뒤 지나야 할 검사 |
