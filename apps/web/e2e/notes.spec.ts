import { expect, test, type Page } from "@playwright/test";

import { seedNotes } from "./seedNotes";
import { signIn } from "./signIn";
import { writeNote } from "./writeNote";

/**
 * 쪽지 화면이 행 단위 판정을 드러내는가. 스토리 하나가 e2e 하나다.
 *
 * ⚠ 판정 규칙은 `packages/notes` 가 재고, 질의가 그 규칙과 같은 집합을 내는지는 계약 테스트가 잰다.
 *    여기서 보는 것은 **화면이 그 결과를 그대로 드러내는가**다.
 * ⚠ 시드(`supabase/seeds/10-notes.sql`)가 판정의 네 갈래를 한 벌씩 심었다. 상태를 바꾸는 스펙은 제 쪽지를
 *    새로 만들어 쓴다.
 * ⚠ **목록은 20개씩이다.** 스펙이 쓴 쪽지가 쌓이면 시드의 쪽지는 첫 쪽 밖으로 밀린다. 그래서 특정 쪽지를 보는 스펙은 제목으로 찾아서 본다.
 */
const fresh = (): string => crypto.randomUUID().slice(0, 8);

/**
 * 보이는 것만 센다. 스트리밍 중에는 React 가 도착한 조각을 숨긴 자리(`<div hidden id="S:…">`)에 먼저 싣고 옮기므로, 같은 줄이 잠깐
 * 둘이다. 엄격 모드는 숨은 것까지 세고 기다리지 않고 실패한다.
 */
const items = (page: Page) => page.locator('[data-slot="item"]').filter({ visible: true });

const shown = (page: Page, text: string) => page.getByText(text).filter({ visible: true });

/** 시드(`supabase/seed.sql`)가 김에게 붙인 이름. 이름을 고치는 스펙은 김을 쓰지 않는다 */
const KIM_NAME = "김고객";

/** 쪽지 머리의 ⋯ 메뉴를 연다. 브라우저 쪽이 붙기 전의 눌림은 사라지므로 메뉴가 설 때까지 다시 누른다 */
const openNoteMenu = async (page: Page): Promise<void> =>
{
    await expect(async () =>
    {
        await page.getByRole("button", { name: "쪽지 메뉴" }).click();
        await expect(page.getByRole("menu")).toBeVisible({ timeout: 1000 });
    }).toPass();
};

/** 제목으로 찾은 목록의 주소 */
const paths = (q: string, page?: number): string =>
    `/notes?q=${encodeURIComponent(q)}${page === undefined ? "" : `&page=${page}`}`;

