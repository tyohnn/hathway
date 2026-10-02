# packages/blocks

> 2026-10-02 에 스캐폴드(`tyohnn/scaffold`)에서 옮겨 왔습니다. 아래 글은 스캐폴드의 것 그대로이고 이 저장소에서 다른 점은 셋입니다.
> 소비처는 `apps/web` 하나입니다. 아이콘은 hugeicons · lucide 가 아니라 phosphor 입니다(`src/icons/extra.tsx`). 입은 시스템은 loam 이 아니라 graphite 입니다.

`@investment/ui` 프리미티브를 조합해서 만든 화면 형태(블록)를 모아 두는 패키지입니다. 2026-09-06 현재 블록은 19개이고 전부 Figma 에서 확정(`■`)된 것입니다. 목록은 아래 「블록 목록」에 있습니다. 2026-09-16 에 `app-shell` 이 스무째로 들어왔습니다. 앱 셸이고, Figma 가 아니라 resolv-ai 의 advisor 앱이 세운 「셸 규격」에서 왔습니다.

⚠ **소비처는 `apps/web` · `apps/agent` 둘입니다.** 둘 다 아래 규약 3 의 등록 두 곳(`globals.css` 의 `@source` · `next.config.ts` 의 `transpilePackages`)을 마쳤습니다. ⚠ 새 앱이 블록을 처음 쓸 때 등록을 빠뜨리면 오류 없이 CSS 만 빕니다. resolv-ai 의 admin 앱이 그렇게 블록 전용 유틸리티를 통째로 잃었습니다. 새 앱에서 가장 먼저 확인할 자리입니다.

⚠ 종전에는 `apps/workshop` 의 위젯 카탈로그가 블록을 등록하고 앱 정의(JSON)가 축의 값만 적는 구조였는데, 그 앱이 2026-09-08 에 멈추면서 소비처에서 빠졌습니다. 블록 자체는 그 설계에 매여 있지 않으므로 그대로 씁니다. 분류의 출처였던 `apps/studio/docs/agent-ontology/` 도 같은 날 이력이 되었습니다.

## 순서 — 클로드 디자인에서 확정합니다

새 블록은 **클로드 디자인에서 먼저 그리고, 사용자가 눈으로 확정한 뒤에** 코드로 옮깁니다.

⚠ 2026-09-11 개정입니다. 확정의 자리가 Figma 에서 `apps/design` 점검 화면으로, 다시 클로드 디자인으로
두 번 옮겼습니다. 본문에 남은 페이지 표식(`□` 초안 · `▣` 확정 · `■` 구현)과 Figma·`/design/*` 언급은
블록 19개가 어떤 경로로 확정되었는지를 말하는 기록입니다.

## 역할과 경계

- 블록은 데이터를 가져오지 않습니다. 행·항목은 props 로 받고, 변경은 콜백으로 올립니다.
- 블록은 도메인 타입을 모릅니다. `DataRow` 처럼 "id 가 있는 레코드" 수준의 모양만 압니다.
- 블록은 프리미티브를 수정하지 않습니다. 필요한 모양이 없으면 프리미티브 위에 조합으로 만들고, 그래도 안 되면 `packages/ui` 의 토큰(2층)을 고칩니다.

| 허용하는 의존 | 금지하는 의존 |
|---|---|
| `@investment/ui` (컴포넌트, `cn`) | `apps/*` |
| `@investment/shared` 의 순수 포매터 | 도메인 패키지(`packages/agents` · `packages/access`), 어댑터 패키지(`packages/adapters-*`) |
| `@phosphor-icons/react`(`src/icons/extra.tsx` 에서만) | DB 클라이언트, `server-only` |
| `@tanstack/react-table` 8.21, `@tanstack/react-virtual` 3.14 | `next/*` (블록은 Next 를 모릅니다) |
| `@dnd-kit/core`·`sortable`·`utilities` | 도메인 타입 (`AgentDefinition`, `Skill` 등) |

