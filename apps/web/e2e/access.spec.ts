import { expect, test } from "@playwright/test";

import { signIn } from "./signIn";

/**
 * 앱의 문(`canEnterApp`)이 화면에서 실제로 걸리는가. 판정 규칙 자체는 `packages/access` 가 잰다.
 */
test.describe("web 의 문", () =>
{
    test("고객사의 사람은 들어온다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");

        await expect(page.getByRole("heading", { name: "쪽지" })).toBeVisible();
    });

    test("운영팀의 사람도 들어온다", async ({ page }) =>
    {
        await signIn(page, "ops@example.test");

        await expect(page.getByRole("heading", { name: "쪽지" })).toBeVisible();
    });

    test("셸의 본문 랜드마크는 하나다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");

        // 두 겹이면 스크린리더가 본문을 둘로 읽는다. 셸(`AppShell`)과 그 안의 프리미티브가 저마다 그리던 자리다
        await expect(page.getByRole("heading", { name: "쪽지" })).toBeVisible();
        await expect(page.getByRole("main")).toHaveCount(1);
    });

    test("명부에 없는 사람은 로그인은 되고 /no-access 로 간다", async ({ page }) =>
    {
        await signIn(page, "outsider@example.test");

        await expect(page).toHaveURL(/\/no-access/);
        await expect(page.getByRole("heading", { name: "이 계정으로는 들어갈 수 없어요" })).toBeVisible();
    });

    test("INV-ACCESS-03 나간 사람은 멤버십이 남아 있어도 /no-access 로 간다", async ({ page }) =>
    {
        await signIn(page, "gone@example.test");

        await expect(page).toHaveURL(/\/no-access/);
    });

    test("문을 지나지 못한 사람의 원본 응답에는 틀만 있고 쪽지가 없다. 데이터는 조회마다 관문이 지킨다", async ({ page }) =>
    {
        // 게이트가 본문 옆에 서서 틀이 먼저 나간다(`CLAUDE.md` 「정적 껍데기」). 그래도 데이터는 `appRead` 를 지나야 나온다.
        // 같은 조직의 김에게는 원본 응답에 쪽지 제목이 실려서, 이 단언이 헛돌지 않는다는 것을 함께 본다
        // ⚠ 목록이 20개씩이라 시드의 쪽지는 찾아야 첫 쪽에 선다. 찾는 말을 제목의 일부로 두어 찾는 칸에 남은 글이 단언을 채우지 않게 한다
        const listed = `/notes?q=${encodeURIComponent("회의 안건")}`;

        await signIn(page, "kim@example.test");
        const member = await (await page.request.get(listed, { maxRedirects: 0 })).text();

        expect(member).toContain("다음 주 회의 안건");

        await page.context().clearCookies();
        await signIn(page, "gone@example.test");
        const outsider = await (await page.request.get(listed, { maxRedirects: 0 })).text();

        expect(outsider).toContain('data-slot="page-header"');
        expect(outsider).not.toContain("다음 주 회의 안건");
        expect(outsider).not.toContain("분기 목표");
    });

    test("틀린 비밀번호는 로그인 화면에 머물고 어긋남을 알린다", async ({ page }) =>
    {
        await page.goto("/login");
        await page.getByLabel("이메일").fill("kim@example.test");
        await page.getByLabel("비밀번호").fill("wrong-password");
        await page.getByRole("button", { name: "로그인", exact: true }).click();

        await expect(page).toHaveURL(/error=credentials/);
        await expect(page.getByText("이메일이나 비밀번호가 맞지 않아요")).toBeVisible();
    });
});
