/**
 * MCP 의 JSON-RPC 봉투. 순수 함수라서 도커 없이 잰다(`mcp.test.ts`).
 *
 * 클로드 코드 같은 MCP 클라이언트가 `/api/mcp` 에 붙어 이 제품의 도구를 부른다. 이 모듈은 받은 메시지를
 * 보고 **무엇을 할지**만 정한다. 무엇이 보이는지는 유스케이스와 도메인 술어가 정한다.
 *
 * ⚠ **알림에는 답하지 않는다.** `id` 가 없는 메시지가 알림이고, 여기에 응답을 돌려주면 클라이언트가 짝 없는
 *    답을 받는다.
 * ⚠ **도구의 인자로 테넌트나 계정을 받지 않는다.** 누구의 눈으로 도는지는 토큰이 정한다. 인자로 받으면
 *    모델이 그 값을 지어낸다.
 * ⚠ **두 시대를 한 주소에서 받는다.** `initialize` 로 악수하는 옛 판과, 요청마다 판과 capability 를 `_meta` 에 싣고 오는
 *    새 판(2026-07-28)이다. 이 라우트는 요청 사이에 아무것도 기억하지 않으므로 어느 시대인지도 요청마다 다시 읽는다.
 *    새 판만 서버가 사람에게 되묻는 왕복(폼)을 쓸 수 있다. 옛 판의 되묻기는 열린 연결을 요구해서 이 라우트와 맞지 않는다.
 * ⚠ **모듈이 더하는 도구와 자원은 확장 지점(`extensions/McpSurface.ts`)으로 들어온다.** 이 파일은 그 모양만 안다.
 */
export const PROTOCOL_VERSION = "2025-06-18";

/** 요청마다 판을 싣고 오는 시대에서 이 서버가 받는 판 */
export const MODERN_VERSION = "2026-07-28";

const PROTOCOL_META_PREFIX = "io.modelcontextprotocol/";
const META_VERSION = "io.modelcontextprotocol/protocolVersion";
const META_CLIENT_CAPABILITIES = "io.modelcontextprotocol/clientCapabilities";
const META_SERVER_INFO = "io.modelcontextprotocol/serverInfo";

const SERVER_INFO = { name: "hathway", version: "0.0.1" } as const;

export interface RpcMessage
{
    readonly jsonrpc?: string;
    readonly id?: number | string;
    readonly method?: string;
    readonly params?: Record<string, unknown>;
}

export interface RpcReply
{
    readonly jsonrpc: "2.0";
    readonly id: number | string;
    readonly result?: Record<string, unknown>;
    readonly error?: { readonly code: number; readonly message: string; readonly data?: Record<string, unknown> };
}

/** 이 요청을 보낸 클라이언트. 새 판이면 capability 를 요청에서 읽고, 옛 판이면 알 길이 없어 빈 값이다 */
export interface McpClient
{
    readonly modern: boolean;
    readonly capabilities: Readonly<Record<string, unknown>>;
}

const LEGACY_CLIENT: McpClient = { modern: false, capabilities: {} };

export interface McpToolDefinition
{
    readonly name: string;
    readonly title?: string;
    readonly description?: string;
    readonly inputSchema: Readonly<Record<string, unknown>>;
    readonly outputSchema?: Readonly<Record<string, unknown>>;
    readonly annotations?: Readonly<Record<string, unknown>>;
    readonly icons?: ReadonlyArray<Readonly<Record<string, unknown>>>;
    readonly _meta?: Readonly<Record<string, unknown>>;
}

export interface McpResourceDefinition
{
    readonly uri: string;
    readonly name: string;
    readonly title?: string;
    readonly mimeType: string;
}

/**
 * 모듈이 MCP 에 더하는 것 가운데 요청과 무관한 조각. 봉투가 목록과 capability 를 답할 때 읽는다.
 *
 * ⚠ `resources` 는 목록에 서는 화면 자원이고, `resourcePrefixes` 는 목록 없이 주소로 읽는 자원의 앞머리다.
 *    둘 중 어디에도 맞지 않는 주소는 모듈까지 가지 않고 여기서 거절한다.
 */
export interface McpSurfaceShape
{
    readonly tools: ReadonlyArray<McpToolDefinition>;
    readonly resources: ReadonlyArray<McpResourceDefinition>;
    readonly resourcePrefixes: ReadonlyArray<string>;
    /** `capabilities.extensions` 에 실리는 것. 열쇠는 확장의 이름이다 */
    readonly extensions: Readonly<Record<string, unknown>>;
}

export const NO_SURFACE: McpSurfaceShape = { tools: [], resources: [], resourcePrefixes: [], extensions: {} };