TanStack Table 은 8.x 에 고정합니다. 9.x 는 API 가 다시 쓰인 판이라 오프라인 환경에서 검증할 수 없었습니다.

## 규약

1. **조합 방식은 조각 수가 정합니다.** 블록의 모양은 둘이고, 어느 쪽인지는 "호출부가 조각을 직접 배치해야 하는가"로 갈립니다.

   - **설정형** — 지금 18개가 이쪽입니다. 컴포넌트 하나가 데이터 배열과 설정 props 를 받아 통째로 그립니다. 호출부가 끼워 넣을 자리만 `React.ReactNode` prop 으로 엽니다(`PageHeader` 의 `actions`, `ItemList` 의 `media`·`actions`·`empty` 처럼). context 도 묶음 객체도 두지 않습니다.
   - **복합형** — 지금 `DataTable` 하나입니다. 조각을 호출부가 원하는 순서로 놓아야 해서 `DataTable.Root` 안에 나머지를 넣습니다. 이때만 context 를 두고, 서브컴포넌트는 그 context 하나만 읽습니다(`use()` 로 읽고 `useContext` 는 쓰지 않습니다). 묶음 객체 규약은 아래 6번에 있습니다.

   ⚠ **설정형을 복합형으로 미리 만들지 마십시오.** 조각을 호출부에 열어 두면 그 배치가 곧 계약이 되어, 블록이 자기 짜임을 바꿀 수 없게 됩니다. 조각을 따로 놓아야 할 실제 요구가 나온 다음에 옮깁니다. `FilterBar` 와 `StatCard` 는 파일이 여럿이지만 `FacetPills` 같은 안쪽 조각을 내보내지 않아 설정형입니다.

   두 모양에 공통으로 적용되는 것도 있습니다. render prop 대신 `children` 을 쓰고, boolean props 대신 명시적 variant 를 씁니다. 데이터를 가져오지 않고 변경을 콜백으로 올리는 것은 위 「역할과 경계」가 정합니다.
