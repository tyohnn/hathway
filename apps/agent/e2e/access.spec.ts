import { expect, test } from "@playwright/test";

import { signIn } from "./signIn";

/**
 * agent 의 문. 운영팀만 지난다(`packages/access` 의 `canEnterApp`).
 */
test.describe("agent 의 문", () =>
{
    test("운영팀의 사람은 들어온다", async ({ page }) =>
    {
        await signIn(page, "ops@example.test");

        await expect(page.getByRole("heading", { name: "대화", exact: true })).toBeVisible();
    });

    test("고객사의 사람은 로그인은 되고 /no-access 로 간다. 고객에게는 아직 열지 않은 앱이다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");

        await expect(page).toHaveURL(/\/no-access/);
    });

    test("INV-ACCESS-02 겸직 계정은 운영팀으로 들어온다", async ({ page }) =>
    {
        await signIn(page, "both@example.test");

        await expect(page.getByRole("heading", { name: "대화", exact: true })).toBeVisible();
    });
});
