# 디자인 시스템: tyohnn `graphite`

> 정본입니다. 화면을 그리기 전에, 그리고 룩을 바꾸기 전에 이 문서를 먼저 읽으십시오.

이 저장소는 디자인 시스템을 **직접 소유하지 않습니다.** 3층 CSS 의 값과 규칙은
[tyohnn](https://github.com/tyohnn/ui) 이 갖고, 우리는 그중 하나를 입습니다. 지금 입은 것은
**graphite** 입니다. 검정에 가까운 판이 한 단씩 밝아지며 쌓이고, 줄은 촘촘하며, 신호색은 파랑입니다.
2026-10-02 에 shadcn `radix-mira` 를 앱 안에 손으로 들고 있던 것을 걷고 이리로 옮겼습니다.

무엇이 어느 시스템을 입고 있는지는 저장소 루트 **`tyohnn.json`** 이 정본입니다. CLI 는 그 파일을
고친 뒤 저장소를 거기에 맞추므로, 같은 명령을 두 번 돌려도 두 번째에는 아무것도 바뀌지 않습니다.

## 어디에 무엇이 있나

```
tyohnn.json                                   어느 앱이 어느 시스템·색·아이콘·글꼴을 입었나 (정본)
packages/ui/src/components/*.tsx              컴포넌트 원본 61개. 구조와 행동만 갖습니다
packages/ui/src/icons/                        의미 이름 아이콘과 라이브러리 대응표 (phosphor)
packages/ui/src/strings/                      컴포넌트가 스스로 하는 말 (ko)
packages/ui/src/systems/graphite/
    globals.css                               1층. 모양의 값: 반경 기준값 · 그림자 · 이징
    theme.css                                 1층. 색의 값. 색은 별도 축이라 파일이 갈려 있습니다
    tokens.css                                2층. 밀도 · 형태 · 모션의 값
    style.css + components/*.css              3층. cn-* 클래스가 위 토큰을 조립하는 규칙
    typeset.css + typeset-preset.css          긴 글 조판. 3층과 별개 축입니다
    DESIGN.md                                 graphite 가 무엇을 왜 그렇게 정했나
packages/ui/src/product.css                   우리 것. 시스템 축이 아닌 제품 토큰 (아래 참조)
apps/web/app/global.css                       진입점. 위 파일들을 순서대로 불러옵니다
apps/web/app/layout.tsx                       글꼴과 <html> 클래스
```

세 층의 경계는 한 문장입니다. **값은 토큰이 갖고, 규칙은 CSS 가 갖고, 구조는 컴포넌트가 갖습니다.**

## 손으로 고치지 않는 자리

⚠ **`packages/ui/src/components` · `icons` · `strings` · `systems` 와 두 진입 파일의 `tyohnn:*` 블록은 tyohnn CLI 소유입니다.**

CLI 는 자기가 쓴 파일의 해시를 `tyohnn.json` 에 적어 둡니다. 손으로 고치면 다음 실행이 「고쳐졌다」고
보고 그 파일을 **비켜 갑니다.** 경고는 나오지만 빌드는 통과하므로, 그때부터 우리 저장소와 시스템이
조용히 갈라집니다. `tyohnn diff` 가 갈라진 자리를 보여 줍니다.

진입 파일(`global.css` · `layout.tsx`)은 `tyohnn:begin` / `tyohnn:end` 주석 사이만 CLI 가 다시
씁니다. 그 밖은 우리 것입니다. `product.css` 를 읽는 `@import` 와 교재 조판, 리서치 보드의 규칙이 그 자리에 있습니다.

⚠ **`npx shadcn add` 를 돌리지 않습니다.** 컴포넌트는 tyohnn 이 한 벌로 갖고 CLI 가 통째로 받아 옵니다.
새 컴포넌트가 필요하면 tyohnn 에 더한 뒤 다시 받습니다. 앱의 `components.json` 은 그래서 지웠습니다.

## 시스템 축이 아닌 것: `product.css`

시스템이나 색을 갈아도 살아남아야 하는 **이 제품의 값**은 `packages/ui/src/product.css` 가 갖습니다.

| 토큰 | 무엇인가 |
|---|---|
| `--chart-1` ~ `--chart-5` | 범주형 차트 팔레트. 색(theme)이 주는 농담 다섯 단은 여러 계열 재무 차트에서 구분되지 않아 일부러 덮습니다 |
| `--positive` · `--negative` | 오른 값과 내린 값. 차트 팔레트를 가리켜서 지표 카드의 화살표와 차트의 선이 같은 색입니다. `text-positive` 로 씁니다 |
| `--shadow-card` · `--shadow-card-hover` · `--shadow-glow-primary` | 대시보드 카드의 띄움 |
| `--typeset-notes-*` | 교재 본문의 크기 · 줄 간격 · 문단 간격. `.typeset.typeset-notes` 가 읽습니다 |

진입 CSS 가 `tyohnn:end system` **뒤**에서 읽으므로 시스템 토큰을 덮습니다. 덮을 생각이
없다면 시스템이 쓰는 이름과 겹치지 마십시오.

## 화면을 그릴 때

- **`@investment/ui/components/*` 만 씁니다.** 화면을 만들기 전에 `packages/ui/src/components/` 를 먼저 훑어보고 있는 것을 조합합니다.
- **Base UI 는 Radix 와 API 가 다릅니다**(`.claude/skills/shadcn/rules/base-vs-radix.md`). `asChild` 대신 **`render`**,
  버튼이 아닌 것을 `render` 로 넘길 때는 `nativeButton={false}`, `Select` 는 `items` prop 필수, Toast 는 `toast.add()` 입니다.
  `form` 컴포넌트는 없고 그 자리는 `field` 입니다.
- **원시 색을 쓰지 않습니다.** `bg-amber-500/15 text-amber-700` 이 아니라 `bg-warning-soft text-warning` 입니다.
  상태의 색은 넷입니다: `success` · `warning` · `info` · `destructive`, 그리고 각각의 `-soft`. 어두운 모드는 토큰이 스스로 가르므로
  `dark:` 로 색을 덮지 않습니다.
- **사이즈 이름이 곧 높이입니다.** 그 높이는 시스템이 정하므로 숫자를 화면에 적어 넣지 않습니다. 작게 쓰려면 `size="sm"` 을 줍니다.
- 긴 글은 `.typeset` 컨테이너에 넣고 손으로 꾸미지 않습니다. 교재 본문은 `.typeset .typeset-notes` 입니다.
- 화면의 글은 `.claude/skills/ux-writing/` 이 정본입니다.

## 룩을 바꾸는 방법

```
tyohnn use <system> --app apps/web       # 시스템을 간다. 밀도 · 형태 · 모션까지. TSX 는 그대로
tyohnn theme <name> --app apps/web       # 색만 간다. 시스템은 그대로
tyohnn fonts --sans <id> --app apps/web
tyohnn list                              # 고를 수 있는 시스템 · 색 · 아이콘 · 글꼴
tyohnn doctor                            # 배선 점검
```

시스템과 색은 **별도 축입니다.** 시스템이 제 색을 입고 있는 동안에는 시스템 폴더의 `theme.css` 를 읽고,
다른 색을 입는 순간 CLI 가 진입 CSS 옆에 `tyohnn-theme.css` 를 써서 그것을 대신 읽습니다.

graphite 는 어두운 판이 기본이라 `components/providers.tsx` 가 `defaultTheme="dark"` 로 엽니다. 밝은 시스템으로
갈 때는 그 줄도 함께 봅니다.

**시스템 자체를 고칠 일이면 tyohnn 저장소에서 고치고 다시 받습니다.** 여기서 고치지 않습니다.

## ⚠ CLI 는 아직 npm 에 없습니다

배포 전이라 CLI 는 tyohnn 체크아웃의 `dist` 를 직접 부릅니다(`git clone https://github.com/tyohnn/ui` 뒤
`npm install && npm run build -w tyohnn`).

```
node <tyohnn 체크아웃>/packages/cli/dist/index.js <명령> --ref main
```

원천은 GitHub 의 main 이고, 받은 커밋은 `tyohnn.json` 의 `source` 에 남습니다. 배포되면 `npx tyohnn <명령>` 으로 바뀝니다.

## 저장소가 기계적으로 지켜 주는 것

| 검사 | 명령 | 무엇을 막나 |
|---|---|---|
| 토큰 스캔 | `pnpm check:tokens` | 읽는데 정의가 없는 토큰. 폴백이 없으면 실패입니다. `pnpm test` 가 함께 돌립니다 |
| 배선 점검 | `tyohnn doctor` | 시스템이 둘 섞였거나, import 순서가 어긋났거나, 글꼴 · 아이콘 배선이 끊긴 것 |
| 원본 대조 | `tyohnn diff` | 우리 사본과 시스템 원본이 갈라진 자리 |
| 화면의 글 | `node .claude/skills/ux-writing/scripts/scan-copy.mjs apps/web/app apps/web/components` | 합쇼체 · 과도한 경어 · 수동형 · 개발의 말 · 「취소」 버튼 |

토큰 스캔은 `tyohnn.json` 을 읽어 지금 입은 시스템의 폴더를 보므로 시스템을 갈아도 따라갑니다.

## 알려진 어긋남

- **앱이 phosphor 를 직접 부릅니다.** UI 패키지는 의미 이름(`@investment/ui/icons`)으로 아이콘을 부르지만, 앱의 13개 파일은
  `@phosphor-icons/react` 를 직접 부릅니다. 지갑 · 저울 · 과녁처럼 의미 이름이 없는 도메인 아이콘이 많고, 서버 컴포넌트는
  `/dist/ssr` 진입점을 써야 해서 그대로 두었습니다. 같은 라이브러리라 그림은 같습니다. 아이콘 라이브러리를 갈 일이 생기면 이 자리가 남습니다.
- **화면이 제목과 카드를 손으로 그립니다.** 제목은 `text-2xl font-bold` 같은 유틸리티로, 지표 카드는 제 테두리와 그림자로 섭니다.
  그래서 시스템을 갈아도 제목 글꼴(`--font-heading`)과 카드 면이 따라오지 않습니다. 세리프 제목을 쓰는 시스템(vellum · sera)을
  입으려면 이 자리부터 시스템에 이어야 합니다.
- **화면의 글이 아직 규약 전입니다.** 기계 검사에 220곳쯤 걸리고, 그 가운데 160곳은 교재 차트의 설명문(`components/charts/textbook/data`)입니다.
- **블록 층(`packages/blocks`)이 없습니다.** 스캐폴드는 앱 셸 · 목록 · 표를 블록으로 조립하지만 이 저장소는 `apps/web/components` 가 그 일을 합니다.
- **sonner 는 없습니다.** tyohnn 은 Base UI Toast 만 갖습니다.
