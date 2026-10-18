"use client";

import { useEffect, useRef, useState } from "react";

import { APP_HTML } from "@/modules/plugin/app/bundle.generated";

/**
 * 구운 화면(`APP_HTML`)을 iframe 에 띄우고 호스트가 하는 말을 대신한다. 목업이 그리는 것은 흉내 낸 그림이 아니라 실제 화면이다.
 *
 * 악수(`ui/initialize`)에 테마 · 표시 방식 · 띄운 도구를 실어 답하고, 화면이 `initialized` 를 알리면 도구의 결과를 보낸다. 결과를 주지
 * 않으면(`result: null`) 화면은 기다리는 얼굴로 남는다. 화면이 청하는 일(보내기 · 대화에 추가 · 크게 보기 · 링크)은 받아서 위로 알린다.
 *
 * ⚠ 개발 서버의 목업에서만 쓴다. 실물 호스트가 무엇을 받아 주는지는 여기서 알 수 없다.
 */
export interface HostEvent
{
    readonly method: string;
    readonly params: Record<string, unknown>;
}

export function WidgetFrame({ tool, result, theme, displayMode, height, onHostEvent }: {
    readonly tool: string;
    readonly result: Record<string, unknown> | null;
    readonly theme: "light" | "dark";
    readonly displayMode: "inline" | "fullscreen";
    /** 넓은 자리의 높이. 없으면 화면이 알린 키를 따른다 */
    readonly height?: number;
    readonly onHostEvent?: (event: HostEvent) => void;
})
{
    const frame = useRef<HTMLIFrameElement>(null);
    const [measured, setMeasured] = useState(160);
    // 서버가 그린 HTML 에 srcDoc 이 실리면 듣는 쪽이 서기 전에 화면이 악수를 청해 답을 못 받는다. 듣는 쪽을 세운 뒤에 싣는다
    const [doc, setDoc] = useState<string | undefined>(undefined);
    const listener = useRef(onHostEvent);

    listener.current = onHostEvent;

    useEffect(() =>
    {
        const target = frame.current;

        if (target === null)
        {
            return undefined;
        }

        const reply = (id: unknown, payload: Record<string, unknown>): void =>
            target.contentWindow?.postMessage({ jsonrpc: "2.0", id, ...payload }, "*");
        const notify = (method: string, params: Record<string, unknown>): void =>
            target.contentWindow?.postMessage({ jsonrpc: "2.0", method, params }, "*");

        const onMessage = (event: MessageEvent): void =>
        {
            if (event.source !== target.contentWindow || typeof event.data !== "object" || event.data === null)
            {
                return;
            }

            const message = event.data as { id?: unknown; method?: string; params?: Record<string, unknown> };
            const params = message.params ?? {};

            switch (message.method)
            {
                case "ui/initialize":
                    reply(message.id, {
                        result: {
                            protocolVersion: "2026-01-26",
                            hostInfo: { name: "mock-host", version: "0.0.0" },
                            hostCapabilities: { message: {}, updateModelContext: {}, openLinks: {} },
                            hostContext: {
                                theme,
                                displayMode,
                                availableDisplayModes: ["inline", "fullscreen"],
                                toolInfo: { tool: { name: tool } },
                                locale: "ko-KR",
                            },
                        },
                    });
                    return;
                case "ui/notifications/initialized":
                    if (result !== null)
                    {
                        notify("ui/notifications/tool-result", { content: [{ type: "text", text: "" }], structuredContent: result });
                    }
                    return;
                case "ui/notifications/size-changed":
                    if (typeof params["height"] === "number")
                    {
                        setMeasured(params["height"]);
                    }
                    return;
                case "ui/request-display-mode":
                    // 목업의 카드는 그 자리에 머문다. 크게 보기는 옆 장면이 따로 보인다
                    reply(message.id, { result: { mode: displayMode } });
                    listener.current?.({ method: message.method, params });
                    return;
                case "ui/open-link":
                    window.open(String(params["url"] ?? ""), "_blank", "noopener");
                    reply(message.id, { result: {} });
                    return;
                default:
                    if (message.id !== undefined && typeof message.method === "string")
                    {
                        reply(message.id, { result: {} });
                        listener.current?.({ method: message.method, params });
                    }
            }
        };

        window.addEventListener("message", onMessage);
        setDoc(APP_HTML);

        return () => window.removeEventListener("message", onMessage);
    }, [tool, result, theme, displayMode]);

    return (
        <iframe
            ref={frame}
            title={tool}
            srcDoc={doc}
            sandbox="allow-scripts allow-popups"
            className="block w-full border-0 bg-transparent"
            style={{ height: height ?? measured, colorScheme: theme }}
        />
    );
}
