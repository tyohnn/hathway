import { expect, test } from "@playwright/test";

/**
 * 스모크. 기능 검증이 아니라 **배선이 실제로 살아 있는지**를 지킨다. 닫힌 서버(배포와 같은 모양)에서 돈다.
 *
 * 셀렉터는 role · text 기준으로 쓴다. 고정 `waitForTimeout` 을 쓰지 않고 `expect(...)` 가 기다리게 둔다.
 */
test.describe("web 셸", () =>
{
    test("로그인하지 않으면 셸에 닿지 못하고 로그인 화면으로 간다", async ({ page }) =>
    {
        await page.goto("/notes");

        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole("button", { name: "Google 계정으로 로그인" })).toBeVisible();
    });

    test("돌아갈 주소를 들고 간다", async ({ page }) =>
    {
        await page.goto("/notes/3");

        await expect(page).toHaveURL(/redirect=%2Fnotes%2F3/);
    });

    test("프로덕션 빌드에는 로컬 계정 칸이 없다. 개발에서만 서는 자리다", async ({ page }) =>
    {
        await page.goto("/login");

        await expect(page.getByRole("button", { name: "Google 계정으로 로그인" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "로컬 계정으로 로그인" })).toHaveCount(0);
        await expect(page.getByLabel("비밀번호")).toHaveCount(0);
    });

    test("프로덕션 빌드에는 플러그인 목업 페이지가 없다. 개발에서만 서는 자리다", async ({ request }) =>
    {
        const response = await request.get("/mock/plugin");

        expect(response.status()).toBe(404);
    });
});
