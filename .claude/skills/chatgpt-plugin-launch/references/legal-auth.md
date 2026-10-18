# 처리방침 · 약관 · 구글 로그인 · PostHog 동의

## 처리방침과 약관

- `/privacy` · `/terms`. 내용은 `apps/web/src/content/legal/index.ts` 의 `SERVICE` 상수 한 곳에 모은다.
- **코드에서 쓴다.** 어떤 값을 모으는지, 누구에게 맡기는지(Supabase · Vercel · PostHog · OpenAI · 결제사), 어디로 넘어가는지(국외 이전),
  얼마나 두는지를 코드와 환경변수에서 읽고 적는다. 글과 코드가 어긋나면 심사에서 걸린다.
- 운영 주체: 메모리 `paxhumana-operator-facts`(상호 · 대표 · 사업자번호 · 주소 · 통신판매업 신고번호 · 대표 전화 · contact@paxhumana.io).
  따로 정한 책임자가 없으면 대표가 개인정보 보호책임자다. 주민번호 조각은 어디에도 옮기지 않는다. scaffold 에는 자리표시만.
- 구글 사용자 데이터 절: Google API 로 받은 정보의 쓰임과 Limited Use 준수 문장을 한국어 · 영어로.
- 남의 상표를 쓰면 「관계없음」 문장(예: 「OPIc은 ACTFL의 상표이며 오픽뉴런은 ACTFL·LTI와 관계없습니다」).
- 바닥글에 처리방침을 굵게, 연결 동의 화면에 약관 안내 한 줄.

## 구글 로그인

- 사용자가 GCP 에서 OAuth 클라이언트를 만들고 Supabase Auth Google 제공자에 넣는다. 값은 채팅으로 받지 않는다.
- 브랜딩: 앱 이름은 사이트 이름과 글자까지 같게, 홈 · 처리방침 · 약관은 자기 도메인 주소, 승인된 도메인, 지원 메일 contact@paxhumana.io.
- Search Console 소유자와 GCP 소유자가 같은 계정이어야 한다(felix@paxhumana.io).
- 공유 도메인(`vercel.app`) 홈페이지는 거절당했다. 자기 도메인으로 옮기고 「문제를 해결함」을 내자 통과했다.
- 로컬은 이메일 · 비밀번호 시드 계정으로 개발하고 검사한다(구글 리디렉션은 로컬 주소를 등록하지 않는다).

## PostHog 동의

- US 리전. 토큰은 Vercel production 에만, 프리뷰는 `NEXT_PUBLIC_POSTHOG_SINK=rehearsal`.
- `/ingest` 프록시, `cookieless_mode: "on_reject"`: 고르기 전에는 아무것도 보내지 않는다(hwp-pilot#8 에서 글과 맞췄다).
- 배너 글: 「더 나은 서비스를 위해 쿠키를 사용해요. 거절해도 서비스는 그대로 쓸 수 있어요.」
- 세션 리플레이: 동의한 사람만, 입력은 가림, 최소 길이 5초, 30일 보관을 처리방침에 적는다. 무료 범위 5천 건, 결제 한도 $0.
- 확인: 배포 뒤 동의 · 거절 두 길을 실물에서 본다. 헤드리스 확인은 데스크톱 UA + `--disable-blink-features=AutomationControlled`
  (posthog-js 가 HeadlessChrome 을 버린다).