export type McpPlan =
    /** `status` 는 새 판이 HTTP 상태로도 알리라고 정한 거절에만 선다 */
    | { readonly kind: "reply"; readonly reply: RpcReply; readonly status?: 400 | 404 }
    | { readonly kind: "none" }
    | { readonly kind: "list-notes"; readonly id: number | string }
    | {
        readonly kind: "create-note";
        readonly id: number | string;
        readonly title: string;
        readonly body: string;
        readonly visibility: "private" | "tenant";
    }
    | {
        readonly kind: "surface-call";
        readonly id: number | string;
        readonly name: string;
        readonly args: Readonly<Record<string, unknown>>;
        /** 호스트가 호출에 얹은 것(예: 연 파일의 경로). 모델이 적는 인자와 다른 자리로 온다 */
        readonly meta: Readonly<Record<string, unknown>>;
        /** 서버가 되물은 것에 대한 답. 처음 부를 때는 `null` 이다 */
        readonly inputResponses: Readonly<Record<string, unknown>> | null;
        readonly requestState: string | null;
    }
    | { readonly kind: "surface-read"; readonly id: number | string; readonly uri: string };

export const TOOLS = [
    {
        name: "list_notes",
        title: "쪽지 목록 보기",
        description: "이 계정이 볼 수 있는 쪽지의 제목을 읽는다.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    {
        name: "create_note",
        title: "쪽지 쓰기",
        description: "새 쪽지를 쓴다. visibility 가 private 이면 쓴 사람에게만, tenant 면 같은 조직 전체에 보인다.", // ux-writing: 모델이 읽는 설명
        inputSchema: {
            type: "object",
            properties: {
                title: { type: "string" },
                body: { type: "string" },
                visibility: { type: "string", enum: ["private", "tenant"] },
            },
            required: ["title"],
            additionalProperties: false,
        },
    },
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const recordOf = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const stringOf = (value: unknown): string => (typeof value === "string" ? value : "");

/** 요청이 스스로 밝힌 판. 싣지 않았으면 옛 판의 클라이언트다 */
const declaredVersion = (message: RpcMessage): string | null =>
{
    const version = recordOf(message.params?.["_meta"])[META_VERSION];

    return typeof version === "string" ? version : null;
};

export const mcpClient = (message: RpcMessage): McpClient =>
    declaredVersion(message) === null
        ? LEGACY_CLIENT
        : { modern: true, capabilities: recordOf(recordOf(message.params?.["_meta"])[META_CLIENT_CAPABILITIES]) };

/** 결과를 그 시대의 모양으로 싼다. 새 판은 결과마다 끝났는지(`resultType`)와 서버의 이름을 적는다 */
export const rpcResult = (id: number | string, result: Record<string, unknown>, client: McpClient = LEGACY_CLIENT): RpcReply =>
    ({
        jsonrpc: "2.0",
        id,
        result: client.modern
            ? { resultType: "complete", ...result, _meta: { ...recordOf(result["_meta"]), [META_SERVER_INFO]: SERVER_INFO } }
            : result,
    });

/** 도구의 답을 MCP 의 글 한 덩이로 싼다 */
export const toolText = (id: number | string, text: string, isError = false, client: McpClient = LEGACY_CLIENT): RpcReply =>
    rpcResult(id, { content: [{ type: "text", text }], isError }, client);

/**
 * 서버가 사람에게 되묻는다. 새 판의 왕복이다. 클라이언트는 답을 모아 같은 호출을 다시 보낸다.
 *
 * ⚠ **`requestState` 는 클라이언트를 지나 돌아온다.** 서명하지 않은 것을 믿지 않는다. 서명과 대조는 되묻는 쪽이 한다.
 */
export const inputRequired = (
    id: number | string,
    inputRequests: Readonly<Record<string, unknown>>,
    requestState: string,
): RpcReply =>
    ({
        jsonrpc: "2.0",
        id,
        result: { resultType: "input_required", inputRequests, requestState, _meta: { [META_SERVER_INFO]: SERVER_INFO } },
    });

const failure = (
    id: number | string,
    code: number,
    message: string,
    more: { readonly status?: 400 | 404; readonly data?: Record<string, unknown> } = {},
): McpPlan =>
    ({
        kind: "reply",
        reply: { jsonrpc: "2.0", id, error: { code, message, ...(more.data === undefined ? {} : { data: more.data }) } },
        ...(more.status === undefined ? {} : { status: more.status }),
    });

const capabilitiesOf = (surface: McpSurfaceShape): Record<string, unknown> =>
    ({
        tools: {},
        ...(surface.resources.length + surface.resourcePrefixes.length > 0 ? { resources: {} } : {}),
        ...(Object.keys(surface.extensions).length > 0 ? { extensions: surface.extensions } : {}),
    });

const readable = (surface: McpSurfaceShape, uri: string): boolean =>
    surface.resources.some((resource) => resource.uri === uri)
    || surface.resourcePrefixes.some((prefix) => uri.startsWith(prefix) && uri.length > prefix.length);

/**
 * 판을 적은 헤더(`MCP-Protocol-Version`)가 본문과 어긋나는가. 어긋나면 거절이고 맞거나 물을 것이 없으면 `null` 이다.
 *
 * 새 판은 본문의 판을 헤더에도 적는다. 사이의 프록시가 본문을 열지 않고 길을 고르게 하려는 것이고, 정본은 본문이다.
 *
 * ⚠ **헤더가 없는 요청은 막지 않는다.** 스펙은 헤더를 요구하지만, 빠뜨린 클라이언트를 막아 얻는 것이 없고 본문만으로
 *    판을 알 수 있다. 둘이 다른 말을 할 때만 거절한다.
 */
export const headerMismatch = (message: RpcMessage, headerVersion: string | null): McpPlan | null =>
{
    const version = declaredVersion(message);

    return message.id === undefined || version === null || headerVersion === null || headerVersion === version
        ? null
        : failure(message.id, -32020, "HeaderMismatch", { status: 400, data: { header: headerVersion, body: version } });
};

export const mcpPlan = (message: RpcMessage, surface: McpSurfaceShape = NO_SURFACE): McpPlan =>
{
    if (message.id === undefined)
    {
        return { kind: "none" };
    }

    const { id } = message;
    const version = declaredVersion(message);
    const client = mcpClient(message);
    const reply = (result: Record<string, unknown>): McpPlan => ({ kind: "reply", reply: rpcResult(id, result, client) });

    if (version !== null && version !== MODERN_VERSION)
    {
        return failure(id, -32022, "Unsupported protocol version", { status: 400, data: { supported: [MODERN_VERSION], requested: version } });
    }

    if (version !== null && !isRecord(recordOf(message.params?.["_meta"])[META_CLIENT_CAPABILITIES]))
    {
        return failure(id, -32602, `요청에 ${META_CLIENT_CAPABILITIES} 가 없다`, { status: 400 });
    }

    const hasResources = surface.resources.length + surface.resourcePrefixes.length > 0;

    switch (message.method)
    {
        case "initialize":
        {
            const capabilities = capabilitiesOf(surface);

            return {
                kind: "reply",
                reply: {
                    jsonrpc: "2.0",
                    id,
                    result: {
                        protocolVersion: stringOf(message.params?.["protocolVersion"]) || PROTOCOL_VERSION,
                        // 옛 판의 호스트 가운데에는 확장을 `experimental` 에서 찾는 것이 있다. 두 자리에 같은 것을 싣는다
                        capabilities: "extensions" in capabilities ? { ...capabilities, experimental: surface.extensions } : capabilities,
                        serverInfo: SERVER_INFO,
                    },
                },
            };
        }

        case "server/discover":
            return {
                kind: "reply",
                reply: rpcResult(id, { supportedVersions: [MODERN_VERSION], capabilities: capabilitiesOf(surface) }, { modern: true, capabilities: {} }),
            };

        case "ping":
            return reply({});

        case "tools/list":
            return reply({ tools: surface.tools.length === 0 ? TOOLS : [...TOOLS, ...surface.tools] });

        case "resources/list":
            return hasResources ? reply({ resources: surface.resources }) : failure(id, -32601, "모르는 메서드다: resources/list", client.modern ? { status: 404 } : {});

        case "resources/read":
        {
            const uri = stringOf(message.params?.["uri"]);

            if (!hasResources)
            {
                return failure(id, -32601, "모르는 메서드다: resources/read", client.modern ? { status: 404 } : {});
            }

            return readable(surface, uri)
                ? { kind: "surface-read", id, uri }
                : failure(id, -32602, "Resource not found", { data: { uri } });
        }

        case "tools/call":
        {
            const name = stringOf(message.params?.["name"]);
            const args = recordOf(message.params?.["arguments"]);

            if (name === "list_notes")
            {
                return { kind: "list-notes", id };
            }

            if (name === "create_note")
            {
                return {
                    kind: "create-note",
                    id,
                    title: stringOf(args["title"]),
                    body: stringOf(args["body"]),
                    visibility: args["visibility"] === "private" ? "private" : "tenant",
                };
            }

            if (surface.tools.some((tool) => tool.name === name))
            {
                // 프로토콜이 쓰는 칸(판 · 클라이언트의 이름과 capability)은 걷고 호스트가 얹은 것만 넘긴다
                const meta = Object.fromEntries(
                    Object.entries(recordOf(message.params?.["_meta"])).filter(([key]) => !key.startsWith(PROTOCOL_META_PREFIX)),
                );
                const requestState = message.params?.["requestState"];
                const inputResponses = message.params?.["inputResponses"];

                return {
                    kind: "surface-call",
                    id,
                    name,
                    args,
                    meta,
                    inputResponses: isRecord(inputResponses) ? inputResponses : null,
                    requestState: typeof requestState === "string" ? requestState : null,
                };
            }

            return failure(id, -32602, `모르는 도구다: ${name}`);
        }

        default:
            return failure(id, -32601, `모르는 메서드다: ${message.method ?? ""}`, client.modern ? { status: 404 } : {});
    }
};
