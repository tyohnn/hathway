import { expect, test } from "@playwright/test";

/**
 * 공개 화면. 로그인하지 않아도 첫 화면 · 블로그 · 문서 · 새 소식 · 약관이 보이고, 앱으로 들어가는 길은 로그인으로 이어진다.
 *
 * 닫힌 서버(배포와 같은 모양)에서 돈다. 글의 내용은 `src/content` 가 정하고, 여기서는 **문이 열려 있는가**만 본다.
 */
test.describe("공개 화면", () =>
{
    // 이 제품의 첫 화면은 종목 화면이다. `/` 는 그리로 넘기고(`app/(market)/page.tsx`), 소개의 머리는 블로그가 갖는다
    test("첫 화면은 로그인 없이 종목 화면으로 가고, 블로그 머리의 로그인은 로그인 화면으로 이어진다", async ({ page }) =>
    {
        await page.goto("/");

        await expect(page).toHaveURL(/\/stocks$/);

        await page.goto("/blog");
        await page.getByRole("banner").getByRole("link", { name: "로그인" }).click();

        await expect(page).toHaveURL(/\/login/);
    });

    test("블로그 목록에서 글을 열 수 있다", async ({ page }) =>
    {
        await page.goto("/blog");
        // 글이 하나뿐이면 목록 없이 큰 표지로 선다(`featureFirst`). 본문의 첫 글 링크를 연다
        await page.locator('main a[href^="/blog/"]').first().click();

        await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+$/);
        await expect(page.getByRole("article").getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("기기의 공유 창이 없으면 공유하기는 글의 주소를 복사한다", async ({ page, context }) =>
    {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page.addInitScript(() =>
        {
            Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
        });
        await page.goto("/blog/hello");

        await page.getByRole("button", { name: "공유하기" }).click();

        await expect(page.getByRole("button", { name: "링크를 복사했어요" })).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
    });

    test("검색 엔진과 AI 가 읽는 robots.txt · sitemap.xml · llms.txt 는 로그인 없이 열린다", async ({ request }) =>
    {
        const robots = await request.get("/robots.txt");
        expect(robots.status()).toBe(200);
        expect(await robots.text()).toContain("Sitemap:");

        const sitemap = await request.get("/sitemap.xml");
        expect(sitemap.status()).toBe(200);
        expect(await sitemap.text()).toContain("/blog/hello</loc>");

        const llms = await request.get("/llms.txt");
        expect(llms.status()).toBe(200);
        expect(await llms.text()).toMatch(/^# Hathway 기업분석\n/);
    });

    test("블로그 글은 검색에 열려 있고 BlogPosting 구조화 데이터를 싣는다", async ({ page }) =>
    {
        await page.goto("/blog/hello");

        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /^index, follow/);
        const ld = JSON.parse(await page.locator('.blog-frame script[type="application/ld+json"]').textContent() ?? "{}") as { "@type"?: string };
        expect(ld["@type"]).toBe("BlogPosting");
    });

    test("문서의 뿌리는 첫 문서로 가고 사이드바로 다른 문서를 연다", async ({ page }) =>
    {
        await page.goto("/docs");

        await expect(page).toHaveURL(/\/docs\/[a-z0-9-]+$/);

        await page.getByRole("navigation", { name: "문서" }).getByRole("link", { name: "MCP 도구" }).click();

        await expect(page).toHaveURL(/\/docs\/mcp-tools$/);
        await expect(page.getByRole("heading", { name: "list_notes" })).toBeVisible();
        // 목차는 그려진 본문의 제목에서 줍는다
        await expect(page.getByRole("navigation", { name: "목차" }).first().getByRole("link", { name: "create_note" })).toBeVisible();
    });

    test("문서의 찾기 칸은 제목으로 사이드바를 거른다", async ({ page }) =>
    {
        await page.goto("/docs/getting-started");

        const nav = page.getByRole("navigation", { name: "문서" });

        await page.getByLabel("문서 찾기").fill("MCP");

        await expect(nav.getByRole("link", { name: "MCP 도구" })).toBeVisible();
        await expect(nav.getByRole("link", { name: "시작하기" })).toHaveCount(0);
    });

    test("새 소식의 뿌리는 가장 최근 판으로 가고 판의 제목에 앵커가 있다", async ({ page }) =>
    {
        await page.goto("/changelog");

        await expect(page).toHaveURL(/\/changelog\/[0-9.]+$/);
        await expect(page.getByRole("article").getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("article h2[id]").first()).toBeVisible();
    });

    test("이용약관과 개인정보 처리방침이 로그인 없이 열리고, 발치와 로그인 화면에서 이어진다", async ({ page }) =>
    {
        await page.goto("/blog");
        await page.getByRole("navigation", { name: "사이트 발치" }).getByRole("link", { name: "개인정보 처리방침" }).click();
        await expect(page).toHaveURL(/\/privacy$/);
        await expect(page.getByRole("heading", { name: "개인정보 처리방침", level: 1 })).toBeVisible();

        await page.goto("/login");
        await page.getByRole("link", { name: "이용약관" }).click();
        await expect(page).toHaveURL(/\/terms$/);
        await expect(page.getByRole("heading", { name: "이용약관", level: 1 })).toBeVisible();
    });

    test("Search Console 의 소유권 확인 파일 자리는 로그인으로 돌리지 않는다", async ({ request }) =>
    {
        // 파일은 제품마다 이름이 달라 스캐폴드에는 없다. 없는 이름을 불러 미들웨어가 로그인으로 돌리지 않는지만 본다
        const response = await request.get("/google0123456789abcdef.html", { maxRedirects: 0 });

        expect(response.status()).toBe(404);
    });

    test("공개 화면 밖의 주소는 여전히 로그인을 요구한다", async ({ page }) =>
    {
        await page.goto("/notes");

        await expect(page).toHaveURL(/\/login/);
    });
});
