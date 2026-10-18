import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./signIn";
import { writeNote as writeNoteOnPage } from "./writeNote";

/**
 * 제품 분석(PostHog 모듈)의 동의가 서버와 브라우저에서 함께 지켜지는가. 서버는 연습 창구로 돌고(`NEXT_PUBLIC_POSTHOG_SINK`),
 * 서버가 모은 이벤트는 `/api/analytics/rehearsal`, 브라우저가 모은 것은 `window.__rehearsalAnalytics` 에서 읽는다.
 *
 * ⚠ **차례대로 돈다.** 이벤트는 서버 하나에 쌓이므로 「앞뒤로 몇 개가 늘었나」로 잰다. 다른 스펙은 동의하지 않으므로
 *    이 파일 밖에서는 이벤트가 쌓이지 않는다.
 */
test.describe.configure({ mode: "serial" });

// 다른 스펙은 이미 고른 사람으로 돈다(`playwright.config.ts`). 여기서는 처음 온 사람으로 시작한다
test.use({ storageState: { cookies: [], origins: [] } });

interface ServerEvent
{
    readonly distinctId: string;
    readonly event: string;
    readonly properties: Record<string, unknown>;
    readonly groups: { readonly organization: string };
}

const serverEvents = async (page: Page): Promise<ReadonlyArray<ServerEvent>> =>
{
    const response = await page.request.get("/api/analytics/rehearsal");

    expect(response.ok()).toBe(true);

    return ((await response.json()) as { events: ReadonlyArray<ServerEvent> }).events;
};

const browserEntries = (page: Page) =>
    page.evaluate(() => (window as typeof window & { __rehearsalAnalytics?: Array<{ type: string }> }).__rehearsalAnalytics ?? []);

/** 본문은 분석에 실리면 안 되는 글이다. 서버 이벤트에 본문이 없는지를 그 글로 본다 */
const writeNote = (page: Page, title: string) => writeNoteOnPage(page, { title, body: "분석에 실리면 안 되는 본문" });

const banner = (page: Page) => page.getByRole("region", { name: "이용 기록 동의" });

test.describe("제품 분석", () =>
{
    test("INV-ANALYTICS-01 고르기 전에는 서버도 브라우저도 아무것도 보내지 않는다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");
        await expect(banner(page)).toBeVisible();

        const before = (await serverEvents(page)).length;

        await writeNote(page, `분석 고르기 전 ${crypto.randomUUID().slice(0, 8)}`);

        expect((await serverEvents(page)).length).toBe(before);
        expect(await browserEntries(page)).toEqual([]);
    });

    test("INV-ANALYTICS-01 · 02 · 03 동의하면 서버가 계정 id 와 조직으로 알리고, 제목과 본문은 싣지 않는다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");
        await banner(page).getByRole("button", { name: "동의하기" }).click();
        await expect(banner(page)).toHaveCount(0);

        expect((await browserEntries(page)).map((entry) => entry.type)).toEqual(["consent", "pageview"]);

        const before = (await serverEvents(page)).length;
        const title = `분석 동의 뒤 ${crypto.randomUUID().slice(0, 8)}`;

        await writeNote(page, title);

        await expect.poll(async () => (await serverEvents(page)).length).toBe(before + 1);

        const created = (await serverEvents(page)).at(-1)!;

        expect(created.event).toBe("note_created");
        expect(created.properties).toEqual({ visibility: "tenant" });
        expect(created.distinctId).not.toBe("");
        expect(created.groups.organization).not.toBe("");
        expect(JSON.stringify(created)).not.toContain(title);
        expect(JSON.stringify(created)).not.toContain("kim@example.test");

        // 다음 화면부터 브라우저의 이벤트도 같은 계정에 잇는다
        await page.reload();
        await expect.poll(async () => (await browserEntries(page)).map((entry) => entry.type)).toContain("identify");
    });

    test("INV-ANALYTICS-01 거절하면 배너가 다시 서지 않고, 서버도 보내지 않는다", async ({ page }) =>
    {
        await signIn(page, "kim@example.test");
        await banner(page).getByRole("button", { name: "거절하기" }).click();
        await page.reload();
        await expect(page.getByRole("heading", { name: "쪽지", level: 1 })).toBeVisible();
        await expect(banner(page)).toHaveCount(0);

        const before = (await serverEvents(page)).length;

        await writeNote(page, `분석 거절 뒤 ${crypto.randomUUID().slice(0, 8)}`);

        expect((await serverEvents(page)).length).toBe(before);
        expect(await browserEntries(page)).toEqual([]);
    });

    test("로그아웃하면 앞 사람과 다음 사람이 이어지지 않게 끊는다", async ({ page }) =>
    {
        // ⚠ 로그아웃은 그 계정의 세션을 모두 끊는다(Supabase 의 기본 범위). 다른 스펙이 함께 쓰는 kim 으로 하면
        //    나란히 돌던 테스트가 도중에 로그인 화면으로 밀려난다. 그래서 거의 쓰이지 않는 겸직 계정으로 한다
        await signIn(page, "both@example.test");
        await banner(page).getByRole("button", { name: "동의하기" }).click();
        await page.getByRole("button", { name: "로그아웃" }).click();
        await expect(page).toHaveURL(/\/login/);

        await expect.poll(async () => (await browserEntries(page)).map((entry) => entry.type)).toContain("reset");
    });
});