2. **값은 스타일 토큰으로 씁니다.** 색은 1층(`theme.css`), 밀도·형태는 2층(`tokens.css`)의 변수를 읽습니다. 두 파일 모두 `packages/ui/src/systems/<system>/` 에 있고 tyohnn 소유라 **여기서 새 토큰을 만들지 않습니다** — 기존 토큰으로 표현되면 그것을 쓰고, 표현이 안 되면 tyohnn 에 올립니다. 시스템 축이 아닌 제품 치수는 `packages/ui/src/product.css` 에 둡니다. 최소한의 변수로 전체 느낌을 바꿀 수 있어야 하기 때문입니다. 새 CSS 층은 만들지 않고 프리미티브 위에 조합만 합니다. `cn` 은 `@investment/ui/lib/utils` 에서 가져옵니다. JSX 에서 토큰을 읽는 방법은 Tailwind 임의값(`gap-[var(--surface-gap-lg)]`)이 기본입니다 — `className` 이라 호출부가 덮어쓸 수 있기 때문입니다. 굵기만 `style` 로 줍니다(`font-[…]` 가 굵기와 글꼴을 구분하지 못합니다). 토큰으로 만들지 **않는** 것도 있습니다 — 줄무늬의 반투명 바탕(`bg-muted/40`)은 3층 `table.css` 가 표 바닥선·행 hover 에 이미 적어 둔 판단을 따라 유틸리티로 두고, 가상 스크롤의 행 높이(44)는 가상화기가 픽셀 수를 요구해 CSS 변수로 둘 수 없어 이름 있는 상수(`DEFAULT_VIRTUAL_ROW_HEIGHT`)로 둡니다.
3. **소비하는 앱이 두 곳을 등록해야 합니다.** `globals.css` 에 `@source "../../../../packages/blocks/src";` 를, `next.config.ts` 의 `transpilePackages` 에 `@investment/blocks` 를 넣습니다. `@source` 를 빠뜨리면 블록의 클래스가 CSS 에 들어가지 않아 레이아웃이 오류 없이 무너집니다.
4. **문구는 `labels` 로 모읍니다.** 기본값은 한국어이고 호출부가 일부만 덮어씁니다. JSX 에 문구를 직접 적지 않습니다. 이름은 블록마다 다르게 둡니다(`CalloutLabels` · `CALLOUT_LABELS`) — 하위 경로가 갈라 주긴 하지만, 한 화면이 블록 여럿을 쓸 때 별칭을 열여덟 번 적지 않으려는 것입니다. `DataTable` 만 먼저 생겨 `Labels` · `DEFAULT_LABELS` 입니다.
5. **자리를 차지하는 블록은 기다리는 얼굴을 `loading` 으로 함께 그립니다.** 따로 그린 Skeleton 은 줄 높이 · 여백이 달라 값이 오는 순간 화면이
   움직이므로, 같은 컴포넌트가 값 자리만 막대(`pending.tsx` 의 `PendingText`)로 바꿔 섭니다(`ItemList` · `PageHeader` · `AppShellAccount`,
   2026-09-30). 앱이 `<Suspense fallback>` 으로 씁니다(루트 `CLAUDE.md` 「정적 껍데기」). 아직 따로 된 Skeleton 이 남은 블록(`ChatNav` ·
   `LoginPanel` · `DataTable` 등)은 쓰는 화면이 생길 때 옮깁니다. **`ActionBar` 와 `FormSheet` 과 `PromptInput` 은 두지 않습니다** — 앞의 둘은 선택이 0이면 아예 그리지 않고 열려야 보이는 시트라 로딩 중에 메울 자리가 화면에 없고, `PromptInput` 은 **데이터를 기다리지 않습니다**(대화가 오기 전에도 그대로 서 있어서 기다리는 동안 대신 그릴 모양이 자기 자신입니다). 없는 자리에 Skeleton 을 두면 데이터를 기다리는 동안 빈 띠와 빈 시트가 떠서 없던 것이 생겨 보입니다.
6. **파일 구조는 순수 모듈과 컴포넌트를 나눕니다.** `src/<block>/` 아래에서 `.ts` 는 순수 모듈(vitest 대상)이고 `.tsx` 는 `"use client"` 컴포넌트입니다. 배럴 `index.ts` 에는 지시문을 두지 않고, 묶음 객체(`export const DataTable = { Root, Toolbar, ... }`)를 여기에 둡니다. 묶음 객체는 조각이 여럿인 블록에만 둡니다 — `StatusBadge` 처럼 조각이 하나면 함수를 그대로 내보냅니다. `"use client"` 모듈이 내보낸 객체는 서버 컴포넌트에서 점(`.`)으로 들어갈 수 없기 때문입니다.
7. **TypeScript 는 `any` 를 쓰지 않고, 단언 대신 가드를 씁니다.** 제네릭 행 타입을 context 에 넣기 위해 지우는 자리는 단 한 곳(`DataTableRoot` 의 `erased`)이고, 주석으로 이유를 남깁니다.
8. **Base UI 규약을 따릅니다.** `render` prop 으로 요소를 바꾸고, change 핸들러는 두 인자입니다. `forwardRef` 없이 `ref` 를 prop 으로 받습니다. `DropdownMenuLabel`(`Menu.GroupLabel`)은 반드시 `DropdownMenuGroup` 안에 둡니다. 밖에 두면 Base UI error #31 이 발생해서 화면 전체가 오류 경계로 떨어집니다(2026-09-05 e2e 에서 확인).
9. **커밋 축**은 도구 → 의존성 → 패키지 골격 → 순수 모듈 → 컴포넌트 → 앱 배선(점검 화면·e2e) → 문서 순서입니다. 커밋마다 typecheck 가 통과해야 합니다.

## 테스트

