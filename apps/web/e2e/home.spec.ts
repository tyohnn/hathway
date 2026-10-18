import { expect, test } from "@playwright/test";

import { LOCAL_PASSWORD, signIn } from "./signIn";

/**
 * 홈이 대시보드 해부도(`/ia-design` 의 `references/dashboard.md` 3번)대로 서는가. 위에서부터 루프 진입점 → 처리할 것 → 최근이고,
 * 이어 할 쪽지가 없는 조직에는 최근 대신 시작 점검표가 선다.
 *
 * ⚠ 누구에게 무엇이 서는지는 `usecases/home.test.ts` 가 잰다. 여기서는 시드 계정 셋으로 그 판정이 화면까지 오는지만 본다.
 */
test.describe("홈", () =>
{
    test("갈 곳 없이 로그인하면 홈으로 오고, 만들기 · 처리할 것 · 최근 쪽지가 위에서부터 선다", async ({ page }) =>
    {
        await page.goto("/login");
        await page.getByLabel("이메일").fill("kim@example.test");
        await page.getByLabel("비밀번호").fill(LOCAL_PASSWORD);
        await page.getByRole("button", { name: "로그인", exact: true }).click();

        await expect(page).toHaveURL(/\/home$/);
        await expect(page.getByRole("heading", { name: "홈", level: 1 })).toBeVisible();
        await expect(page.getByRole("region", { name: "만들기" }).getByRole("link", { name: "쪽지 쓰기", exact: true })).toBeVisible();

        // 구성원에게는 기다리는 초대가 처리할 것으로 서지 않는다. 지어낸 할 일도 세우지 않는다
        await expect(page.getByText("처리할 것이 없어요")).toBeVisible();
        await expect(page.getByText("최근 쪽지", { exact: true })).toBeVisible();
        // 어느 쪽지가 맨 위인지는 재지 않는다. 쪽지 e2e 가 같은 조직에 쪽지를 쌓아서 돌 때마다 달라진다
        await page.getByRole("link", { name: / 열기$/ }).first().click();

        await expect(page).toHaveURL(/\/notes\/\d+$/);
    });

    test("팀을 관리하는 사람에게는 초대받고 아직 로그인하지 않은 사람이 처리할 것으로 서고, 팀 화면으로 이어진다", async ({ page }) =>
    {
        await signIn(page, "lee@example.test", "/home");

        await expect(page.getByText(/초대받고 아직 로그인하지 않은 사람 \d+명/)).toBeVisible();
        await page.getByRole("link", { name: "팀에서 보기" }).click();

        await expect(page).toHaveURL(/\/settings\/team$/);
    });

    test("이어 할 쪽지가 없는 조직의 홈에는 최근 대신 시작 점검표가 선다", async ({ page }) =>
    {
        await signIn(page, "cee@example.test", "/home");

        const checklist = page.getByRole("list", { name: "시작하기" });
        await expect(checklist.getByRole("link", { name: /첫 쪽지 쓰기/ })).toBeVisible();
        await expect(checklist.getByRole("link", { name: /멤버 초대하기/ })).toBeVisible();
        await expect(checklist.getByRole("link", { name: /Claude에 연결하기/ })).toBeVisible();

        await checklist.getByRole("link", { name: /첫 쪽지 쓰기/ }).click();
        await expect(page).toHaveURL(/\/notes\/new$/);
        await expect(page.getByLabel("제목")).toBeFocused();
    });
});
