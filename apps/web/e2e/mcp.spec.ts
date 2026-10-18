import { randomBytes } from "node:crypto";

import { expect, test } from "@playwright/test";

import { AUTH, connect } from "./mcpConnect";

/**
 * MCP 로그인이 Supabase Auth 의 OAuth 2.1 로 끝까지 도는가. 클로드 코드가 붙을 때 밟는 사슬을 그대로 밟는다.
 *
 *   1. 토큰 없이 `/api/mcp` 를 부르면 401 과 함께 자원 문서의 주소를 받는다
 *   2. 클라이언트를 동적으로 등록하고 PKCE 로 인가를 청한다
 *   3. 로그인한 사람이 `/oauth/consent` 에서 허용한다
 *   4. 코드를 토큰으로 바꾸고 그 토큰으로 도구를 부른다
 *
 * ⚠ **도구도 화면과 같은 술어를 지나는지를 마지막에 잰다**(INV-NOTE-01). 토큰이 있다고 더 보이지 않는다.
 * ⚠ 도구를 막는 것(확장 지점 `PlanLimits`)은 그 확장 지점을 채운 모듈의 스펙이 잰다. 이 파일은 모듈 없이도 돈다.
 */
test.describe("MCP 로그인", () =>
{
    test("토큰 없이 부르면 401 과 함께 인증 서버를 찾을 자리를 알린다", async ({ request }) =>
    {
        const response = await request.post("/api/mcp", { data: { jsonrpc: "2.0", id: 1, method: "initialize" } });

        expect(response.status()).toBe(401);
        expect(response.headers()["www-authenticate"]).toContain("/.well-known/oauth-protected-resource");

        const metadata = await (await request.get("/.well-known/oauth-protected-resource")).json() as { authorization_servers: Array<string> };

        expect(metadata.authorization_servers).toEqual([AUTH]);
    });

    test("동의를 지나 받은 토큰으로 도구를 부르면 그 사람이 볼 수 있는 쪽지만 온다", async ({ page, request }) =>
    {
        const call = await connect(page, request, "kim@example.test");
        const tools = await call({ id: 1, method: "tools/list" });

        // 코어의 도구 둘이 먼저 선다. 모듈이 더한 도구는 그 뒤에 서고 그 모듈의 스펙이 잰다
        expect(tools.result?.tools?.map((tool) => tool.name).slice(0, 2)).toEqual(["list_notes", "create_note"]);

        const title = `MCP 로 쓴 쪽지 ${randomBytes(4).toString("hex")}`;

        await call({ id: 2, method: "tools/call", params: { name: "create_note", arguments: { title } } });

        const listed = (await call({ id: 3, method: "tools/call", params: { name: "list_notes" } })).result?.content?.[0]?.text ?? "";

        expect(listed).toContain("김의 비공개 메모");
        expect(listed).toContain(title);
        expect(listed).not.toContain("이의 비공개 초안");
        expect(listed).not.toContain("고객사 B 내부 메모");

        // 도구로 쓴 쪽지도 화면과 같은 테넌트 · 같은 쓴 사람으로 선다
        await page.goto("/notes");
        await expect(page.getByRole("main").getByText(title)).toBeVisible();
    });
});