- 순수 모듈은 이 패키지의 vitest 로 검증합니다: `npx vitest run` (DOM 러너는 두지 않습니다).
- ⚠ **상호작용을 검사할 무대가 지금 없습니다.** 종전에는 `apps/design` 의 `/design/<block>` 점검 화면과 그 위의 Playwright 스펙이 그 일을 했는데, 앱을 지우면서 e2e 도 함께 사라졌습니다. 블록의 상호작용을 다시 잴 때는 그 블록을 쓰는 앱(`apps/web` · `apps/agent`)의 화면 위에 e2e 를 세웁니다.
- e2e 를 다시 세울 때는 블록당 하나씩 한 파일에 모읍니다. 블록마다 파일을 두면 열여덟 벌이 되고 대부분이 「화면이 뜬다」 한 줄이기 때문입니다. 축이 일곱인 `DataTable` 만 따로 갖습니다.
- ⚠ 점검 화면을 다시 빌드했으면 **옛 서버를 반드시 죽이고** 띄웁니다. 포트가 잡혀 있으면 `next start` 가 EADDRINUSE 로 죽고 옛 빌드가 그대로 응답해, 고친 것이 반영되지 않은 채 e2e 가 실패합니다(2026-09-06 실제로 두 번 겪음). `fuser -k 3004/tcp` 로 포트 기준으로 죽입니다 — `pkill -f "next start"` 는 기동 뒤 이름이 `next-server` 로 바뀌어 놓칩니다.
- 검증 순서는 다음과 같습니다. 점검 화면은 DB 도 세션도 읽지 않으므로 환경변수 없이 돕니다.

```bash
cd packages/blocks && npx tsc --noEmit && npx vitest run
npx tsc --noEmit -p packages/blocks
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test e2e/data-table.spec.ts
```

## 블록 목록

이름과 축은 블록 목록과 같습니다. 하위 경로는 이름의 kebab-case 입니다.

