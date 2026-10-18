# 로컬에서 확인하기

루트 `CLAUDE.md` 「개발 과정」 3단계의 자세한 것입니다(dev-playbook 템플릿). 화면과 에이전트는 **로컬에서 확인합니다.**
배포 프리뷰에는 로컬 시드가 없으므로 프리뷰로 확인하라고 사람에게 말하지 않습니다.

## 설치와 명령

```
npm install
npx turbo dev                          # 전체(개발 서버. 화면 확인과 사진에는 쓰지 않습니다)
npx turbo dev --filter=<패키지>         # 하나만
npm run pr:check                       # PR 전 점검. 루트 CLAUDE.md 3단계
```

## 로컬 스택

```
# 클라우드 개발 환경은 도커 데몬이 꺼진 채로 시작합니다
dockerd > /tmp/dockerd.log 2>&1 &

npx supabase start
```

- 포트는 API 54581 · DB 54582 · Studio 54583 입니다(5458x 대역). `start` 가 마이그레이션과 `supabase/seed.sql` · `supabase/seeds/` 의
  가짜 데이터를 함께 붓습니다. seed 를 고쳤으면 `supabase db reset` 으로 다시 붓습니다. 로컬 전용이라 push 가 필요 없습니다.
- 계약 테스트의 접속 문자열은 각 패키지의 `vitest.config.ts` 가 로컬 기본값으로 깔아 둡니다. 어댑터 계약 테스트는 그
  패키지 안에서 돌립니다. 절차 전문은 그 앱의 `CLAUDE.md` 「테스트」에 적습니다.
- 에이전트와 스킬도 로컬 에이전트 앱에서 실제로 돌려 결과와 로그를 봅니다. 운영 DB 에는 올리지 않습니다.

## 무엇을 누르나

`agent-browser` 스킬이나 Playwright 로 로컬 주소를 엽니다.

- **이번 변경과 바로 이어지는 동작만** 누릅니다. 간접적인 영향은 `pr:check` 가 돌리는 e2e(바뀐 화면에 닿는 스펙, 넓게 바뀌면 전체)가 봅니다.
- 무엇을 누를지는 이번 PR 의 테스트 이름에서 고릅니다. 여는 길(선택자)은 `apps/*/e2e/` 가 이미 알고 있습니다.
- 확인하다 깨진 것을 찾으면 로컬에서 고칩니다. 확인이 끝나기 전에는 push 하지 않고 사람에게 리뷰도 청하지 않습니다.

## 화면 사진

**화면이 바뀌는 PR 에는 사진을 붙입니다.** 본문에 「화면」 절을 두고 무엇이 달라졌는지 보이는
사진을 겁니다. 스키마와 순수 층만 바꾸는 PR 에는 「없습니다」라고 적고 왜 없는지를 한 줄로
밝힙니다. 사진이 없으면 리뷰어가 코드만 읽고 화면을 상상해야 합니다.

⚠ **사진은 `assets/pr-screenshots` 브랜치에만 둡니다.** `main` 에도 작업 브랜치에도 합치지
않습니다. 합치면 바이너리가 이력에 영구히 남고, 화면이 바뀔 때마다 그 이력이 한 장씩
두꺼워집니다. 본문은 아래 꼴로 가리킵니다.

```
https://github.com/tyohnn/hathway/blob/assets/pr-screenshots/screenshots/<이름>.png?raw=1
```

사진을 갈아 끼울 때는 같은 이름으로 덮습니다. 이름을 바꾸면 지난 PR 본문의 링크가 깨집니다.

⚠ **본문에 그림으로 박지 못하고 링크로 겁니다.** 이 저장소에 붙는 GitHub 경로가 `![...]` 의
느낌표와 `<img>` 태그를 지웁니다. 저장소를 볼 수 있는 사람이 링크를 누르면 GitHub 화면에서
그대로 보입니다.

⚠ **빈 화면을 찍지 않습니다.** 그 PR 이 무엇을 바꿨는지 드러나는 상태를 Playwright 로 먼저 만들고
나서 찍습니다. 종목 화면은 시드 종목(크래프톤 `259960` · 에코프로비엠 `247540`)을 열어 숫자가 선 뒤를 찍고,
리서치 보드는 칸을 하나 더한 뒤를 찍습니다. 비어 있는 첫 화면은 그 PR 이 세운 것을 하나도 보여 주지 않습니다.

