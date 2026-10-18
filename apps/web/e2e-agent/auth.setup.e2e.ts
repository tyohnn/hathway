import { test } from "@e2e-dev/web";
import { credentials, expect } from "e2e";

/**
 * 한 번 로그인해 세션으로 떠 둔다. `{ session: "kim" }` 을 단 테스트가 로그인한 채로 시작한다.
 *
 * ⚠ 비밀번호를 칸에 채운 세션은 그 뒤로 모델에게 화면 그림(스크린샷)을 주지 않는다. 에이전트는 화면의
 *    접근성 트리만 보고 움직인다. 그림이 필요한 테스트는 쿠키로 로그인하는 세션을 따로 뜬다.
 */
test.setup("김으로 로그인한다", { sessions: ["kim"] }, async ({ app, screen, browser, session }) =>
{
    const kim = credentials.user("kim");

    // 분석 동의를 이미 고른(거절한) 사람으로 시작한다. 배너가 오른쪽 아래를 덮어 단추를 가린다
    await browser.setCookies([{ name: "analytics_consent", value: "denied", url: app.baseUrl ?? "" }]); // scaffold:module posthog

    await app.open("/login?redirect=%2Fnotes");
    await screen.getByLabel("이메일").fill(kim.username);
    await screen.getByLabel("비밀번호").fill(kim.password);
    await screen.getByRole("button", "로그인").tap();

    await expect(browser).toHaveURL("/notes");
    await session.save("kim");
});
