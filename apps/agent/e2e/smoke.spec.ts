import { expect, test } from "@playwright/test";

/**
 * 스모크. 배선이 살아 있는지를 닫힌 서버(배포와 같은 모양)에서 잰다.
 */
test.describe("agent 셸", () =>
{
    test("로그인하지 않으면 셸에 닿지 못하고 로그인 화면으로 간다", async ({ page }) =>
    {
        await page.goto("/chat");

        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole("button", { name: "Google 계정으로 로그인" })).toBeVisible();
    });

    test("대화 창구도 세션 없이는 답하지 않는다. 라우트 핸들러도 공개 엔드포인트다", async ({ request }) =>
    {
        const response = await request.post("/api/chat", { data: { messageId: "m", text: "안녕" }, maxRedirects: 0 });

        expect([302, 307, 401]).toContain(response.status());
    });

    test("프로덕션 빌드에는 로컬 계정 칸이 없다", async ({ page }) =>
    {
        await page.goto("/login");

        await expect(page.getByRole("heading", { name: "로컬 계정으로 로그인" })).toHaveCount(0);
        await expect(page.getByLabel("비밀번호")).toHaveCount(0);
    });
});
