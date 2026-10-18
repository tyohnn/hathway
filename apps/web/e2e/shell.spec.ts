import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./signIn";

/**
 * 셸이 대시보드 해부도(`/ia-design` 의 `references/dashboard.md` 2 · 7번)대로 서는가.
 *
 * ⚠ 브라우저 쪽이 붙기 전의 눌림은 사라진다(틀이 먼저 구워져 오기 때문이다). 열쇠와 단추는 먹을 때까지 다시 누른다.
 */
const openPalette = async (page: Page): Promise<void> =>
{
    const dialog = page.getByRole("dialog");

    await expect(async () =>
    {
        await page.keyboard.press("Control+K");
        await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass();
};

test.describe("셸", () =>
{
    test("사이드바에는 설정이 한 줄이고, 들어가면 옆 메뉴가 개인 · 조직 · 결제 갈래로 선다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");

        // 팀 · 내 계정 · 요금제는 사이드바에 따로 서지 않는다
        await expect(page.getByRole("link", { name: "팀", exact: true })).toHaveCount(0);
        await page.getByRole("link", { name: "설정", exact: true }).click();

        await expect(page).toHaveURL(/\/settings\/account/);
        const settings = page.getByRole("navigation", { name: "설정" });
        await expect(settings.getByText("개인", { exact: true })).toBeVisible();
        await expect(settings.getByText("조직", { exact: true })).toBeVisible();
        await expect(settings.getByRole("link", { name: "내 계정" })).toHaveAttribute("aria-current", "page");

        await settings.getByRole("link", { name: "팀", exact: true }).click();
        await expect(page).toHaveURL(/\/settings\/team/);
        // 위 띠가 설정 안의 자리를 함께 적는다
        await expect(page.getByRole("navigation", { name: "현재 위치" })).toContainText("설정");
        await expect(page.getByRole("navigation", { name: "현재 위치" })).toContainText("팀");
    });

    test("⌘K 로 연 팔레트에서 팀을 고르면 팀 화면으로 간다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");
        await openPalette(page);

        await page.getByRole("dialog").getByRole("combobox").fill("팀");
        await page.keyboard.press("Enter");

        await expect(page).toHaveURL(/\/settings\/team/);
        await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("사이드바의 만들기는 쪽지 폼으로 가서 제목 칸에 커서를 둔다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test", "/settings/account");
        await page.getByRole("link", { name: "쪽지 쓰기", exact: true }).click();

        await expect(page).toHaveURL(/\/notes\/new$/);
        await expect(page.getByLabel("제목")).toBeFocused();
    });
});
