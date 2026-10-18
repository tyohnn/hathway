import { assert, describe, it } from "vitest";

import { clientBrandOf, consentPermissions } from "./consent";

const READ_ONLY = { readOnlyHint: true };

/** 동의 화면에 보이는 권한은 실제 도구와 범위에서 뽑는다. 덜 적으면 사람이 모르는 일을 허락하게 된다 */
describe("동의 화면의 권한", () =>
{
    it("읽기만 하는 도구는 읽기로, 나머지는 모두 쓰기로 적는다", () =>
    {
        const permissions = consentPermissions(
            [
                { name: "list_notes", title: "쪽지 목록 보기", annotations: READ_ONLY },
                { name: "create_note", title: "쪽지 쓰기" },
                { name: "update_settings", title: "설정 바꾸기", annotations: { readOnlyHint: false } },
            ],
            [],
        );

        assert.deepStrictEqual(permissions.sections.map((section) => [section.kind, section.items.map((item) => item.label)]), [
            ["write", ["쪽지 쓰기", "설정 바꾸기"]],
            ["read", ["쪽지 목록 보기"]],
        ]);
    });

    it("이름표가 없는 도구는 도구 이름을 그대로 보인다", () =>
    {
        const permissions = consentPermissions([{ name: "drop_table" }], []);

        assert.deepStrictEqual(permissions.sections[0]?.items, [{ label: "drop_table", raw: true }]);
    });

    it("계정 범위는 우리말로 옮기고, 모르는 범위는 원문 그대로 계정 칸에 둔다", () =>
    {
        const permissions = consentPermissions([], ["openid", "email", "custom:admin"]);

        assert.deepStrictEqual(permissions.sections, [
            { kind: "account", items: [{ label: "내 계정", raw: false }, { label: "이메일 주소", raw: false }, { label: "custom:admin", raw: true }] },
        ]);
    });

    it("연결 유지는 권한 줄이 아니라 따로 알린다", () =>
    {
        const permissions = consentPermissions([], ["openid", "offline_access"]);

        assert.strictEqual(permissions.staysConnected, true);
        assert.deepStrictEqual(permissions.sections[0]?.items.map((item) => item.label), ["내 계정"]);
    });

    it("요약은 칸마다 한 줄이고 넷째 이름부터는 개수로 줄인다", () =>
    {
        const permissions = consentPermissions(
            ["가", "나", "다", "라", "마"].map((title) => ({ name: title, title, annotations: READ_ONLY })),
            ["email"],
        );

        assert.deepStrictEqual(permissions.summary, [
            { kind: "read", label: "가, 나, 다 외 2개" },
            { kind: "account", label: "이메일 주소" },
        ]);
    });

    it("이름표가 같은 도구는 한 줄로 모은다", () =>
    {
        const permissions = consentPermissions([{ name: "create_note", title: "쪽지 쓰기" }, { name: "compose_note", title: "쪽지 쓰기" }], []);

        assert.deepStrictEqual(permissions.sections[0]?.items, [{ label: "쪽지 쓰기", raw: false }]);
    });

    it("빈 칸은 요약에도 자세히에도 서지 않는다", () =>
    {
        const permissions = consentPermissions([], []);

        assert.deepStrictEqual(permissions, { summary: [], sections: [], staysConnected: false });
    });
});

/** 어느 앱이 들어왔는지는 돌아갈 주소로 가린다. 이름은 등록하는 쪽이 마음대로 정한다 */
describe("들어온 앱 알아보기", () =>
{
    it("ChatGPT 의 주소로 돌아가면 ChatGPT 다", () =>
    {
        assert.strictEqual(clientBrandOf("ChatGPT", "https://chatgpt.com/connector_platform_oauth_redirect"), "chatgpt");
        assert.strictEqual(clientBrandOf("아무 이름", "https://chat.openai.com/aip/g-123/oauth/callback"), "chatgpt");
    });

    it("Claude 의 주소로 돌아가면 Claude 다", () =>
    {
        assert.strictEqual(clientBrandOf("Claude", "https://claude.ai/api/mcp/auth_callback"), "claude");
    });

    it("내 컴퓨터로 돌아가는 Claude Code 는 Claude 다", () =>
    {
        assert.strictEqual(clientBrandOf("Claude Code (hathway)", "http://localhost:53122/callback"), "claude");
        assert.strictEqual(clientBrandOf("Claude Code", "http://127.0.0.1:53122/callback"), "claude");
    });

    it("이름만 ChatGPT 이거나 Claude 이면 알아보지 않는다", () =>
    {
        assert.strictEqual(clientBrandOf("ChatGPT", "https://evil.example/callback"), null);
        assert.strictEqual(clientBrandOf("Claude Code", "https://evil.example/callback"), null);
    });

    it("비슷하게 지은 주소는 알아보지 않는다", () =>
    {
        assert.strictEqual(clientBrandOf("ChatGPT", "https://chatgpt.com.evil.example/callback"), null);
        assert.strictEqual(clientBrandOf("ChatGPT", "http://chatgpt.com/callback"), null);
        assert.strictEqual(clientBrandOf("Claude", "https://notclaude.ai/callback"), null);
    });

    it("주소를 읽을 수 없으면 알아보지 않는다", () =>
    {
        assert.strictEqual(clientBrandOf("ChatGPT", "chatgpt.com"), null);
        assert.strictEqual(clientBrandOf("ChatGPT", ""), null);
    });
});
