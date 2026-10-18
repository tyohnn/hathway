# 이 저장소에서 IA 를 짓는 법

Next.js 16 App Router · `cacheComponents` 위에서 SKILL.md 의 그릇과 주소 상태를 세우는 법이다. 화면을 세우는 규칙(정적 껍데기 ·
`appRead` · `appAction`)은 루트 `CLAUDE.md` 가 정본이고 여기에 옮겨 적지 않는다. 여기에는 IA 에서 새로 생기는 것만 둔다.

⚠ Next 16 의 파일 규약은 학습한 것과 다를 수 있다. 짓기 전에 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/` 의
`parallel-routes.md` · `intercepting-routes.md` · `default.md` 를 읽는다.

## 그릇마다 쓰는 재료

| 그릇 | 재료 |
|---|---|
| 목록 | 블록 `item-list` · tyohnn 블록 `data-table-card` · 편입한 kit 의 `ListCard`. 거름 띠는 `filter-bar` |
| 상세 머리와 탭 | tyohnn 블록 `record-heading` · `detail-heading` · `page-tabs` |
| 시트(옆 패널) | `@hathway/ui/components/sheet` 안에 블록 `detail-panel`(「URL 로 여닫는 상세 패널의 안쪽」) |
| 다이얼로그 | `@hathway/ui/components/dialog`, 폼은 블록 `form-sheet` · `field-group` |
| 알림 다이얼로그 | `@hathway/ui/components/alert-dialog` |
| 팝오버 · 제자리 편집 | `@hathway/ui/components/popover`, 블록 `property-list`(누르면 그 자리에 칸이 선다) |
| 모바일의 아래 시트 | `@hathway/ui/components/drawer` |
| ⌘K 커맨드 팔레트 | `@hathway/ui/components/command` 를 다이얼로그에 담는다 |
| 워크벤치 | 블록 `workbench`(왼쪽 목록 · 오른쪽 상세 2단), 판 전체는 kit 의 `ScreenFrame` |

후보를 넓게 보려면 `node .claude/skills/scaffold-fit/scripts/materials.mjs <낱말>` 을 돌린다.

## 상세와 탭

```
projects/[id]/
├─ layout.tsx      머리 + 탭 띠. params 를 맨 위에서 기다리지 않는다
├─ page.tsx        개요 탭
├─ activity/       탭
└─ settings/       탭
```

- 머리의 값(이름 · 상태)은 레이아웃 안의 제 `<Suspense>` 에서 읽는다. 탭 띠는 데이터가 없으니 `<Suspense>` 밖에서 굽는다.
- 지금 어느 탭인지는 클라이언트 조각이 `useSelectedLayoutSegment()` 로 안다. 탭의 주소는 `lib/paths.ts` 에 헬퍼로 더한다
  (`paths.project(id)` · `paths.projectActivity(id)`).
- 가벼운 탭(같은 데이터의 다른 그림)은 세그먼트를 만들지 않고 `?tab=` 이다. 판단은 SKILL.md 5번.

## 목록 위에 뜨는 다이얼로그 · 시트(가로챈 라우트)

목록에서 누르면 다이얼로그로 뜨고, 주소로 바로 오면 전체 페이지로 서는 짜임이다.

```
projects/
├─ layout.tsx             { children, modal } 을 받아 나란히 그린다
├─ page.tsx               목록
├─ @modal/default.tsx     export default function Default() { return null; }
├─ @modal/page.tsx        목록으로 돌아오면 닫는다. null
├─ @modal/[...catchAll]/page.tsx  같은 화면 안의 다른 주소로 가면 닫는다. null
├─ @modal/(.)new/page.tsx 다이얼로그로 감싼 만들기 폼
└─ new/page.tsx           같은 폼을 전체 페이지로
```

- ⚠ **슬롯마다 `default.tsx` 가 있어야 한다.** 없으면 새로 고침(하드 이동) 때 그 슬롯이 404 가 된다.
- `(.)` 은 파일 위치가 아니라 **라우트 세그먼트**를 센다. `@modal` 은 세그먼트가 아니므로 `projects/@modal/(.)new` 는 `/projects/new` 를 가로챈다.
- ⚠ **슬롯은 맞는 페이지가 없으면 앞의 것을 그대로 둔다**(부드러운 이동). 다이얼로그에서 목록으로 돌아와도 다이얼로그가 남는다. 그래서
  목록 주소와 그 아래 다른 주소에 `null` 을 그리는 페이지(`@modal/page.tsx` · `@modal/[...catchAll]`)를 둔다.
- 다이얼로그를 닫는 일(✕ · Esc · 바깥 누름)은 클라이언트 감싸개가 `router.back()` 으로 한다. 폼은 두 페이지가 함께 쓴다.
- 폼이 저장에 성공하면 `router.replace(목록)` 로 간다. 다이얼로그는 위의 `null` 페이지로 닫히고 전체 페이지도 같은 곳으로 간다. `replace` 라서
  뒤로 가기가 빈 폼을 다시 열지 않는다. 액션이 `revalidatePath` 로 목록을 새로 고치는지 본다.
- 가로챈 페이지도 정적 껍데기 규칙을 지난다. `params` 는 맨 위에서 기다리지 않고 안쪽 조각의 `<Suspense>` 로 넘긴다.
- 이 저장소의 본보기는 `apps/web/src/app/(app)/notes/` 의 새 쪽지다. e2e 둘(목록에서 눌러 다이얼로그 · 주소로 바로 와서 전체 페이지)이 `notes.spec.ts` 에 있다.
- 가로챔은 같은 세그먼트 안에서 누를 때만 일어난다. 홈 · 사이드바처럼 다른 화면에서 누르면 전체 페이지가 선다. 그 화면에도 다이얼로그를 띄우려면
  `@modal` 을 그 위의 레이아웃으로 올린다.

## 거름 · 정렬 · 검색어

- 화면은 `searchParams` 를 맨 위에서 기다리지 않고 약속 그대로 목록 조각에 넘긴다(정적 껍데기 2번). 거름 띠는 데이터가 없으면 `<Suspense>` 밖이다.
- 거름을 바꾸는 클라이언트 조각은 `router.replace(withQuery(paths.projects(), { q, sort }), { scroll: false })` 로 고친다. 상세로 가는 이동만 `push` 다.
- 주소 값은 도메인의 순수 함수가 질의로 다듬는다(쪽지는 `noteQueryFrom`). 모르는 값은 기본값으로 읽고 오류로 만들지 않는다(옛 링크가 깨지지 않게).
- 거르고 자르고 세는 일은 포트의 연산 하나가 질의로 한다(쪽지는 `NoteStore.listPage`). 다 읽어 화면 앞에서 자르지 않는다. 총수도 볼 수 있는 것만
  세야 남의 행이 수로 새지 않는다. 계약 테스트가 그것과 `like` 기호(`%` · `_`)를 메모리와 Postgres 에서 함께 잰다.
- 찾는 칸이 지금의 찾는 말을 보이려면 주소를 읽으므로 제 `<Suspense>` 안에 선다. 기다리는 얼굴은 같은 칸의 꺼진 모양이다(`NoteSearch q={null}`).
  `next/form` 으로 두면 자바스크립트 없이도 `?q=` 로 간다.
- 빈 상태 셋(아직 없음 · 거름에 맞는 것 없음 · 끝을 넘은 쪽)은 순수 함수가 가른다(`planListing`). 볼 수 없는 것만 있는 사람에게는 첫째가 선다.

## ⌘K 커맨드 팔레트

- 대시보드 셸에 한 번 서 있다(`(app)/_components/CommandPalette.tsx`). 항목은 메뉴의 정본(`navGroups.tsx` 의 `paletteFor`)과
  만들 수 있는 것(`lib/paths.ts` 의 `creatables`)이다. 새 객체를 더하면 `creatables` 에 한 줄을 더해 만들기 단추와 팔레트에 함께 서게 한다.
- 최근에 연 객체는 아직 없다.
- 최근 객체는 사람마다 다르므로 팔레트를 열 때 읽는다. 셸의 틀에 굽지 않는다.
- 팔레트의 항목도 주소를 `lib/paths.ts` 로 만든다.

## 루프의 클릭 수를 e2e 로 잰다

SKILL.md 1번의 클릭 예산을 스펙 하나로 굳힌다. 예산을 넘는 IA 변경이 들어오면 빨개진다.

```ts
test("핵심 루프: 홈에서 세 번 눌러 새 프로젝트의 개요에 닿는다", async ({ page }) =>
{
    let clicks = 0;
    const press = async (target: Locator): Promise<void> =>
    {
        clicks += 1;
        await target.click();
    };

    await signIn(page, "kim@example.test", paths.home());
    await press(page.getByRole("link", { name: "새 프로젝트" }));
    await page.getByLabel("이름").fill("루프 시험");
    await press(page.getByRole("button", { name: "만들기" }));
    await expect(page.getByRole("heading", { level: 1, name: "루프 시험" })).toBeVisible();
    expect(clicks).toBeLessThanOrEqual(3);
});
```

- 글자를 넣는 일은 세지 않는다. 누르는 일만 센다.
- 스펙의 이름에 예산을 적는다. 예산을 바꾸는 것은 IA 를 바꾸는 결정이라 이름이 함께 바뀌어야 한다.

## 라우트 나무를 찍는다

```bash
node .claude/skills/ia-design/scripts/routes.mjs [앱 이름]   # 기본은 web
```

그룹(셸) · 동적 세그먼트 · 병렬 슬롯 · 가로챈 라우트를 나무로 찍고, 주소 깊이가 셋을 넘는 화면과 슬롯에 `default.tsx` 가 없는 자리를
알린다. 지도를 그리기 전에 지금 모양을 보고, 다 지은 뒤 지도와 맞는지 본다.
