import { expect, test, type Page } from "@playwright/test";

import { connect } from "./mcpConnect";

/**
 * 플러그인 익스텐션이 로컬 스택에서 끝까지 도는가. ChatGPT 가 하는 일을 손으로 밟는다.
 *
 *   1. 토큰으로 진입점 도구를 부르면 화면이 그릴 것이 온다
 *   2. 화면 자원(`ui://`)을 호스트를 흉내 낸 창 안에 띄우면 악수하고 그 결과로 그린다
 *   3. 새 판(2026-07-28)으로 폼 도구를 부르면 폼을 청하고, 답을 실어 다시 부르면 끝난다
 *   4. 설정을 고치면 표에 적혀 다음에 읽을 때도 남는다
 *
 * ⚠ **실물 ChatGPT 는 여기 없다.** 이 파일이 재는 것은 우리 서버와 화면이 스펙대로 말하는가다. 호스트가 그 말을
 *    알아듣는지는 개발자 모드로 붙여 본 사람이 확인한다.
 * ⚠ **차례대로 돈다.** 설정은 사람마다 한 줄이라 스펙끼리 같은 줄을 본다.
 */
test.describe.configure({ mode: "serial" });

type Rpc = (body: Record<string, unknown>) => Promise<{ result?: Record<string, unknown>; error?: Record<string, unknown> }>;

const connectAs = async (page: Page, request: Parameters<typeof connect>[1], email: string): Promise<Rpc> =>
    await connect(page, request, email) as unknown as Rpc;

const MODERN = {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": { extensions: { "openai/elicitation": { form: {} } } },
};

interface View { notes: Array<{ id: string; title: string }>; selectedId: string | null }

const viewOf = (result: Record<string, unknown> | undefined): View => result?.["structuredContent"] as View;

/**
 * 호스트를 흉내 낸 창. 화면을 iframe 에 띄우고 MCP Apps 의 악수를 받아 준다.
 *
 * 화면이 보낸 것은 전부 `window.sent` 에 쌓는다. 스펙이 그것으로 「무엇을 청했는가」를 단언한다.
 */
/** 스크립트 안에 끼워 넣을 JSON. 닫는 태그가 들어 있으면 HTML 이 스크립트를 거기서 끊으므로 `<` 를 풀어 적는다 */
const inline = (value: unknown): string => JSON.stringify(value).replace(/</g, "\\u003c");

const hostPage = (appHtml: string, toolResult: Record<string, unknown>, toolInput: Record<string, unknown> = {}): string => `<!doctype html><title>host</title><iframe id="app" style="width:900px;height:700px;border:0"></iframe><script>
    window.sent = [];
    // 호스트가 쥔 파일. 첫 저장은 그사이 밖에서 바뀐 것으로 답하고, 다시 읽은 뒤의 저장은 받는다
    window.file = { text: "첫 줄", etag: "v1", writes: 0 };
    const frame = document.getElementById("app");
    const post = (message) => frame.contentWindow.postMessage({ jsonrpc: "2.0", ...message }, "*");
    window.notify = (method, params) => post({ method, params });
    window.addEventListener("message", (event) =>
    {
        if (event.source !== frame.contentWindow) return;
        const message = event.data;
        window.sent.push(message);
        if (message.method === "ui/initialize")
        {
            post({ id: message.id, result: {
                protocolVersion: "2026-01-26",
                hostInfo: { name: "e2e-host", version: "1.0.0" },
                hostCapabilities: { message: { text: {} }, updateModelContext: { text: {} }, experimental: { "openai/message": {}, "openai/modelContext": {}, "openai/resource": {}, "openai/files": {} } },
                hostContext: { theme: "light", displayMode: "fullscreen", availableDisplayModes: ["inline", "fullscreen"] },
            } });
        }
        else if (message.method === "ui/notifications/initialized")
        {
            post({ method: "ui/notifications/tool-input", params: { arguments: ${inline(toolInput)} } });
            post({ method: "ui/notifications/tool-result", params: ${inline(toolResult)} });
        }
        else if (message.method === "ui/update-model-context")
        {
            post({ id: message.id, result: { _meta: { "openai/modelContext": { updateId: "update-1" } } } });
        }
        else if (message.method === "resources/read")
        {
            post({ id: message.id, result: { contents: [{ uri: message.params.uri, text: window.file.text, _meta: { "openai/resource": { etag: window.file.etag, writable: true } } }] } });
        }
        else if (message.method === "openai/resources/write")
        {
            window.file.writes += 1;
            if (window.file.writes === 1)
            {
                window.file = { ...window.file, text: "남이 고친 줄", etag: "v2" };
                post({ id: message.id, result: { outcome: "conflict", etag: "v2" } });
            }
            else
            {
                window.file = { ...window.file, text: message.params.text, etag: "v3" };
                post({ id: message.id, result: { outcome: "saved", etag: "v3" } });
            }
        }
        else if (message.method === "tools/call" && message.params.name === "reveal_file_path")
        {
            post({ id: message.id, result: { content: [], structuredContent: { path: "/work/메모.md" }, isError: false } });
        }
        else if (message.method === "tools/call")
        {
            post({ id: message.id, result: { content: [{ type: "text", text: "쪽지로 가져왔어요: 메모" }], isError: false } });
        }
        else if (message.id !== undefined && message.method !== undefined)
        {
            post({ id: message.id, result: {} });
        }
    });
    frame.srcdoc = ${inline(appHtml)};
</script>`;