| 블록 | 하는 일 | 눈여겨볼 것 |
|---|---|---|
| `ActionBar` | 선택 수와 일괄 액션을 담은 띠 | 선택 0 이면 그리지 않습니다. `DataTable` 의 선택 띠가 이것의 어댑터입니다 |
| `AppShell` | 사이드바와 상단 띠와 본문 우물 | 사이드바는 떠 있는 판(`variant="floating"`)이고, 그 옆의 본문을 테두리 있는 판으로 그리는 것은 시스템(loam)의 3층입니다(2026-09-28). `layout` 이 둘입니다 — `well` 은 띠와 1280 우물을 셸이 갖고, `full` 은 둘 다 없이 본문이 남은 자리를 통째로 씁니다(기둥마다 제 머리를 갖는 화면) |
| `AttachmentList` | 첨부 파일 목록 | 아이콘은 확장자가 아니라 정본 MIME 으로 고릅니다. 줄을 누르는 것(`onPress`)과 내려받는 것은 다른 일입니다 |
| `Callout` | 액션이 달린 배너 | 바탕은 card 그대로, 아이콘과 제목만 tone 색입니다 |
| `ChatNav` · `ChatPane` · `ChatRail` · `ChatSplit` | 대화 화면의 사이드바와 기둥과 곁칸과 너비 손잡이 | 아래 절 |
| `ChoiceCards` | 라디오를 카드로 그린 선택기 | 카드 면은 직접 그렸습니다(Card 에 그릇이 없습니다) |
| `Conversation` | 사람과 에이전트의 말과 쓴 도구와 멈춰 선 도구가 한 줄에 차례로 서는 대화 | 줄의 종류가 판별 union 입니다. 아바타도 들여쓰기도 없고, 말풍선은 사람이 적은 말에만 섭니다(2026-09-22) |
| `DataTable` | 축 일곱으로 여는 데이터 표 | 아래 절 |
| `DetailPanel` | URL 로 여닫는 상세 패널의 안쪽 | 여닫는 일은 런타임 몫입니다. 폭은 `surface/panel-width` 이고 `fill` 이면 제 칸을 채웁니다 |
| `FieldGroup` | Field 를 범례 아래 묶는 폼 구역 | 프리미티브에도 같은 이름이 있어 import 를 별칭합니다. 보임 조건은 데이터(`rules.ts`, vitest) |
| `FilterBar` | 목록 위의 조건 띠 | 배치(`layout`)와 패싯의 배치(`display`)는 서로 다른 축이고 둘 다 주지 않으면 종전 모양 그대로입니다. 조건 값의 병합과 직렬화는 `filter-state.ts`(vitest)가 갖습니다. 띠 배치의 트리거는 `DataTable` 과 같은 조각(`src/filter-trigger.tsx`)을 씁니다 |
| `FormSheet` | 등록·편집 폼을 담은 시트 | 폭은 `DetailPanel` 과 같은 토큰을 읽습니다 |
| `ItemList` | 표가 아닌 카드·행 목록 | 누를 수 있는 항목에는 `aria-label` 로 제목만 이름으로 주고 셰브런을 블록이 그립니다 |
| `PageHeader` | 라우트의 머리 | 제목 크기는 `heading/font-size/lg` |
| `PromptInput` | 에이전트에게 말을 실어 보내는 칸 | `InputGroup` 한 벌입니다. 보내는 열쇠는 칸에 적힌 ⌘↵ 그대로입니다. Skeleton 을 두지 않습니다 — 데이터를 기다리지 않습니다 |
| `PropertyList` | 라벨과 값이 짝을 이루는 상세 속성 | 헤더 없는 2열 `Table` 입니다. 값 형식은 `formatCellValue`. `edit` 축이 그 자리에서 고치고 갈래가 일곱입니다(`edit.ts`, vitest) |
| `SettingsList` | 제목·설명과 컨트롤이 한 행 | 컨트롤은 판별 union 입니다. 저장은 행 단위 |
| `StatCard` · `StatGrid` | 지표 하나를 담는 카드와 격자 | 증감은 방향과 tone 을 따로 받습니다 |
| `StatusBadge` | 상태 값을 tone 으로 그리는 배지 | 1층 상태 색의 첫 소비처. `DataTable` 의 badge 셀도 이것을 씁니다 |
| `Stepper` | 절차의 진행 표시 | 끝난 단계만 누를 수 있습니다 |
| `TagInput` | 값 여러 개를 칩으로 담는 입력 | 나누는 규칙은 `tags.ts`(vitest) |
| `Timeline` | 시간순 사건 목록 | 연결선은 직접 그리고 두께는 `surface/border-width` |
| `ToolCalls` · `ToolCallList` · `ToolCallRow` | 도구 호출을 한 줄로 접는 묶음과 그 줄 | 줄 자체는 면도 테두리도 없는 흐린 줄이고, 테두리는 **여럿을 묶는 상자에만** 섭니다(`needsGroup`. 하나면 줄 하나로 끝납니다). 줄의 제목은 모델이 적은 의도이고 이름과 넣은 값은 펴야 보입니다. 접을지 말지는 `rules.ts`(vitest)가 정하고, 멈춰 선 것이 섞이면 펴 둡니다. 줄마다 여닫는 축은 `detail` 입니다 |
| `UploadDropzone` | 파일을 끌어다 놓는 자리 | 파일 목록을 갖지 않습니다 — `AttachmentList` 와 조합합니다. 판정은 `upload.ts`(vitest) |

### 챗 셸 (2026-09-22)

실행 화면 넉 장이 같은 짜임을 씁니다(`design/Resolv Admin — cirrus` 의 `AgentRun` 계열). `Workbench` 는 곁칸이 왼쪽에 고정이라 쓸 수 없어서 따로 섰고, 조각이 넷입니다.

