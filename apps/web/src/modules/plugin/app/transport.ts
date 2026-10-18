/**
 * 화면과 호스트 사이의 전송. `postMessage` 위의 JSON-RPC 2.0 이고, MCP Apps 가 정한 그대로다.
 *
 * 화면은 호스트(ChatGPT)가 띄운 iframe 이다. 서버와 직접 말하지 않고 호스트에게 청한다. 도구를 불러 달라
 * (`tools/call`), 대화에 보내 달라(`ui/message`), 이 파일을 읽어 달라(`resources/read`)가 모두 이 길로 간다.
 *
 * ⚠ **부모 창에서 온 메시지만 받는다.** 다른 창이 보낸 것을 답으로 받으면 화면이 남의 말을 호스트의 말로 믿는다.
 * ⚠ **받는 쪽의 출처를 `*` 로 둔다.** 호스트가 화면을 어느 출처의 틀에 넣는지 화면은 모른다(웹은 가림막 iframe 을 한 겹 더
 *    둔다). 그래서 보내는 글에 비밀을 싣지 않는다. 화면이 쥔 것은 호스트가 준 것뿐이다.
 * ⚠ **답이 오지 않는 청은 기한이 지나면 실패로 끝낸다.** 호스트가 모르는 메서드에 답하지 않아도 단추가 영영 돌지 않는다.
 */
interface Message
{
    readonly jsonrpc: "2.0";
    readonly id?: number | string;
    readonly method?: string;
    readonly params?: Record<string, unknown>;
    readonly result?: unknown;
    readonly error?: { readonly code: number; readonly message: string };
}

export interface Transport
{
    readonly request: (method: string, params?: Record<string, unknown>, timeoutMs?: number) => Promise<Record<string, unknown>>;
    readonly notify: (method: string, params?: Record<string, unknown>) => void;
    /** 호스트가 보내는 알림을 듣는다 */
    readonly on: (method: string, listener: (params: Record<string, unknown>) => void) => void;
    /** 호스트가 화면에 청하는 것에 답한다 */
    readonly handle: (method: string, handler: (params: Record<string, unknown>) => unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export const createTransport = (self: Window): Transport =>
{
    let sequence = 0;
    const pending = new Map<number | string, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: number }>();
    const listeners = new Map<string, Array<(params: Record<string, unknown>) => void>>();
    const handlers = new Map<string, (params: Record<string, unknown>) => unknown>();
    const send = (message: Omit<Message, "jsonrpc">): void => self.parent.postMessage({ jsonrpc: "2.0", ...message }, "*");

    self.addEventListener("message", (event: MessageEvent) =>
    {
        if (event.source !== self.parent || !isRecord(event.data) || event.data["jsonrpc"] !== "2.0")
        {
            return;
        }

        const message = event.data as unknown as Message;
        const params = isRecord(message.params) ? message.params : {};

        if (message.method === undefined && message.id !== undefined)
        {
            const waiting = pending.get(message.id);

            if (waiting === undefined)
            {
                return;
            }

            pending.delete(message.id);
            self.clearTimeout(waiting.timer);

            if (message.error !== undefined)
            {
                waiting.reject(new Error(message.error.message));
            }
            else
            {
                waiting.resolve(isRecord(message.result) ? message.result : {});
            }
        }
        else if (message.method !== undefined && message.id !== undefined)
        {
            const { id, method } = message;
            const handler = handlers.get(method);

            if (handler === undefined)
            {
                send({ id, error: { code: -32601, message: `Unsupported app method: ${method}` } });

                return;
            }

            Promise.resolve()
                .then(() => handler(params))
                .then(
                    (result) => send({ id, result }),
                    (error: unknown) => send({ id, error: { code: -32603, message: error instanceof Error ? error.message : String(error) } }),
                );
        }
        else if (message.method !== undefined)
        {
            for (const listener of listeners.get(message.method) ?? [])
            {
                listener(params);
            }
        }
    });

    return {
        request: (method, params = {}, timeoutMs = 15_000) =>
            new Promise((resolve, reject) =>
            {
                sequence += 1;

                const id = sequence;
                const timer = self.setTimeout(() =>
                {
                    pending.delete(id);
                    reject(new Error(`${method} timed out`));
                }, timeoutMs);

                pending.set(id, { resolve, reject, timer });
                send({ id, method, params });
            }),
        notify: (method, params = {}) => send({ method, params }),
        on: (method, listener) =>
        {
            listeners.set(method, [...(listeners.get(method) ?? []), listener]);
        },
        handle: (method, handler) =>
        {
            handlers.set(method, handler);
        },
    };
};
