import { describe, test } from "@e2e-dev/web";
import { expect, unique } from "e2e";

/**
 * 쪽지 흐름을 목표로 몬다. 불변식(누구에게 보이고 안 보이는가)은 `e2e/notes.spec.ts` 가 정확히 잰다.
 *
 * ⚠ 제목은 실행마다 새로 만든다(데이터로 격리한다). `unique()` 로 감싸야 녹화가 값이 달라져도 되풀이된다.
 */
const fresh = (): string => crypto.randomUUID().slice(0, 8);

describe("쪽지 (에이전트)", { session: "kim" }, () =>
{
    test("쪽지를 쓰면 목록에 선다", async ({ app, agent, screen }) =>
    {
        const title = `e2e 에이전트 ${fresh()}`;

        await app.open("/notes");
        await agent.act("제목이 {title} 이고 내용이 {body} 인 쪽지를 써 주세요", {
            params: { title: unique(title), body: "에이전트가 썼어요" },
        });

        await expect(screen.getByText(title)).toBeVisible();
    });

    test("쓴 쪽지를 열어 보관하면 보관됨으로 선다", async ({ app, agent, screen }) =>
    {
        const title = `e2e 에이전트 보관 ${fresh()}`;

        // 준비는 정확한 걸음으로 한다. 재려는 것은 보관이다
        await app.open("/notes");
        await screen.getByLabel("제목").fill(title);
        await screen.getByRole("button", "쪽지 쓰기").tap();
        await expect(screen.getByText(title)).toBeVisible();

        await agent.act("{title} 쪽지를 열어 보관해 주세요", { params: { title: unique(title) } });

        await expect(screen.getByRole("heading", title)).toBeVisible();
        await expect(screen.getByRole("button", "보관하기")).toHaveCount(0);
        await expect(screen.getByRole("main").getByText("보관됨").first()).toBeVisible();
    });
});
