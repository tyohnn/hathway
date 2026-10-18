import { expect, type Page } from "@playwright/test";

/**
 * 쪽지 화면에서 쓰기 다이얼로그를 열어 쪽지 하나를 쓰고, 목록으로 돌아온 것까지 본다.
 *
 * ⚠ **다이얼로그로 쓴다.** 페이지를 새로 싣지 않으므로 브라우저 쪽 상태(분석의 연습 창구 기록 등)가 이어진다. 브라우저 쪽이 붙기 전에
 *    누르면 링크가 전체 페이지(`/notes/new`)로 가 버리므로, 붙을 때까지 기다린 뒤 다이얼로그가 선 것을 확인한다.
 */
export const openNewNoteDialog = async (page: Page): Promise<void> =>
{
    await page.waitForLoadState("networkidle");
    await page.locator('[data-slot="page-header"]').getByRole("link", { name: "쪽지 쓰기" }).click();
    await expect(page.getByRole("dialog", { name: "쪽지 쓰기" })).toBeVisible();
};

export const writeNote = async (page: Page, { title, body = "" }: { readonly title: string; readonly body?: string }): Promise<void> =>
{
    if (!/\/notes$/.test(new URL(page.url()).pathname))
    {
        await page.goto("/notes");
    }

    await openNewNoteDialog(page);

    const dialog = page.getByRole("dialog", { name: "쪽지 쓰기" });

    await dialog.getByLabel("제목").fill(title);
    await dialog.getByLabel("내용").fill(body);
    await dialog.getByRole("button", { name: "쪽지 쓰기" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/notes$/);
    // 숨은 스트리밍 자리의 같은 줄은 세지 않는다(`notes.spec.ts` 의 `items`)
    await expect(page.getByText(title).filter({ visible: true })).toBeVisible();
};