| 조각 | 무엇 | 눈여겨볼 것 |
|---|---|---|
| `ChatNav` | 사이드바의 새 대화와 메뉴와 지난 대화 | 지난 대화를 묶는 규칙은 도메인의 것이라 호출부가 갖습니다 |
| `ChatPane` | 대화 기둥. 제 머리(48px)를 갖습니다 | 아래에 선을 긋지 않습니다. `note` 가 「지금 어떤가」를 적는 한 마디입니다 |
| `ChatRail` | 곁칸의 카드 | 높이를 꽉 채우지 않고 담은 것만큼만 섭니다. 너비는 손잡이가 정합니다 |
| `ChatSplit` | 둘을 나란히 세우고 그 사이에 너비 손잡이 | 아래 경고 셋 |

⚠ **셸 자체는 `AppShell` 의 `layout="full"` 입니다.** 챗이 따로 셸을 갖지 않습니다 — 다른 것은 사이드바의 내용과 띠가 서지 않는 것뿐이고, 그 둘은 이미 축으로 열려 있습니다.

⚠ **`react-resizable-panels` 4 판은 수를 픽셀로, 문자열을 백분율로 읽습니다.** 백분율인 줄 알고 26 을 넘겼다가 오른쪽 칸이 26px 로 섰습니다(2026-09-22 실측). `direction` 과 `order` 는 4 판에 없고, 묶음의 축은 `orientation` 이며 칸의 차례는 적는 차례가 정합니다.

⚠ **칸에 `style={{ overflow: "visible" }}` 를 줍니다.** 그 라이브러리가 안쪽 상자에 `overflow: auto` 를 걸어 두는데, 카드가 칸의 왼쪽 끝에 붙어 서므로 그 선에서 그림자가 잘립니다. `style` 이 안쪽 상자에 닿는 유일한 길입니다.

### 블록 사이의 공용 조각

- `src/tone.ts` — `Tone` 과 tone→클래스 표. 값과 tone 의 대응은 온톨로지가 갖습니다.
- `src/interaction.ts` — 안쪽 컨트롤을 누른 것을 바깥 누르기로 치지 않는 술어. `DataTable` 의 셀과 `ItemList` 의 항목이 같은 것을 읽습니다.
- `src/editing.ts` — 그 자리에서 고치는 칸의 키 규칙(Esc 는 되돌리고 Enter 는 저장하며 여러 줄에서는 ⌘·Ctrl 을 함께 누릅니다). `DataTable` 의 셀 편집기와 `PropertyList` 의 칸이 같은 것을 읽습니다 — 각자 적어 두면 한쪽만 고치는 날 같은 화면에서 Esc 가 두 가지로 동작합니다.
- `src/tool-calls/` — 도구 호출. `Conversation` 이 대화 안에서 `ToolCalls` 로 접어 두고, 오른쪽 레일은 `ToolCallList` 로 줄만 세웁니다. `detail` 이 세 눈금(`hidden` · `shown` · `foldable`)인데, 바깥이 이미 접히는 레일에서는 `foldable` 을 쓰지 않습니다 — 사람이 두 번 펴야 한 줄을 봅니다.
- `src/filter-trigger.tsx` — 조건 트리거. 고르는 방법은 블록마다 다르고 보이는 모양만 공유합니다. 고른 값의 요약은 개수로 갈립니다 — 0개는 요약이 없고, 1~2개는 이름을 배지로 적고, 3개부터 「N개 선택」으로 접습니다. 이 규칙은 `DataTable` 의 패싯 열 필터와 `FilterBar` 의 패싯이 각각 갖고 있으므로 한쪽만 고치지 마십시오.

## DataTable

shadcnblocks data-table 15종(2, 3, 4, 7, 9, 11, 12, 15, 17, 18, 20, 27, 28, 29, 32)을 하나로 합친 블록입니다. `features` 가 축 7개를 정하고, 사용자가 바꾼 값은 `TableView` 하나에 들어갑니다.

