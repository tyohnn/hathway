import { expect, type Page } from "@playwright/test";

/**
 * 시드 계정으로 로그인한다. 비밀번호는 `supabase/seed.sql` 이 넣은 로컬 전용 값이다.
 *
 * ⚠ 열린 서버(4401)에서만 선다. 닫힌 서버에는 로컬 계정 칸이 없다.
 */
export const LOCAL_PASSWORD = "hathway-local";

export const signIn = async (page: Page, email: string, target = "/notes"): Promise<void> =>
{
    await page.goto(`/login?redirect=${encodeURIComponent(target)}`);
    await page.getByLabel("이메일").fill(email);
    await page.getByLabel("비밀번호").fill(LOCAL_PASSWORD);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).not.toHaveURL(/\/login/);
};