test.describe("플러그인 익스텐션", () =>
{
    test("동의를 지나 받은 토큰으로 보관함 도구를 부르면 그 사람의 쪽지만 실려 온다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const tools = (await call({ id: 1, method: "tools/list" })).result?.["tools"] as Array<{ name: string; _meta?: Record<string, unknown> }>;
        const library = tools.find((tool) => tool.name === "open_library");
        const opened = await call({ id: 2, method: "tools/call", params: { name: "open_library", arguments: {} } });
        const titles = viewOf(opened.result).notes.map((note) => note.title);

        expect((library?._meta?.["openai/ui"] as { entrypoints: Array<{ type: string }> }).entrypoints[0]?.type).toBe("global");
        expect(titles).toContain("김의 비공개 메모");
        expect(titles).not.toContain("이의 비공개 초안");
        expect(titles).not.toContain("고객사 B 내부 메모");
        // 화면에 실리는 것에 테넌트와 쓴 사람이 없다
        expect(JSON.stringify(opened.result?.["structuredContent"])).not.toMatch(/tenantId|authorId/);
    });

    test("화면 자원을 호스트 흉내 안에 띄우면 악수를 마치고 받은 결과로 쪽지를 그린다. 도구를 다시 부르지 않는다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const opened = await call({ id: 1, method: "tools/call", params: { name: "open_library", arguments: {} } });
        const resource = await call({ id: 2, method: "resources/read", params: { uri: "ui://notes/library" } });
        const contents = resource.result?.["contents"] as Array<{ mimeType: string; text: string }>;

        expect(contents[0]?.mimeType).toBe("text/html;profile=mcp-app");

        await page.setContent(hostPage(contents[0]?.text ?? "", opened.result ?? {}));

        const app = page.frameLocator("#app");
        const row = app.getByRole("button", { name: /김의 비공개 메모/ });

        await expect(app.getByRole("heading", { name: "쪽지", exact: true })).toBeVisible();
        await expect(row).toBeVisible();
        await expect(app.getByText("이의 비공개 초안")).toHaveCount(0);

        const methods = async (): Promise<Array<string>> => await page.evaluate(() =>
            (window as unknown as { sent: Array<{ method?: string }> }).sent.flatMap((message) => (message.method === undefined ? [] : [message.method])));

        expect(await methods()).toContain("ui/notifications/initialized");
        expect(await methods()).not.toContain("tools/call");

        // 쪽지를 고르면 제목을 단 컨텍스트로 알린다
        await row.click();
        await expect(row).toHaveAttribute("aria-pressed", "true");
        await expect.poll(methods).toContain("ui/update-model-context");

        const context = await page.evaluate(() =>
            (window as unknown as { sent: Array<{ method?: string; params?: { content?: Array<{ _meta?: Record<string, string> }> } }> }).sent
                .find((message) => message.method === "ui/update-model-context")?.params?.content?.[0]?._meta?.["openai/title"]);

        expect(context).toBe("김의 비공개 메모");

        // 호스트가 알린 능력의 단추가 선다
        await expect(app.getByRole("button", { name: "지금 대화에 보내기" })).toBeVisible();
        await app.getByRole("button", { name: "새 대화에 보내기" }).click();
        await expect.poll(methods).toContain("ui/message");

        // 사람이 첨부를 떼면 화면도 고른 표시를 푼다
        await page.evaluate(() =>
            (window as unknown as { notify: (method: string, params: unknown) => void }).notify("ui/notifications/host-context-changed", { "openai/modelContext": null }));
        await expect(row).toHaveAttribute("aria-pressed", "false");

        // 딥링크가 오면 그 쪽지를 펼친다
        const target = viewOf(opened.result).notes.find((note) => note.title === "김의 비공개 메모");

        await page.evaluate((noteId) =>
            (window as unknown as { notify: (method: string, params: unknown) => void }).notify("ui/notifications/host-context-changed", { "openai/deepLink": { url: `/notes/${noteId}` } }), target?.id);
        await expect(row).toHaveAttribute("aria-pressed", "true");
    });

    test("파일을 열면 호스트에게서 읽어 그리고, 판이 어긋나면 덮어쓰지 않고 다시 불러온 뒤에 저장한다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const file = { name: "메모.md", resourceUri: "host-resource://memo" };
        const opened = await call({ id: 1, method: "tools/call", params: { name: "open_file", arguments: { file } } });
        const resource = await call({ id: 2, method: "resources/read", params: { uri: "ui://notes/file" } });

        await page.setContent(hostPage((resource.result?.["contents"] as Array<{ text: string }>)[0]?.text ?? "", opened.result ?? {}, { file }));

        const app = page.frameLocator("#app");
        const editor = app.getByLabel("파일 내용");
        const save = app.getByRole("button", { name: "저장하기" });
        const sent = async (method: string): Promise<Array<Record<string, unknown>>> => await page.evaluate((wanted) =>
            (window as unknown as { sent: Array<{ method?: string; params?: Record<string, unknown> }> }).sent
                .filter((message) => message.method === wanted).map((message) => message.params ?? {}), method);

        await expect(app.getByRole("heading", { name: "메모.md" })).toBeVisible();
        await expect(editor).toHaveValue("첫 줄");
        // 읽을 때 글로 달라고 청하고, 밖에서 바뀌면 알려 달라고 한다
        expect((await sent("resources/read"))[0]).toEqual({ uri: file.resourceUri, _meta: { "openai/resource": { representation: "text" } } });
        await expect.poll(async () => (await sent("resources/subscribe")).length).toBe(1);

        // 고치기 전에는 저장이 꺼져 있다
        await expect(save).toBeDisabled();
        await editor.fill("내가 고친 줄");
        await save.click();

        // 읽었을 때의 판을 함께 보냈고, 호스트가 어긋났다고 답했다. 내 글은 그대로 있다
        await expect(app.getByRole("button", { name: "다시 불러오기" })).toBeVisible();
        expect((await sent("openai/resources/write"))[0]).toEqual({ uri: file.resourceUri, text: "내가 고친 줄", ifMatch: "v1" });
        await expect(editor).toHaveValue("내가 고친 줄");
        await expect(save).toBeDisabled();

        await app.getByRole("button", { name: "다시 불러오기" }).click();
        await expect(editor).toHaveValue("남이 고친 줄");

        // 한 글자씩 친다. 화면은 글자마다 상태를 고치지 않으므로, 저장한 뒤에도 친 글이 그대로 서 있어야 한다
        await editor.fill("");
        await editor.pressSequentially("다시 고친 줄");
        await save.click();
        await expect(app.getByText("저장했어요.")).toBeVisible();
        await expect(editor).toHaveValue("다시 고친 줄");
        expect((await sent("openai/resources/write"))[1]).toEqual({ uri: file.resourceUri, text: "다시 고친 줄", ifMatch: "v2" });

        // 쪽지로 가져오기는 서버의 도구를, 기본 뷰어로 열기는 서버가 돌려준 자리로 호스트를 부른다
        await app.getByRole("button", { name: "쪽지로 가져오기" }).click();
        await expect(app.getByText("쪽지로 가져왔어요: 메모")).toBeVisible();
        expect((await sent("tools/call")).find((params) => params["name"] === "import_file")?.["arguments"]).toEqual({ name: "메모.md", text: "다시 고친 줄" });

        await app.getByRole("button", { name: "기본 뷰어로 열기" }).click();
        await expect.poll(async () => await sent("openai/files/open")).toEqual([{ path: "/work/메모.md" }]);
    });

    test("새 판으로 폼 도구를 부르고 답을 실어 다시 부르면 끝난다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const first = await call({ id: 1, method: "tools/call", params: { name: "pick_note", arguments: {}, _meta: MODERN } });
        const form = (first.result?.["inputRequests"] as { form: { method: string; params: { requestedSchema: { properties: { note: { oneOf: Array<{ const: string; title: string }> } } } } } }).form;
        const options = form.params.requestedSchema.properties.note.oneOf;
        const mine = options.find((option) => option.title === "김의 비공개 메모");

        expect(first.result?.["resultType"]).toBe("input_required");
        expect(form.method).toBe("openai/elicitation/create");
        expect(mine).toBeDefined();
        expect(options.map((option) => option.title)).not.toContain("이의 비공개 초안");

        const second = await call({
            id: 2,
            method: "tools/call",
            params: {
                name: "pick_note",
                arguments: {},
                _meta: MODERN,
                inputResponses: { form: { action: "accept", content: { note: mine?.const } } },
                requestState: first.result?.["requestState"],
            },
        });

        expect(second.result?.["resultType"]).toBe("complete");
        expect(viewOf(second.result).selectedId).toBe(mine?.const);

        // 답만 지어 보내면 폼을 다시 낸다
        const forged = await call({
            id: 3,
            method: "tools/call",
            params: { name: "pick_note", arguments: {}, _meta: MODERN, inputResponses: { form: { action: "accept", content: { note: mine?.const } } } },
        });

        expect(forged.result?.["resultType"]).toBe("input_required");
    });

    test("설정을 고치면 다음에 읽을 때도 남아 있다", async ({ page, request }) =>
    {
        const call = await connectAs(page, request, "kim@example.test");
        const settings = async (id: number): Promise<Record<string, unknown>> =>
            ((await call({ id, method: "tools/call", params: { name: "read_settings", arguments: {} } })).result?.["structuredContent"] as { values: Record<string, unknown> }).values;

        await call({ id: 1, method: "tools/call", params: { name: "update_settings", arguments: { set: { defaultVisibility: "나만", showArchived: true } } } });
        expect(await settings(2)).toEqual({ defaultVisibility: "나만", showArchived: true });

        const refused = await call({ id: 3, method: "tools/call", params: { name: "update_settings", arguments: { set: { defaultVisibility: "모두에게" } } } });

        expect(refused.result?.["isError"]).toBe(true);
        expect(await settings(4)).toEqual({ defaultVisibility: "나만", showArchived: true });

        // 다른 스펙이 기본값의 화면을 보도록 되돌려 둔다
        await call({ id: 5, method: "tools/call", params: { name: "update_settings", arguments: { set: { defaultVisibility: "조직 전체", showArchived: false } } } });
        expect(await settings(6)).toEqual({ defaultVisibility: "조직 전체", showArchived: false });
    });

    test("멘션을 찾으면 볼 수 있는 쪽지의 주소가 오고, 그 주소로 읽으면 쪽지의 글이 온다", async ({ page, request }) =>
    {
        const kim = await connectAs(page, request, "kim@example.test");
        const found = await kim({ id: 1, method: "tools/call", params: { name: "search_mentions", arguments: { query: "비공개" } } });
        const items = (found.result?.["structuredContent"] as { items: Array<{ uri: string; title: string }> }).items;
        const mine = items.find((item) => item.title === "김의 비공개 메모");

        expect(mine?.uri).toMatch(/^note:\/\/\d+$/);
        expect(items.map((item) => item.title)).not.toContain("이의 비공개 초안");

        const read = await kim({ id: 2, method: "resources/read", params: { uri: mine?.uri } });

        expect((read.result?.["contents"] as Array<{ text: string }>)[0]?.text).toContain("# 김의 비공개 메모");
    });

    test("INV-NOTE-02 남의 비공개 쪽지와 다른 조직의 쪽지는 주소를 알아도 없는 것으로 답한다", async ({ page, request }) =>
    {
        // 시드의 고정 번호다. 1 은 김의 비공개, 4 는 이의 비공개, 5 는 고객사 B 의 쪽지다(`supabase/seeds/10-notes.sql`)
        const kim = await connectAs(page, request, "kim@example.test");
        const mine = await kim({ id: 1, method: "resources/read", params: { uri: "note://1" } });
        const colleague = await kim({ id: 2, method: "resources/read", params: { uri: "note://4" } });
        const stranger = await kim({ id: 3, method: "resources/read", params: { uri: "note://5" } });

        expect((mine.result?.["contents"] as Array<{ text: string }>)[0]?.text).toContain("# 김의 비공개 메모");

        for (const refused of [colleague, stranger])
        {
            expect(refused.result).toBeUndefined();
            expect(refused.error?.["message"]).toBe("Resource not found");
            expect(JSON.stringify(refused)).not.toMatch(/비공개 초안|내부 메모/);
        }
    });
});
