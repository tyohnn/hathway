import type { Page } from "@playwright/test";

/**
 * 플러그인 e2e 가 함께 쓰는 도구. JSON-RPC 를 짓고 읽는 일과, ChatGPT 호스트를 흉내 내 화면을 띄우는 창이다.
 */
export type Rpc = (body: Record<string, unknown>) => Promise<{ result?: Record<string, unknown>; error?: Record<string, unknown> }>;

export const MODERN = {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientCapabilities": {},
};

export const toolCall = (id: number, name: string, args: Record<string, unknown> = {}) =>
    ({ id, method: "tools/call", params: { name, arguments: args, _meta: MODERN } });

export const structured = <T>(answer: { result?: Record<string, unknown> }): T => answer.result?.["structuredContent"] as T;

export const said = (answer: { result?: Record<string, unknown> }): string =>
    ((answer.result?.["content"] ?? []) as Array<{ text?: string }>).map((part) => part.text ?? "").join("\n");

export const isError = (answer: { result?: Record<string, unknown> }): boolean => answer.result?.["isError"] === true;

/** 스크립트 안에 끼워 넣을 JSON. 닫는 태그가 들어 있으면 HTML 이 스크립트를 거기서 끊으므로 `<` 를 풀어 적는다 */
const inline = (value: unknown): string => JSON.stringify(value).replace(/</g, "\\u003c");

export interface HostOptions
{
    readonly displayMode?: "inline" | "fullscreen";
    readonly theme?: "light" | "dark";
    /** 도구의 결과를 늦게 넘긴다. 느린 망에서 기다리는 얼굴을 재려고 쓴다 */
    readonly resultDelayMs?: number;
    /** 이 방법의 요청에는 오류로 답한다. 호스트가 거절할 때의 화면을 재려고 쓴다 */
    readonly failMethods?: ReadonlyArray<string>;
    /** 띄운 도구의 이름. 화면이 결과를 받기 전에 어느 화면의 기다리는 얼굴을 그릴지 이것으로 짐작한다 */
    readonly toolName?: string;
}

/** 호스트를 흉내 낸 창. 화면을 iframe 에 띄우고 MCP Apps 의 악수를 받아 준 뒤 도구의 결과를 넘긴다 */
export const hostPage = (
    appHtml: string,
    toolResult: Record<string, unknown>,
    toolInput: Record<string, unknown>,
    options: HostOptions = {},
): string => `<!doctype html><title>host</title><iframe id="app" style="width:900px;height:760px;border:0"></iframe><script>
    window.sent = [];
    const frame = document.getElementById("app");
    const post = (message) => frame.contentWindow.postMessage({ jsonrpc: "2.0", ...message }, "*");
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
                hostCapabilities: { message: { text: {} }, updateModelContext: { text: {} }, openLinks: {} },
                hostContext: { theme: ${inline(options.theme ?? "dark")}, displayMode: ${inline(options.displayMode ?? "inline")}, availableDisplayModes: ["inline", "fullscreen"], toolInfo: { tool: { name: ${inline(options.toolName ?? "")} } } },
            } });
        }
        else if (message.method === "ui/notifications/initialized")
        {
            post({ method: "ui/notifications/tool-input", params: { arguments: ${inline(toolInput)} } });
            setTimeout(() => post({ method: "ui/notifications/tool-result", params: ${inline(toolResult)} }), ${options.resultDelayMs ?? 0});
        }
        else if (message.id !== undefined && ${inline(options.failMethods ?? [])}.includes(message.method))
        {
            post({ id: message.id, error: { code: -32000, message: "e2e host refused" } });
        }
        else if (message.id !== undefined && message.method === "ui/request-display-mode")
        {
            post({ id: message.id, result: { mode: message.params.mode } });
        }
        else if (message.id !== undefined && message.method !== undefined)
        {
            post({ id: message.id, result: {} });
        }
    });
    frame.srcdoc = ${inline(appHtml)};
</script>`;

/** 창이 받은 화면의 요청. 방법 이름과 인자다 */
export const sentFrom = async (page: Page): Promise<Array<{ method?: string; params?: Record<string, unknown> }>> =>
    page.evaluate(() => (window as unknown as { sent: Array<{ method?: string; params?: Record<string, unknown> }> }).sent);
