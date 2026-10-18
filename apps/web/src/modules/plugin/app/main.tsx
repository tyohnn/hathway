import { createRoot } from "react-dom/client";

import { COPY } from "./copy";
import type { ScreenAction } from "./parts";
import { Screen } from "./Screen";
import { INITIAL, isRecord, modelContextFor, reduce, type AppEvent, type AppState } from "./state";
import { createTransport } from "./transport";

/**
 * 화면의 들머리. 호스트와 악수하고, 호스트가 보내는 것을 상태에 넣고, 단추를 호스트에 청하는 일로 잇는다.
 *
 * 판정은 여기 없다. 무엇을 그릴지는 `state.ts` 와 `Screen.tsx` 가 정하고, 이 파일은 브라우저와 호스트에 닿는 일만 한다.
 *
 * | 단추 | 호스트에 청하는 것 |
 * |---|---|
 * | 분석 시작 · 적정가 계산 · 분기로 보기 · 보드에 담기 | `ui/message` 로 사람이 쓴 것처럼 대화에 말을 보낸다 |
 * | 대화에 추가 | `ui/update-model-context` 로 붙인 것 모두를 모델의 맥락으로 갈아 끼운다 |
 * | 크게 보기 · 시나리오 9칸 보기 | `ui/request-display-mode` 로 전체 화면을 청한다 |
 * | 공시 한 줄 | `ui/open-link` 로 DART 원문을 밖에서 연다 |
 *
 * ⚠ **듣는 것을 먼저 달고 악수한다.** 호스트는 악수가 끝나자마자 도구의 결과를 보낸다. 뒤에 달면 그것을 놓친다.
 * ⚠ **뜨자마자 도구를 다시 부르지 않는다.** 처음 그릴 것은 호스트가 준 결과다.
 */
const transport = createTransport(window);
const mount = document.getElementById("root");
const root = mount === null ? null : createRoot(mount);

let state: AppState = INITIAL;

const paint = (): void =>
{
    if (root === null)
    {
        return;
    }

    root.render(<Screen state={state} onAction={act} />);
    // graphite 는 어두운 판을 `.dark` 로 입는다. 호스트가 테마를 알리기 전에는 기기의 설정을 따른다
    const dark = state.theme === null ? window.matchMedia("(prefers-color-scheme: dark)").matches : state.theme === "dark";

    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.dataset["theme"] = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
};

const dispatch = (event: AppEvent): void =>
{
    state = reduce(state, event);
    paint();
};

const send = async (text: string): Promise<void> =>
{
    await transport.request("ui/message", { role: "user", content: [{ type: "text", text }] });
};

const requestFullscreen = async (): Promise<void> =>
{
    const response = await transport.request("ui/request-display-mode", { mode: "fullscreen" });

    // 호스트가 청한 것과 다른 방식으로 답할 수 있다. 답한 대로 따른다
    dispatch({ type: "host-context-changed", context: { displayMode: response["mode"] } });
};

/** 붙인 것이 바뀌면 모두를 한 번에 다시 보낸다. 실패하면 누른 것을 되돌린다 */
const toggleContext = async (action: Extract<ScreenAction, { kind: "toggle" }>): Promise<void> =>
{
    dispatch({ type: "toggle-context", item: action.item });

    try
    {
        await transport.request("ui/update-model-context", { ...modelContextFor(state.added) });
    }
    catch (error)
    {
        dispatch({ type: "toggle-context", item: action.item });
        throw error;
    }
};

const openLink = async (url: string): Promise<void> =>
{
    await transport.request("ui/open-link", { url });
};

const FAILURE: Readonly<Record<ScreenAction["kind"], string | null>> = {
    send: COPY.errors.message,
    fullscreen: null,
    toggle: COPY.errors.context,
    open: COPY.errors.link,
};

function act(action: ScreenAction): void
{
    const run = (): Promise<void> =>
    {
        switch (action.kind)
        {
            case "send":
                return send(action.text);
            case "fullscreen":
                return requestFullscreen();
            case "toggle":
                return toggleContext(action);
            case "open":
                return openLink(action.url);
        }
    };

    dispatch({ type: "notice", text: null });
    run().catch(() =>
    {
        const message = FAILURE[action.kind];

        if (message !== null)
        {
            dispatch({ type: "notice", text: message });
        }
    });
}

transport.on("ui/notifications/tool-result", (params) => dispatch({ type: "tool-result", result: params }));
transport.on("ui/notifications/host-context-changed", (params) =>
{
    applyHostStyles(params);
    dispatch({ type: "host-context-changed", context: params });
});
transport.handle("ui/resource-teardown", () => ({}));
transport.handle("ping", () => ({}));

/**
 * 호스트가 준 CSS 변수 가운데 글꼴만 입는다. 화면은 밖의 글꼴 파일을 받을 수 없고, 호스트의 규칙도 기기의 글꼴을 쓰라고 한다.
 *
 * ⚠ **나머지 변수는 입지 않는다.** 색 · 굵기 · 반경은 graphite 의 토큰이 갖고, 호스트의 이름(`--font-weight-*` 등)이 Tailwind 의
 *    테마 변수와 겹쳐 graphite 를 덮는다.
 */
const HOST_VARIABLES: ReadonlyArray<string> = ["--font-sans"];

function applyHostStyles(context: Record<string, unknown>): void
{
    const styles = isRecord(context["styles"]) ? context["styles"] : {};
    const variables = isRecord(styles["variables"]) ? styles["variables"] : {};

    for (const name of HOST_VARIABLES)
    {
        const value = variables[name];

        if (typeof value === "string")
        {
            document.documentElement.style.setProperty(name, value);
        }
    }
}

// 대화 안에 뜰 때는 호스트가 화면의 키를 모른다. 바뀔 때마다 알려 틀을 맞추게 한다
new ResizeObserver(() =>
    transport.notify("ui/notifications/size-changed", { height: Math.ceil(document.body.getBoundingClientRect().height) }))
    .observe(document.body);

paint();

if (window.parent !== window)
{
    transport
        .request("ui/initialize", {
            protocolVersion: "2026-01-26",
            appInfo: { name: "hathway", version: "0.1.0" },
            appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
        })
        .then((response) =>
        {
            const context = isRecord(response["hostContext"]) ? response["hostContext"] : {};

            applyHostStyles(context);
            dispatch({ type: "host-ready", capabilities: response["hostCapabilities"], context });
            transport.notify("ui/notifications/initialized");
        })
        .catch(() => dispatch({ type: "notice", text: COPY.errors.load }));
}
