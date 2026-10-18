import { expect, test } from "@playwright/test";

import { signIn } from "./signIn";

/**
 * 설정의 팀 · 내 계정 화면. 판정 규칙은 `packages/access` 의 `team.test.ts` 가 재고, 쓰기의 조건과 권한은 계약과
 * Postgres 검사가 잰다. 여기서 보는 것은 **화면이 그 결과를 그대로 드러내는가**다.
 *
 * ⚠ 시드: 고객사 A 의 소유주는 이(lee), 구성원은 김(kim)과 내보낼사람(leaver)이다. 상태를 바꾸는 스펙은 매번
 *    같은 상태에서 시작하도록 처음에 되돌려 놓거나(leaver 를 다시 초대), 새 주소를 쓴다.
 */
const fresh = (): string => crypto.randomUUID().slice(0, 8);

test.describe("팀", () =>
{
    test("INV-ACCESS-09 소유자(lee)는 팀 화면에서 새 주소를 초대하고 목록에 그 사람이 선다", async ({ page }) =>
    {
        const email = `invited-${fresh()}@example.test`;

        await signIn(page, "lee@example.test", "/settings/team");
        await page.getByRole("textbox", { name: "이메일" }).fill(email);
        await page.getByRole("button", { name: "초대하기" }).click();

        await expect(page.getByRole("status")).toContainText("초대했어요");
        await expect(page.getByRole("table").getByText(email, { exact: true })).toBeVisible();
        // 아직 로그인하지 않은 사람이라 이메일 옆에 「초대됨」이 선다
        await expect(page.getByRole("row").filter({ hasText: email }).getByText("초대됨")).toBeVisible();

        // 고객사 A 는 프로 요금제(멤버 20명)다. 실행마다 한 명씩 쌓이면 한도에 닿으므로 초대한 사람을 다시 뺀다
        await page.getByRole("button", { name: `${email} 팀에서 빼기` }).click();
        await expect(page.getByRole("table").getByText(email, { exact: true })).toHaveCount(0);
    });

    test("INV-ACCESS-03 나간 계정은 멤버십이 살아 있어도 팀 목록에 없다", async ({ page }) =>
    {
        await signIn(page, "lee@example.test", "/settings/team");

        await expect(page.getByText("kim@example.test")).toBeVisible();
        await expect(page.getByText("gone@example.test")).toHaveCount(0);
    });

    test("두 조직에 속한 사람은 사이드바에 지금 조직 이름이 선다", async ({ page }) =>
    {
        await signIn(page, "both@example.test");

        await expect(page.getByText(/^(운영팀|고객사 A)$/)).toBeVisible();
    });

    test("한 조직에만 속한 사람의 사이드바에는 조직 이름이 서지 않는다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");

        await expect(page.getByText("김고객", { exact: true })).toBeVisible();
        await expect(page.getByText("고객사 A", { exact: true })).toHaveCount(0);
    });

    test("INV-ACCESS-09 멤버(kim)에게는 팀 목록만 보이고 초대 · 역할 · 팀에서 빼기 단추가 없다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test", "/settings/team");

        await expect(page.getByText("이고객")).toBeVisible();
        await expect(page.getByRole("button", { name: "초대하기" })).toHaveCount(0);
        await expect(page.getByRole("combobox", { name: /역할$/ })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /팀에서 빼기$/ })).toHaveCount(0);
    });

    test("INV-ACCESS-03 팀에서 뺀 사람은 다음에 들어오면 /no-access 로 간다", async ({ browser }) =>
    {
        const owner = await browser.newPage();

        await signIn(owner, "lee@example.test", "/settings/team");

        // 앞선 실행에서 뺐으면 다시 잇는다. 이미 팀에 있으면 「이미 팀에 있는 사람이에요」로 끝난다
        // ⚠ 알림은 폼 안에서 찾는다. Next 의 경로 알림도 role="alert" 라서 폼 밖에서 찾으면 초대가 끝나기 전에 지나간다
        const form = owner.locator("form").filter({ has: owner.getByRole("button", { name: "초대하기" }) });

        await form.getByRole("textbox", { name: "이메일" }).fill("leaver@example.test");
        await form.getByRole("button", { name: "초대하기" }).click();
        await expect(form.getByRole("status").or(form.getByRole("alert"))).toBeVisible();
        await owner.reload();

        await owner.getByRole("button", { name: "내보낼사람 팀에서 빼기" }).click();
        await expect(owner.getByText("leaver@example.test")).toHaveCount(0);
        await owner.close();

        const leaver = await browser.newPage();

        await signIn(leaver, "leaver@example.test");
        await expect(leaver).toHaveURL(/\/no-access/);
        await leaver.close();
    });

    test("INV-ACCESS-10 소유자 줄에는 역할 바꾸기와 팀에서 빼기가 없다", async ({ page }) =>
    {
        await signIn(page, "lee@example.test", "/settings/team");

        await expect(page.getByText("이고객 (나)")).toBeVisible();
        await expect(page.getByRole("combobox", { name: "이고객 역할" })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "이고객 팀에서 빼기" })).toHaveCount(0);
        // 다른 사람의 줄에는 선다. 관리할 수 없어서 빠진 것이 아니라 소유자라서 빠진 것이다
        await expect(page.getByRole("combobox", { name: "김고객 역할" })).toBeVisible();
    });

    test("내 계정에서 이름을 바꾸면 사이드바의 이름도 바뀐다", async ({ page }) =>
    {
        const name = `박 ${fresh()}`;

        await signIn(page, "park@example.test", "/settings/account");
        await page.getByRole("textbox", { name: "이름" }).fill(name);
        await page.getByRole("button", { name: "저장하기" }).click();

        await expect(page.getByRole("status")).toHaveText("저장했어요.");
        // 이름은 두 자리에 선다. 본문의 프로필 카드와 사이드바의 계정 자리다
        await expect(page.getByRole("main").getByText(name, { exact: true })).toBeVisible();
        await expect(page.locator("[data-slot=sidebar-footer]").getByText(name, { exact: true })).toBeVisible();
    });
});