열다섯을 하나로 합친 대가로 「어떤 모양이 어떤 축에서 나온 것인가」가 표 하나만 봐서는 보이지 않습니다. 그래서 점검 화면 맨 위에 **축을 하나만 켠 예시**(`_components/AxisTables.tsx`)를 shadcnblocks 목록처럼 나란히 두었습니다. 같은 열두 장이 Figma `■ DataTable` 페이지의 「축 하나씩」 구역에도 이름 · 순서 · 설명 그대로 있습니다. 축을 늘리면 **양쪽에 함께** 늘립니다. ⚠ 예시에 새 모양을 만들지는 마십시오 — `features` 값만 바꾸고, 블록이 못 그리는 모양이 필요하면 블록의 축을 늘립니다. 예시가 축보다 많아지는 순간 점검 화면이 두 번째 정본이 됩니다.

⚠ 이 화면은 표를 여러 개 그리므로 **e2e 셀렉터를 `page` 스코프로 두지 마십시오.** 「축 하나씩」에도 페이지네이션 full 예시가 있어서, `page.getByRole("combobox", { name: "페이지당" })` 이 둘을 잡아 strict mode 로 실패합니다(2026-09-09 실제로 겪음). 반드시 `getByRole("region", …)` 으로 좁힙니다.

### 축 7개

| 축 | 값 | 출처 |
|---|---|---|
| 모양 `appearance` · `density` | `plain`·`bordered`·`striped` · `default`·`compact` | 2, 3 |
| 뷰포트 `viewport` · `overflow` | `paginated`(`minimal`·`full`)·`virtual` · `none`·`horizontal` | 4, 7, 9, 27 |
| 정렬 `sorting` | `none`·`single`·`multi` | 9, 32 |
| 필터 `filter` | `none`·`global`·`facet`·`both` (열 단위 `text`·`facet` 은 `ColumnSpec.filter`) | 9, 12 |
| 열 `columns` | `visibility`·`pinning`·`resizing`·`reordering` | 12, 15, 18, 20 |
| 행 `rows` | `selection`·`reorder`·`actions`·`expansion` | 11, 16, 17, 27 |
| 셀 `cells` | `read`·`range`·`edit` | 28, 29 |

### TableView 의 두 몫

- URL 에 실리는 값: `sorting`, `columnFilters`, `globalFilter`, `pagination`. `serializeTableView`/`parseTableView` 가 `sort=-due_date`, `q`, `page`(1부터), `size`, `f.<열>=값` 형식으로 다룹니다.
- 개인 설정으로 남는 값: `columnVisibility`, `columnOrder`, `columnPinning`, `columnSizing`, `density`.
- 어느 쪽에도 넣지 않는 값: `rowSelection`, `expanded`. 화면 안에서만 삽니다.
- 제어 모드는 `view` + `onViewChange`, 비제어 모드는 `defaultView` 입니다. 서버가 정렬·필터·페이지를 맡으면 `manual` 과 `rowCount` 를 넘깁니다.

### 충돌 규칙

- `paginated` 와 `virtual` 은 서로 배타입니다.
- 행 `selection` 과 셀 `range` 는 클릭의 뜻이 겹치므로 함께 켜지 않습니다.
- 정렬이 걸려 있으면 행 드래그 손잡이가 꺼집니다. 정렬된 표에서 순서를 바꿀 뜻이 없기 때문입니다.
- 클릭 한 번은 `rowPress`, 더블클릭·Enter·F2 는 편집입니다. 셀 안의 컨트롤(체크박스·버튼·메뉴)을 누른 것은 행 누르기로 치지 않습니다.
- 고정 열은 순서 바꾸기 대상이 아닙니다. `overflow: "horizontal"` 이면 첫 데이터 열이 자동으로 왼쪽에 고정되고, 사용자가 직접 고정한 열이 있으면 그것을 존중합니다.
- 머리 몸통을 끌면 열 이동, 오른쪽 가장자리를 끌면 너비 조절입니다. 너비 손잡이가 pointerdown 전파를 멈춰서 두 동작이 섞이지 않습니다.

