import { expect, test } from "@playwright/test";

/**
 * 종목 · 부동산 화면은 로그인하지 않아도 읽는다(INV-RESEARCH-01). 숫자는 로컬 시드(`supabase/seeds/05-market.sql`)의
 * 두 종목(크래프톤 `259960` · 에코프로비엠 `247540`)이 채운다.
 *
 * 여기서는 **문이 열려 있고 시드의 숫자가 화면까지 오는가**만 본다. 계산은 단위 테스트가 잰다.
 */
test.describe("시장 화면", () =>
{
    test("로그인 없이 종목 화면이 열리고 시드 종목의 이름이 선다", async ({ page }) =>
    {
        await page.goto("/stocks/analysis/259960");

        await expect(page).toHaveURL(/\/stocks\/analysis\/259960$/);
        await expect(page.getByRole("main").getByText("크래프톤").first()).toBeVisible();
    });

    test("로그인 없이 산업 지도가 열린다", async ({ page }) =>
    {
        await page.goto("/stocks/macro/industries");

        await expect(page.getByRole("heading", { name: "산업 지도", level: 1 })).toBeVisible();
    });

    test("옛 종목 주소는 새 주소로 넘어간다", async ({ page }) =>
    {
        await page.goto("/company/247540");

        await expect(page).toHaveURL(/\/stocks\/analysis\/247540$/);
    });
});
