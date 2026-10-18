# 디자인 시스템 — tyohnn `loam`

> 정본입니다. 화면을 그리기 전에, 그리고 룩을 바꾸기 전에 이 문서를 먼저 읽으십시오.

이 저장소는 디자인 시스템을 **직접 소유하지 않습니다.** 3층 CSS 의 값과 규칙은
[tyohnn](https://github.com/tyohnn/ui) 이 갖고, 우리는 그중 하나를 입습니다. 지금 입은 것은
**loam**(정원의 밤 같은 어두운 톤)입니다. 검은 바닥 위에 판이 한 단씩 밝게 뜨고, 조용한 면은 흰색의 얇은
베일로 쌓으며, 1차 단추는 흰 알약이고 신호색은 세이지 하나입니다. 두 앱(`apps/web` · `apps/agent`)이 같은 것을
입습니다.

스캐폴드의 기본값일 뿐입니다. 새 제품에서는 첫날 `tyohnn use <system>` 으로 갈아입는 것이 보통이고, 아래
「룩을 바꾸는 방법」이 그 명령입니다. 한 화면이 앞세울 카드 하나에는 `data-emphasis` 를 달아 강조합니다.

무엇이 어느 시스템을 입고 있는지는 저장소 루트 **`tyohnn.json`** 이 정본입니다. CLI 는 그 파일을
고친 뒤 저장소를 거기에 맞추므로, 같은 명령을 두 번 돌려도 두 번째에는 아무것도 바뀌지 않습니다.

원천은 tyohnn 의 `main` 입니다. 프로젝트 안에서 돌리는 명령은 `tyohnn.json` 에 적힌 커밋을 읽으므로, 새 판을
받을 때는 `--ref main` 을 붙입니다(`npx tyohnn@latest blocks --ref main`). 받기 전에 `tyohnn diff --ref main` 이
무엇이 바뀌는지 보여 줍니다.

## 어디에 무엇이 있나

```
tyohnn.json                                   어느 앱이 어느 시스템·색·아이콘·글꼴을 입었나 (정본)
packages/ui/src/components/*.tsx              컴포넌트 원본. 구조와 행동만 갖습니다
packages/ui/src/icons/                        의미 이름 아이콘과 라이브러리 대응표
packages/ui/src/strings/                      컴포넌트와 블록이 스스로 하는 말. 로캘은 ko 입니다(`tyohnn locale`)
packages/ui/src/blocks/*.tsx                  tyohnn 블록. 컴포넌트를 조합한 화면 조각이고 `@hathway/ui/blocks/<이름>` 으로 부릅니다
packages/ui/src/systems/loam/
    globals.css                               1층. 모양의 값 — 반경 기준값 · 그림자 · 이징
    theme.css                                 1층. 색의 값. 색은 별도 축이라 파일이 갈려 있습니다
    tokens.css                                2층. 밀도 · 형태 · 모션의 값
    style.css + components/*.css              3층. cn-* 클래스가 위 토큰을 조립하는 규칙
    typeset.css + typeset-preset.css          긴 글 조판. 3층과 별개 축입니다
    DESIGN.md                                 loam 이 무엇을 왜 그렇게 정했나
packages/ui/src/product.css                   우리 것. 시스템 축이 아닌 제품 치수 (아래 참조)
apps/<app>/src/app/globals.css                진입점. 위 파일들을 순서대로 불러옵니다
apps/<app>/src/app/layout.tsx                 글꼴과 <html> 클래스
```

세 층의 경계는 예전 그대로 한 문장입니다. **값은 토큰이 갖고, 규칙은 CSS 가 갖고, 구조는 컴포넌트가
갖습니다.** 왜 세 층이어야 하는지, 2층의 축을 왜 그렇게 잘랐는지는
[history/three-layer-impacters.md](./history/three-layer-impacters.md) 의 프리셋 8종 실측이 근거입니다.

## 손으로 고치지 않는 자리

⚠ **`packages/ui/src/**` 와 두 진입 파일의 `tyohnn:*` 블록은 전부 tyohnn CLI 소유입니다.**

CLI 는 자기가 쓴 파일의 해시를 `tyohnn.json` 에 적어 둡니다. 손으로 고치면 다음 실행이 「고쳐졌다」고
보고 그 파일을 **비켜 갑니다.** 경고는 나오지만 빌드는 통과하므로, 그때부터 우리 저장소와 시스템이
조용히 갈라집니다. `tyohnn diff` 가 갈라진 자리를 보여 줍니다.

진입 파일(`globals.css` · `layout.tsx`)은 `tyohnn:begin` / `tyohnn:end` 주석 사이만 CLI 가 다시
씁니다. 그 밖은 우리 것이고 건드리지 않습니다 — `packages/blocks` 를 가리키는 `@source` 한 줄과
`product.css` 를 읽는 `@import` 가 그 자리에 있습니다.

## 시스템 축이 아닌 것 — `product.css`

시스템을 갈아도 살아남아야 하는 **우리 화면의 치수**는 `packages/ui/src/product.css` 가 갖습니다.
지금 셋이고, 전부 「이 제품이 그렇게 생겼다」는 판단이지 디자인 시스템의 축이 아닙니다.

| 토큰 | 값 | 무엇인가 |
|---|---|---|
| `--sheet-width` | 560px | 한 건을 읽고 고치는 시트의 폭 |
| `--sidebar-collapsed-width` | 56px | 접힌 사이드바의 폭. `AppShell` 이 `--sidebar-width-icon` 으로 넘깁니다 |
| `--workbench-aside-width` | 360px | 좌 목록·우 본문 짜임에서 왼쪽 기둥의 폭 |

진입 CSS 가 `tyohnn:end system` **뒤**에서 읽으므로 시스템 토큰을 덮을 수 있습니다. 덮을 생각이
없다면 시스템이 쓰는 이름과 겹치지 마십시오 — `tyohnn doctor` 가 겹친 이름을 경고합니다.

## 룩을 바꾸는 방법

```
tyohnn use <system> --app apps/web       # 시스템을 간다. 밀도 · 형태 · 모션까지. TSX 는 그대로
tyohnn use <system> --app apps/agent
tyohnn theme <name> --app apps/web        # 색만 간다. 시스템은 그대로
tyohnn fonts --sans <id> --app apps/web
tyohnn icons <library> --app apps/web
tyohnn list                               # 고를 수 있는 시스템·색·아이콘·글꼴
```

⚠ **여러 앱을 한꺼번에 가는 명령은 없습니다.** 앱이 늘면 앱마다 `--app` 을 주어 따로 돌립니다. 앱끼리
갈라진 채로 두지 않으려면 `tyohnn doctor` 로 확인하십시오 — 어느 앱이 무엇을 입었는지 한 줄씩 찍습니다.

시스템과 색은 **별도 축입니다.** `loam + blue` 처럼 어느 색이든 어느 시스템에나 얹힙니다. 시스템이
제 색을 입고 있는 동안에는 시스템 폴더의 `theme.css` 를 그대로 읽고, 다른 색을 입는 순간 CLI 가 진입
CSS 옆에 `tyohnn-theme.css` 를 써서 그것을 대신 읽습니다 — 캐스케이드에서 같은 자리입니다.

**시스템 자체를 고칠 일이면 tyohnn 저장소에서 고치고 다시 받습니다.** 여기서 고치지 않습니다. 이 저장소
하나만 예뻐지고 다음 앱은 그 개선을 못 받기 때문입니다.

## ⚠ CLI 는 아직 npm 에 없습니다

배포 전이라 CLI 는 로컬 체크아웃의 `dist` 를 직접 부릅니다. 그 체크아웃에서 `npm run build -w tyohnn` 을
한 번 돌려 두어야 `dist` 가 최신입니다. **받는 원천은 두 가지입니다.**

```
# 머지된 것: GitHub 의 main 에서 받는다. 원천이 tyohnn.json 에 github · main · 커밋으로 남는다
node ~/projects/tyohnn/packages/cli/dist/index.js <명령> --ref main

# 머지 전의 브랜치를 미리 입어 볼 때: 그 브랜치를 체크아웃한 자리를 읽는다
node ~/projects/tyohnn/packages/cli/dist/index.js <명령> --source <tyohnn 체크아웃>
```

원천은 GitHub 의 main 입니다. `--source` 로 미리 받았다면 PR 이 머지된 뒤 `--ref main` 으로
한 번 더 받아 원천 기록을 되돌립니다. `--source` 로 받은 동안에는 `doctor` 가 「recorded source is not in the
cache」 경고를 남기는데, 원천이 캐시가 아니라 로컬 체크아웃이라는 뜻이라 정상입니다.

배포되면 `npx tyohnn <명령>` 으로 바뀌고 `--source` 는 필요 없어집니다.

## 화면의 문안

화면에 들어가는 글(단추 · 라벨 · 설명 · 빈 화면 · 오류 · 토스트 · aria-label)의 규약은
**`.claude/skills/ux-writing/`** 이 정본입니다. 여기에 옮겨 적지 않습니다. 기준은 하나입니다. **이 글이 없으면 사람이
무엇을 놓치는가.** 답할 수 없으면 넣지 않습니다. 문체는 토스를 따라 해요체 · 능동형 · 긍정형이고, 개발하며 쓰던 말
(서버 · 토큰 · 식별자 · 준비 중)은 화면에 세우지 않습니다.

```
node .claude/skills/ux-writing/scripts/scan-copy.mjs apps/web/src apps/agent/src packages/blocks/src
```

글자로 드러나는 어긋남(합쇼체 · 과도한 경어 · 수동형 · 개발의 말 · 「취소」 버튼)을 잡습니다.

## 저장소가 기계적으로 지켜 주는 것

| 검사 | 명령 | 무엇을 막나 |
|---|---|---|
| 토큰 스캔 | `npm run check:tokens -w @hathway/ui` | 읽는데 정의가 없는 토큰. 폴백이 없으면 실패입니다 |
| 배선 점검 | `tyohnn doctor` | 시스템이 둘 섞였거나, import 순서가 어긋났거나, 글꼴·아이콘 배선이 끊긴 것 |
| 원본 대조 | `tyohnn diff` | 우리 사본과 시스템 원본이 갈라진 자리 |
| 화면의 글 | `node .claude/skills/ux-writing/scripts/scan-copy.mjs <폴더>` | 합쇼체 · 과도한 경어 · 수동형 · 개발의 말 · 「취소」 버튼 |

토큰 스캔은 `tyohnn.json` 을 읽어 지금 입은 시스템의 폴더를 봅니다. 시스템을 갈아도 따라갑니다.
무엇을 토큰으로 보는지와 허용 목록의 규칙은 스크립트 머리말
(`packages/ui/scripts/scan-tokens.mjs`)에 적혀 있습니다.

## 알려진 어긋남

- **탭과 체크박스 indeterminate 아이콘은 CSS 로 안 됩니다.** 탭의 `gap-1` · `w-fit` · `flex-1` 과
  체크박스의 indeterminate 아이콘은 컴포넌트 TSX 에 박혀 있습니다. 3층으로 뚫으려 하지 말고,
  고쳐야 하면 tyohnn 에 올리십시오.
- **사문 토큰이 남아 있습니다.** 아무도 읽지 않는 2층 토큰을 토큰 스캔이 경고로 보고합니다. 시스템은
  여러 앱이 공유하는 스냅숏이라 이 앱이 안 쓴다고 지우지 않습니다. 경고이고 실패가 아닙니다.
- **`packages/ui` 의 영어 글을 이 저장소에서 직접 우리말로 바꿨습니다**(2026-09-29 사용자 결정). 스크린리더 글과 기본 문구
  (`breadcrumb` · `carousel` · `command` · `dialog` · `sheet` · `message-scroller` · `pagination` · `questionnaire` · `spinner` · `sidebar`)
  입니다. 그래서 `tyohnn doctor` 가 이 파일들을 「로컬에서 바뀐 파일」로 알리고, 다음 CLI 명령은 이 파일들을 덮지 않고 비켜
  갑니다. `--force` 로 다시 받으면 영어로 돌아가므로 그 전에 이 줄을 먼저 봅니다. 같은 수정을 tyohnn 에 올려 합쳐지면 이 줄을 지웁니다.
- **sonner 는 없습니다.** tyohnn 은 Base UI Toast 만 갖습니다. Toast 는 `toast.add()` 로 띄웁니다.
