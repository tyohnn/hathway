import { expect, type Page, test } from "@playwright/test";

import { signIn } from "./signIn";

/**
 * 에이전트와의 대화가 Workflow 위에서 끝까지 도는가.
 *
 * 연습 모델(`src/workflows/rehearsalModel.ts`)이 「쪽지」라는 말에 `list_my_notes` 를 부르고 그 답을 옮긴다.
 * 그래서 이 스펙은 모델 없이도 워크플로 · 도구 스텝 · 행 단위 술어 · 훅 · 장부를 한 번에 지난다.
 */
const say = async (page: Page, text: string): Promise<void> =>
{
    await page.getByLabel("메시지").fill(text);
    await page.getByRole("button", { name: "보내기" }).click();
};

const conversation = (page: Page) => page.getByRole("list", { name: "대화" });

test.describe("대화", () =>
{
    test("INV-NOTE-01 에이전트의 도구도 그 사람이 볼 수 있는 쪽지만 읽는다", async ({ page }) =>
    {
        await signIn(page, "ops@example.test");
        await say(page, "내 쪽지를 정리해 줘");

        await expect(conversation(page).getByText("쪽지를 확인했어요")).toBeVisible();
        await expect(conversation(page).getByText(/1개: 운영 주간 점검/)).toBeVisible();
        await expect(conversation(page).getByText("겸직의 비공개 메모")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "보내기" })).toBeVisible();
    });

    test("같은 대화에 이어 말하면 같은 실행이 깨어나고, 새로 고쳐도 장부에서 대화가 다시 선다", async ({ page }) =>
    {
        await signIn(page, "ops@example.test");
        await say(page, "안녕");
        await expect(conversation(page).getByText("「안녕」 잘 받았어요")).toBeVisible();
        await expect(page).toHaveURL(/\/chat\/wrun_/);

        await say(page, "한 번 더");
        await expect(conversation(page).getByText("「한 번 더」 잘 받았어요")).toBeVisible();

        await page.reload();
        await expect(conversation(page).getByText("안녕", { exact: true })).toBeVisible();
        await expect(conversation(page).getByText("한 번 더", { exact: true })).toBeVisible();
        await expect(conversation(page).getByText("「한 번 더」 잘 받았어요")).toBeVisible();
    });

    test("INV-AGENT-01 같은 운영팀의 다른 사람은 주소를 알아도 남의 대화를 열지 못한다", async ({ browser }) =>
    {
        const ops = await browser.newPage();

        await signIn(ops, "ops@example.test");
        await say(ops, "남에게 보이면 안 되는 말");
        await expect(ops).toHaveURL(/\/chat\/wrun_/);
        await expect(conversation(ops).getByText(/잘 받았어요/)).toBeVisible();

        const address = new URL(ops.url()).pathname;
        const other = await browser.newPage();

        await signIn(other, "both@example.test", address);
        await expect(other.getByText("페이지를 찾을 수 없어요")).toBeVisible();
        await expect(other.getByText("남에게 보이면 안 되는 말")).toHaveCount(0);

        const response = await other.request.post(`/api/chat/${address.split("/").at(-1)}`, {
            data: { messageId: "intrude", text: "끼어들기" },
        });

        expect(response.status()).toBe(404);
    });

    test("규칙에 걸린 글은 까닭을 보이고 입력칸에 그대로 남긴다. 다시 적지 않아도 된다", async ({ page }) =>
    {
        const tooLong = "가".repeat(8001);

        await signIn(page, "ops@example.test");
        await say(page, tooLong);

        await expect(page.getByRole("alert").filter({ hasText: "8000자까지" })).toHaveText("한 번에 8000자까지 보낼 수 있어요.");
        await expect(page.getByLabel("메시지")).toHaveValue(tooLong);
    });
});