**보이는 값이 합성 데이터라고 본문에 밝힙니다.** 전부 `supabase/seed.sql` 이 심은 것이고 실제
고객 데이터가 아닙니다.

**찍은 사진은 세션에도 함께 보입니다.** PR 본문에 링크로 걸고 끝내지 않고, 그 자리에서 사용자에게
사진을 보냅니다. 링크를 누르러 GitHub 으로 건너가야 하면 그 자리에서 보고 「이건 아닌데」라고 말할
기회가 사라집니다. 사진을 볼 사람이 지금 대화하고 있는 사람이라면, 사진도 지금 이 자리에 있어야
합니다.

- 한 번에 넉 장까지 묶어 보내고, 무엇을 보는 것인지 한 줄로 붙입니다
- 다 만든 뒤에 몰아 보내지 않습니다. 화면 하나가 서면 그것을 바로 보입니다
- 링크는 PR 본문의 몫이고 세션에서는 파일 자체를 보냅니다. 둘은 서로를 대신하지 않습니다

### 찍는 절차

```
# 1. (클라우드 개발 환경이라면) 도커 데몬을 띄웁니다. 꺼진 채로 시작합니다
dockerd > /tmp/dockerd.log 2>&1 &

# 2. 로컬 스택을 올립니다. 마이그레이션과 시드를 함께 적용합니다
npx supabase start

# 3. 프로덕션 빌드로 띄웁니다. e2e 의 열린 서버와 같은 모양입니다(`apps/web/playwright.config.ts`)
npx turbo build --filter=@hathway/web
cd apps/web && ALLOW_LOCAL_ACCOUNTS=1 EXPOSE_TESTING_API=1 \
  WEB_DATABASE_URL=postgresql://web_app:postgres@127.0.0.1:54582/postgres \
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54581 \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<로컬 스택의 anon 키, `.env.example`> \
  SUMMARY_RUNNER=rehearsal IMAGE_RUNNER=rehearsal BILLING_GATEWAY=rehearsal NEXT_PUBLIC_POSTHOG_SINK=rehearsal \
  npx next start -p 4401
```

agent 앱은 같은 꼴로 `@hathway/agent` 를 빌드해 4411 에 띄웁니다. 값의 정본은 각 앱의 `playwright.config.ts` 이고,
이 문서와 어긋나면 그쪽을 따릅니다.

| 앱 | 주소 | 시드 계정 |
|---|---|---|
| web | `http://127.0.0.1:4401` | `ops@example.test`(운영팀) · `kim@example.test` 등(고객) · `outsider@example.test`(명부 밖) |
| agent | `http://127.0.0.1:4411` | `ops@example.test` |

비밀번호는 모두 `supabase/seed.sql` 이 심은 로컬 전용 값입니다. 계정마다의 뜻은 시드 파일 머리말에 있습니다.

⚠ **`ALLOW_LOCAL_ACCOUNTS=1` 이 없으면 로그인 칸이 서지 않습니다.** 프로덕션 빌드는 배포와 같이 구글 로그인만 보여 줍니다.

⚠ **`next dev` 로 찍지 않습니다.** e2e 가 프로덕션 빌드를 쓰는 것과 같은 까닭이고, 개발 서버는
프리페치와 오류 표시가 달라서 리뷰어가 보게 될 화면과 어긋납니다.

⚠ **Playwright 에 브라우저 경로를 손으로 넘깁니다.** 클라우드 개발 환경은 미리 설치된 chromium 을
쓰고 `npx playwright install` 은 막혀 있을 수 있습니다. `chromium.launch({ executablePath: ... })` 에
`/opt/pw-browsers/chromium-<빌드>/chrome-linux/chrome` 을 넘기고, 빌드 번호는 그 디렉터리를 보고
그때 확인합니다.

**여는 길은 e2e 가 이미 알고 있습니다.** 어느 줄을 눌러야 어느 화면이 열리는지는 e2e 의 검사가 그대로
적어 두었으므로, 사진을 찍는 스크립트는 그 선택자를 가져다 씁니다. 화면을 여는 길을 새로 찾지 않습니다.