### 구현할 때 주의할 점

- ⚠ **TanStack 은 상태를 참조로 비교합니다.** `state.sorting` 과 `state.columnFilters` 는 view 의 필드 참조에 `useMemo` 로 묶은 복사본입니다. 렌더마다 새 배열을 넘기면 정렬·필터 행 모델이 매번 다시 계산되고, 그 `onChange` 가 `autoResetPageIndex` 로 페이지 초기화를 큐에 넣어 view 가 또 바뀝니다. 이 연쇄가 마이크로태스크 안에서 돌기 때문에 클릭 이벤트가 영원히 끝나지 않습니다(2026-09-05 e2e 에서 모든 클릭이 30초 타임아웃으로 발견). `onPaginationChange` 가 값이 같으면 같은 객체를 돌려주고 `setView` 가 같은 객체를 무시하는 것도 같은 이유입니다.
- 열 드래그는 `th` 에 dnd-kit 포인터 리스너만 붙입니다. `attributes`(role=button, tabIndex)까지 붙이면 columnheader 의미와 `aria-sort` 가 깨집니다. 키보드 사용자는 열 메뉴의 왼쪽·오른쪽 이동으로 같은 상태를 바꿉니다.
- 전역 검색은 표시 문자열(`cellText`)로 찾습니다. 원시값 `completed` 가 아니라 사용자가 보는 `완료` 로 검색됩니다.
- 메타 열 id 는 `__drag`·`__select`·`__expand`·`__actions` 입니다. 데이터 열 키는 밑줄 둘로 시작할 수 없습니다.
- 셀 형식은 `formatCellValue` 하나로 정합니다. 종류별 포매터는 `@investment/shared/utils/formatters` 와 `dateFormatting` 을 씁니다. 표마다 `toLocaleString` 을 따로 부르던 드리프트를 여기서 막습니다.
- `SelectionBar` 는 `ActionBar` 블록의 어댑터입니다(2026-09-06). 모양은 `ActionBar` 가 갖고, 표의 `BulkAction`(행 배열을 받는다)을 `BarAction`(인자가 없다)으로 옮기는 것만 여기서 합니다.
- 프리미티브 `Pagination` 은 `<a>` 를 그려 disabled 가 없으므로 `Button` 으로 그립니다.
- 셀 종류 `badge` 는 `StatusBadge` 블록을 그립니다(2026-09-06). 표시 문자열은 `format` 으로, 색은 `tone` 또는 `facetOptions[].tone` 으로 정합니다. 상태 값의 tone 대응표는 온톨로지의 enum 정의가 소유하고, 블록은 받은 tone 만 그립니다 — 표 안팎의 상태 색이 한 자리가 됩니다.

### 아직 없는 것

- 서버 페이지네이션(`manual`) 경로의 e2e.
- 열·행 드래그와 범위 드래그의 e2e. 같은 상태를 바꾸는 메뉴·키보드 경로만 단언하고 드래그는 손으로 확인합니다.
- 서버가 값을 계산해 내려 주는 폼의 실제 사례. `FieldGroup` 은 조건만 받고 계산은 받지 않기로 했는데(`rules.ts`), 그 결정이 실제 화면에서 불편한지 아직 겪어 보지 못했습니다.
- `ActionBar` 의 floating 이 겹치는 경우. 한 화면에 표가 둘이면 띠도 둘이 떠서 겹칩니다.
- 다크에서 `--secondary`(브랜드 하늘색)를 쓰는 자리의 눈 검증. 2026-09-06 에 열아홉 장을 다크로 확인했고 색이 깨지는 곳은 없었지만, `TagInput` 의 칩과 `ActionBar` 의 액션 버튼처럼 secondary 를 쓰는 자리는 어두운 바탕에서 밝은 하늘색 덩어리로 튑니다. 1층에서 `--secondary` 가 Light·Dark 같은 값이라 그렇고, 블록이 아니라 테마의 판단입니다.