test.describe("쪽지", () =>
{
    test("INV-NOTE-01 김에게는 자기 쪽지와 같은 조직의 공개 쪽지만 보인다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");

        for (const title of ["김의 비공개 메모", "다음 주 회의 안건", "분기 목표 (공유)"])
        {
            await page.goto(paths(title));
            await expect(items(page).filter({ hasText: title })).toBeVisible();
        }

        // 볼 수 없는 쪽지는 찾아도 「아직 없음」과 같은 빈 상태다. 있다는 사실이 수로도 새지 않는다(INV-NOTE-02)
        for (const title of ["이의 비공개 초안", "고객사 B 내부 메모"])
        {
            await page.goto(paths(title));
            await expect(shown(page, "조건에 맞는 쪽지가 없어요")).toBeVisible();
            await expect(items(page)).toHaveCount(0);
        }
    });

    test("INV-NOTE-02 볼 수 없는 쪽지를 주소로 열면 없는 쪽지로 답한다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");

        // 4 는 이의 비공개 초안, 5 는 고객사 B 의 쪽지다
        // ⚠ 상태 코드는 200 이다. 셸이 먼저 스트리밍된 뒤 본문이 notFound() 를 부르기 때문이다(PPR).
        //    그래서 코드가 아니라 화면이 없는 것으로 답하는지를 본다
        for (const noteId of ["4", "5", "없는번호"])
        {
            await page.goto(`/notes/${noteId}`);

            await expect(page.getByText("페이지를 찾을 수 없어요")).toBeVisible();
            await expect(page.getByText("보이면 안 된다")).toHaveCount(0);
        }
    });

    test("쓴 쪽지가 목록에 서고 같은 조직의 다른 사람에게도 보인다", async ({ browser }) =>
    {
        const title = `e2e 공유 ${fresh()}`;
        const kim = await browser.newPage();

        await signIn(kim, "kim@example.test");
        await writeNote(kim, { title, body: "같이 봐요" });

        const lee = await browser.newPage();

        await signIn(lee, "lee@example.test", paths(title));
        await expect(shown(lee, title)).toBeVisible();

        const park = await browser.newPage();

        await signIn(park, "park@example.test", paths(title));
        await expect(shown(park, "조건에 맞는 쪽지가 없어요")).toBeVisible();
        await expect(park.getByText(title)).toHaveCount(0);
    });

    test("제목을 비우면 저장하지 않고 그 칸에 까닭을 적는다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test", "/notes/new");
        await page.getByLabel("제목").fill("   ");
        await page.getByRole("button", { name: "쪽지 쓰기" }).click();

        await expect(page.getByText("제목을 적어 주세요")).toBeVisible();
    });

    test("INV-NOTE-03 쓴 사람은 보관하고, 같은 조직의 다른 사람에게는 보관 단추가 없다", async ({ browser }) =>
    {
        const title = `e2e 보관 ${fresh()}`;
        const kim = await browser.newPage();

        await signIn(kim, "kim@example.test");
        await writeNote(kim, { title });
        await items(kim).filter({ hasText: title }).getByRole("link", { name: "열기" }).click();
        await kim.waitForURL(/\/notes\/\d+$/);

        const noteUrl = kim.url();
        const lee = await browser.newPage();

        await signIn(lee, "lee@example.test", new URL(noteUrl).pathname);
        await expect(lee.getByRole("heading", { name: title })).toBeVisible();
        // 같은 조직의 다른 사람에게는 ⋯ 메뉴에 보관 줄이 없다
        await openNoteMenu(lee);
        await expect(lee.getByRole("menuitem", { name: "링크 복사하기" })).toBeVisible();
        await expect(lee.getByRole("menuitem", { name: "보관하기" })).toHaveCount(0);

        // 되돌릴 수 없는 일이라 확인 창을 거친다
        // 되돌릴 수 없는 일이라 ⋯ 메뉴의 맨 아래에 있다
        await openNoteMenu(kim);
        await kim.getByRole("menuitem", { name: "보관하기" }).click();

        const confirm = kim.getByRole("alertdialog");

        await expect(confirm.getByText("보관한 쪽지는 되돌릴 수 없어요.")).toBeVisible();
        await confirm.getByRole("button", { name: "보관하기" }).click();
        await expect(kim.getByRole("button", { name: /보관/ })).toHaveCount(0);
        await expect(kim.getByRole("main").getByText("보관됨", { exact: true }).first()).toBeVisible();

        // 새로 연 화면도 보관한 쪽지로 선다. 화면이 들고 있던 상태가 아니라 저장된 상태다
        await kim.reload();
        await expect(kim.getByText("보관됨", { exact: true })).toHaveCount(1);
        await openNoteMenu(kim);
        await expect(kim.getByRole("menuitem", { name: "보관하기" })).toHaveCount(0);
    });

    test("찾으면 주소에 남고, 새로 고쳐도 같은 목록이다", async ({ page }) =>
    {
        const mark = `e2e 찾기 ${fresh()}`;

        await signIn(page, "kim@example.test");
        await writeNote(page, { title: mark });
        await page.getByRole("searchbox", { name: "제목으로 찾기" }).fill(mark);
        await page.getByRole("search", { name: "쪽지 찾기" }).getByRole("button", { name: "찾기" }).click();

        await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(mark);
        await expect(items(page)).toHaveCount(1);

        await page.reload();
        await expect(items(page)).toHaveCount(1);
        await expect(page.getByRole("searchbox", { name: "제목으로 찾기" })).toHaveValue(mark);
    });

    test("맞는 것이 없으면 조건 지우기로 전체 목록에 돌아온다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test", paths(`없는 말 ${fresh()}`));

        await expect(shown(page, "조건에 맞는 쪽지가 없어요")).toBeVisible();
        await page.getByRole("link", { name: "조건 지우기" }).click();

        await expect(page).toHaveURL(/\/notes$/);
        await expect(page.getByRole("searchbox", { name: "제목으로 찾기" })).toHaveValue("");
        await expect(items(page).first()).toBeVisible();
    });

    test("다음 페이지로 넘기면 주소가 page=2 이고 발치의 범위가 바뀐다", async ({ page }) =>
    {
        const mark = `e2e 쪽 ${fresh()}`;

        // 이(3)의 비공개 쪽지로 심는다. 같은 조직의 공개 쪽지로 심으면 나란히 도는 스펙이 김으로 쓴 쪽지가 첫 쪽 밖으로 밀린다
        await seedNotes({ tenantId: 2, authorId: 3, mark, count: 21, visibility: "private" });
        await signIn(page, "lee@example.test", paths(mark));

        const pager = page.getByRole("navigation", { name: "페이지 넘기기" });

        await expect(pager).toContainText("21개 중 1–20");
        await expect(pager.getByRole("link", { name: "이전 페이지" })).toHaveCount(0);
        await pager.getByRole("link", { name: "다음 페이지" }).click();

        await expect(page).toHaveURL(/[?&]page=2$/);
        await expect(pager).toContainText("21개 중 21–21");
        await expect(items(page)).toHaveCount(1);
        await expect(pager.getByRole("link", { name: "다음 페이지" })).toHaveCount(0);
        await expect(pager.getByRole("link", { name: "이전 페이지" })).toBeVisible();
    });

    test("목록에서 쪽지 쓰기를 누르면 다이얼로그로 열리고, 쓰면 닫혀 새 쪽지가 목록 맨 위에 선다", async ({ page }) =>
    {
        const title = `e2e 다이얼로그 ${fresh()}`;

        await signIn(page, "kim@example.test");
        // 다이얼로그가 서고, 닫히고, 주소가 /notes 로 돌아오는 것까지 도우미가 본다
        await writeNote(page, { title });

        await expect(items(page).first()).toContainText(title);
    });

    test("/notes/new 로 바로 오면 같은 폼이 전체 페이지로 선다", async ({ page }) =>
    {
        const title = `e2e 전체 페이지 ${fresh()}`;

        await signIn(page, "kim@example.test", "/notes/new");

        await expect(page.getByRole("heading", { name: "쪽지 쓰기", level: 1 })).toBeVisible();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.getByLabel("제목")).toBeFocused();

        await page.getByLabel("제목").fill(title);
        await page.getByRole("button", { name: "쪽지 쓰기" }).click();

        await expect(page).toHaveURL(/\/notes$/);
        await expect(shown(page, title)).toBeVisible();
    });

    test("상세는 머리에 제목 · 상태를, 옆 기둥에 공개 범위 · 쓴 사람 · 쓴 날을 세운다", async ({ browser }) =>
    {
        // 2 는 김이 쓴 공개 쪽지 「다음 주 회의 안건」이다
        const lee = await browser.newPage();

        await signIn(lee, "lee@example.test", "/notes/2");

        const properties = lee.getByRole("complementary", { name: "속성" });

        await expect(lee.getByRole("heading", { name: "다음 주 회의 안건", level: 1 })).toBeVisible();
        await expect(properties).toContainText("조직 전체");
        await expect(properties).toContainText(KIM_NAME);

        const kim = await browser.newPage();

        await signIn(kim, "kim@example.test", "/notes/2");
        // 내가 쓴 쪽지는 이름 대신 「나」다
        await expect(kim.getByRole("complementary", { name: "속성" })).toContainText("쓴 사람나");
    });
});
