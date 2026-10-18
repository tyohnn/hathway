# 저장소 밖의 함정

## Vercel

- 팀 Pax Humana. 프리뷰 빌드는 끈다. Ignored Build Step: `[ "$VERCEL_GIT_COMMIT_REF" != "<production 브랜치>" ]`.
- `$VERCEL_ENV` 로 쓰면 main 의 git 배포까지 취소됐다. `gitProviderOptions.createDeployments=disabled` 는 main 자동 배포도 멈추므로 쓰지 않는다.
- 머지 뒤 production 배포가 CANCELED 가 아닌지 본다. 그렇다면 `POST /v13/deployments`(gitSource)로 다시 배포한다.
- 프리뷰 주소에 기대지 않는다. 확인은 로컬 프로덕션 빌드 아니면 production 이다.
- Vercel API 확인은 스레드에서 한다(코디네이터의 서브에이전트는 api.vercel.com 에 닿지 못한다).

## Supabase

- 서울 리전. 마이그레이션은 파일이 먼저이고 손으로 쓴다(`db pull` · `db diff` 금지). `--linked` 로 reset 하지 않는다.
- 앱 롤 비밀번호는 Vercel `WEB_DATABASE_URL` 에만 둔다.

## GitHub

- tyohnn 저장소의 GitHub Actions 는 계정 결제 문제로 돌지 않는다. CI 빨강은 코드 실패가 아니다. PR 의 검증 표에 「못 돌림」과 그 까닭을 적는다.
- john-yeon 은 tyohnn/opic 의 협업자가 아니라 담당 · 리뷰 요청이 실패한다.
- 쌓인 PR: 머지된 바닥 브랜치를 지우면 그 위에 쌓인 PR 이 저절로 닫힌다. 지우기 전에 다음 PR 의 base 를 main 으로 옮긴다.
- PR 사진은 `assets/pr-screenshots` 브랜치에 올려 링크한다.

## 공유 폴더 · 파일

- 공유 폴더는 PNG · SVG 에 C2PA 메타데이터를 6KB 쯤 붙인다. 저장소에 옮기기 전에 걷는다(10KB 로고 제한).
- 비밀값은 메모리 · 공유 폴더에 적지 않는다.

## 화면

- `GallerySection` 등 블록에 넘기는 링크 요소는 클라이언트 컴포넌트에서 만든다(React #130).
- e2e 포트에 개발 서버가 떠 있으면 먼저 내린다. 스모크가 개발 서버를 재면 빨개진다.
- 개발 서버의 「Blocking Route」는 정적 껍데기 규칙을 어긴 것이다(CLAUDE.md 「화면: 정적 껍데기」).
