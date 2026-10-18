import { noteUri } from "../shared";

import { COPY } from "./copy";
import { render } from "./render";
import { INITIAL, modelContextFor, reduce, selectedCard, shouldReloadFile, type AppEvent, type AppState } from "./state";
import { createTransport } from "./transport";

/**
 * 화면의 들머리. 호스트와 악수하고, 호스트가 보내는 것을 상태에 넣고, 단추를 호스트에 청하는 일로 잇는다.
 *
 * 판정은 여기 없다. 무엇을 그릴지는 `state.ts` 와 `render.ts` 가 정하고, 이 파일은 브라우저와 호스트에 닿는 일만 한다.
 * 그래서 이 파일은 e2e 가 호스트를 흉내 낸 창 안에 띄워 잰다(`e2e/plugin.spec.ts`).
 *
 * | 익스텐션 | 이 파일의 자리 |
 * |---|---|
 * | 딥링크 | `host-ready` · `host-context-changed` 가 `hostContext["openai/deepLink"]` 를 상태에 넣는다 |
 * | 모델 컨텍스트 | `attachContext` 가 `ui/update-model-context` 를 청한다 |
 * | 메시지 | `sendMessage` 가 `ui/message` 를 청한다. 새 대화는 `_meta["openai/message"]` 다 |
 * | 파일 읽기 · 지켜보기 · 쓰기 | `loadFile` · `saveFile`. 호스트가 준 주소로 호스트에게 청한다 |
 * | 로컬 파일 열기 | `revealFile` 이 서버에서 자리를 받아 `openai/files/open` 을 청한다 |
 * | 표시 방식 | `requestFullscreen` 이 `ui/request-display-mode` 를 청한다 |
 *
 * ⚠ **듣는 것을 먼저 달고 악수한다.** 호스트는 악수가 끝나자마자 도구의 인자와 결과를 보낸다. 뒤에 달면 그것을 놓치고,
 *    화면이 처음 그릴 것을 잃는다.
 * ⚠ **뜨자마자 도구를 다시 부르지 않는다.** 처음 그릴 것은 호스트가 준 결과다.
 */
const transport = createTransport(window);
const root = document.getElementById("root");

let state: AppState = INITIAL;
/** 다음에 그릴 때 사람이 적던 글을 옮기지 않는다. 쪽지를 쓴 뒤 폼을 비울 때 쓴다 */
let resetFields = false;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const stringOf = (value: unknown): string => (typeof value === "string" ? value : "");

const field = (key: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null =>
    root?.querySelector(`[data-keep="${key}"]`) ?? null;

const paint = (): void =>
{
    if (root === null)
    {
        return;
    }

    // 다시 그리면 칸이 새로 선다. 적던 글과 커서를 옮겨 두지 않으면 테마가 바뀌는 것만으로 글이 사라진다
    const kept = new Map<string, string>();
    const focused = document.activeElement;
    const active = focused instanceof HTMLElement ? focused.dataset["keep"] : undefined;
    const caret = focused instanceof HTMLTextAreaElement || focused instanceof HTMLInputElement
        ? { start: focused.selectionStart, end: focused.selectionEnd }
        : null;

    for (const element of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("[data-keep]"))
    {
        kept.set(element.dataset["keep"] ?? "", element.value);
    }

    root.innerHTML = render(state);
    document.documentElement.dataset["theme"] = state.theme ?? "";
    document.documentElement.style.colorScheme = state.theme ?? "light dark";

    for (const [key, value] of kept)
    {
        const element = field(key);
        // 파일의 글은 고치던 중일 때만 옮긴다. 다시 읽은 뒤에는 읽어 온 글이 서야 한다
        const keep = !resetFields && (key !== "editor" || state.file?.dirty === true);

        if (element !== null && keep)
        {
            element.value = value;
        }
    }

    resetFields = false;

    if (active !== undefined)
    {
        const element = field(active);

        element?.focus();

        // 커서를 제자리에 둔다. 두지 않으면 글 가운데를 고치다가 커서가 끝으로 튄다
        if (caret !== null && caret.start !== null && !(element instanceof HTMLSelectElement))
        {
            element?.setSelectionRange(caret.start, caret.end ?? caret.start);
        }
    }
};

const dispatch = (event: AppEvent): void =>
{
    const before = state;

    state = reduce(state, event);
    paint();

    // 열 파일이 새로 생겼으면 읽는다. 도구의 인자로 먼저 오기도 하고 결과로 오기도 한다
    if (state.file !== null && state.file.status === "loading" && before.file?.resourceUri !== state.file.resourceUri)
    {
        void loadFile();
    }
};

const fail = (message: string | null) => (): void =>
{
    // 글이 없는 실패는 알리지 않는다. 쪽지를 고르기만 한 사람에게 컨텍스트를 못 붙였다고 말할 까닭이 없다
    if (message !== null)
    {
        dispatch({ type: "notice", text: message });
    }
};

const callTool = (name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> =>
    transport.request("tools/call", { name, arguments: args });

/** 고른 쪽지를 모델의 컨텍스트에 붙인다. 고른 것이 없으면 앞서 붙인 것을 지운다 */
const attachContext = async (): Promise<void> =>
{
    if (!state.abilities.modelContext)
    {
        return;
    }

    const result = await transport.request("ui/update-model-context", { ...modelContextFor(selectedCard(state)) });
    const meta = isRecord(result["_meta"]) ? result["_meta"]["openai/modelContext"] : undefined;

    dispatch({ type: "context-attached", updateId: selectedCard(state) !== null && isRecord(meta) ? stringOf(meta["updateId"]) || null : null });
};

const sendMessage = async (target: "active" | "new"): Promise<void> =>
{
    const card = selectedCard(state);

    if (card === null)
    {
        return;
    }

    await transport.request("ui/message", {
        role: "user",
        content: [
            { type: "text", text: COPY.messageLead(card.title) },
            { type: "resource_link", uri: noteUri(card.id), name: card.title, mimeType: "text/markdown" },
        ],
        // 말하지 않으면 지금 대화로 간다. 새 대화로 보낼 때만 적는다
        ...(target === "new" ? { _meta: { "openai/message": { target: "new" } } } : {}),
    });
};

const decode = (blob: string): string => new TextDecoder().decode(Uint8Array.from(atob(blob), (char) => char.charCodeAt(0)));

async function loadFile(): Promise<void>
{
    const file = state.file;

    if (file === null)
    {
        return;
    }

    try
    {
        // 주소는 호스트가 준 것이고 파일의 경로가 아니다. 읽기는 호스트가 가로채 답한다
        const response = await transport.request("resources/read", { uri: file.resourceUri, _meta: { "openai/resource": { representation: "text" } } });
        const contents = Array.isArray(response["contents"]) ? response["contents"] : [];
        const content: unknown = contents.find((each) => isRecord(each) && each["uri"] === file.resourceUri) ?? contents[0];

        if (!isRecord(content))
        {
            throw new Error("no contents");
        }

        const resource = isRecord(content["_meta"]) && isRecord(content["_meta"]["openai/resource"]) ? content["_meta"]["openai/resource"] : {};

        dispatch({
            type: "file-read",
            text: typeof content["text"] === "string" ? content["text"] : decode(stringOf(content["blob"])),
            etag: stringOf(resource["etag"]) || null,
            // 호스트가 쓸 수 있다고 하지 않은 파일은 읽기만 한다
            writable: state.abilities.hostFiles && resource["writable"] === true,
        });

        // 밖에서 파일이 바뀌면 알려 달라고 한다. 받지 않는 호스트면 조용히 넘어간다
        void transport.request("resources/subscribe", { uri: file.resourceUri }).catch(() => undefined);
    }
    catch
    {
        dispatch({ type: "file-failed" });
    }
}

const saveFile = async (): Promise<void> =>
{
    const file = state.file;
    const text = field("editor")?.value ?? file?.text ?? "";

    if (file === null || !file.writable)
    {
        return;
    }

    // 칸이 쥔 글을 상태에 옮기고 저장한다. 글자마다 상태를 고치지 않으므로, 옮기지 않으면 저장한 뒤 다시 그릴 때 옛 글이 선다
    dispatch({ type: "file-edited", text });
    dispatch({ type: "file-saving" });

    // 읽었을 때의 판을 함께 보낸다. 그사이 파일이 바뀌었으면 호스트가 덮어쓰지 않고 `conflict` 로 답한다
    const response = await transport
        .request("openai/resources/write", { uri: file.resourceUri, text, ...(file.etag === null ? {} : { ifMatch: file.etag }) })
        .catch(() => ({ outcome: "failed" }) as Record<string, unknown>);

    if (response["outcome"] === "saved")
    {
        dispatch({ type: "file-written", outcome: "saved", etag: stringOf(response["etag"]) });
    }
    else if (response["outcome"] === "conflict")
    {
        dispatch({ type: "file-written", outcome: "conflict", etag: stringOf(response["etag"]) });
    }
    else if (response["outcome"] === "too-large")
    {
        dispatch({ type: "file-written", outcome: "too-large", maxBytes: typeof response["maxBytes"] === "number" ? response["maxBytes"] : 0 });
    }
    else
    {
        dispatch({ type: "file-save-failed" });
    }
};

const resultText = (result: Record<string, unknown>): string =>
{
    const block = Array.isArray(result["content"]) ? result["content"].find((each) => isRecord(each) && each["type"] === "text") : undefined;

    return isRecord(block) ? stringOf(block["text"]) : "";
};

const importFile = async (): Promise<void> =>
{
    const file = state.file;

    if (file === null)
    {
        return;
    }

    const result = await callTool("import_file", { name: file.name, text: field("editor")?.value ?? file.text ?? "" });

    dispatch({ type: "notice", text: resultText(result) || COPY.file.imported });
};

/**
 * 연 파일을 호스트의 뷰어로 연다. 화면은 파일이 어디 있는지 모른다. 서버가 호스트에게서 받은 자리를 돌려주면 그 자리로 청한다.
 */
const revealFile = async (): Promise<void> =>
{
    const located = await callTool("reveal_file_path");
    const path = isRecord(located["structuredContent"]) ? stringOf(located["structuredContent"]["path"]) : "";

    if (path === "")
    {
        dispatch({ type: "notice", text: resultText(located) || COPY.file.revealFailed });

        return;
    }

    dispatch({ type: "file-located", path });
    await transport.request("openai/files/open", { path });
};

const composeNote = async (form: HTMLFormElement): Promise<void> =>
{
    const data = new FormData(form);
    const submit = form.querySelector<HTMLButtonElement>("button[type=submit]");

    // 쓰는 동안 단추를 끈다. 다시 그릴 때 제 모습으로 돌아온다
    if (submit !== null)
    {
        submit.disabled = true;
        submit.textContent = COPY.actions.composing;
    }

    const created = await callTool("create_note", {
        title: stringOf(data.get("title")),
        body: stringOf(data.get("body")),
        visibility: stringOf(data.get("visibility")),
    });

    if (created["isError"] === true)
    {
        dispatch({ type: "notice", text: resultText(created) || COPY.errors.compose });

        return;
    }

    // 쓴 쪽지가 목록에 서도록 같은 도구로 다시 읽는다. 목록을 화면에서 지어내지 않는다
    resetFields = true;
    dispatch({ type: "tool-result", result: await callTool(state.view?.page === "tray" ? "open_tray" : "open_library") });
};

const requestFullscreen = async (): Promise<void> =>
{
    const response = await transport.request("ui/request-display-mode", { mode: "fullscreen" });

    // 호스트가 청한 것과 다른 방식으로 답할 수 있다. 답한 대로 따른다
    dispatch({ type: "host-context-changed", context: { displayMode: response["mode"] } });
};

/** 단추마다 하는 일과, 그 일이 실패했을 때 설 글. 글이 `null` 이면 실패를 알리지 않는다 */
const ACTIONS: Readonly<Record<string, { readonly run: (target: HTMLElement) => Promise<void>; readonly failure: string | null }>> = {
    select: {
        run: async (target) =>
        {
            dispatch({ type: "note-selected", noteId: target.dataset["id"] ?? null });
            await attachContext();
        },
        failure: null,
    },
    deselect: {
        run: async () =>
        {
            dispatch({ type: "note-selected", noteId: null });
            await attachContext();
        },
        failure: null,
    },
    message: { run: () => sendMessage("active"), failure: COPY.errors.message },
    "message-new": { run: () => sendMessage("new"), failure: COPY.errors.message },
    fullscreen: { run: requestFullscreen, failure: null },
    save: { run: saveFile, failure: COPY.file.saveFailed },
    reload: { run: loadFile, failure: COPY.file.failed },
    import: { run: importFile, failure: COPY.file.importFailed },
    reveal: { run: revealFile, failure: COPY.file.revealFailed },
};

root?.addEventListener("click", (event) =>
{
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("button[data-action]") : null;
    const action = target === null ? undefined : ACTIONS[target.dataset["action"] ?? ""];

    if (target !== null && action !== undefined)
    {
        action.run(target).catch(fail(action.failure));
    }
});

root?.addEventListener("submit", (event) =>
{
    event.preventDefault();

    if (event.target instanceof HTMLFormElement && event.target.dataset["action"] === "compose")
    {
        composeNote(event.target).catch(fail(COPY.errors.compose));
    }
});

root?.addEventListener("input", (event) =>
{
    if (event.target instanceof HTMLTextAreaElement && event.target.dataset["action"] === "edit" && state.file?.dirty === false)
    {
        // 처음 고친 순간에만 알린다. 글자마다 다시 그리지 않는다. 글은 칸이 쥐고 있다
        dispatch({ type: "file-edited", text: event.target.value });
    }
});

transport.on("ui/notifications/tool-input", (params) => dispatch({ type: "tool-input", arguments: params["arguments"] }));
transport.on("ui/notifications/tool-result", (params) => dispatch({ type: "tool-result", result: params }));
transport.on("ui/notifications/host-context-changed", (params) =>
{
    applyHostStyles(params);
    dispatch({ type: "host-context-changed", context: params });
});
transport.on("notifications/resources/updated", (params) =>
{
    const uri = stringOf(params["uri"]);

    if (shouldReloadFile(state, uri))
    {
        void loadFile();
    }
    else if (state.file?.resourceUri === uri)
    {
        dispatch({ type: "file-changed-outside" });
    }
});
transport.handle("ui/resource-teardown", () => ({}));
transport.handle("ping", () => ({}));

/** 호스트가 준 CSS 변수를 입는다. 화면이 호스트의 일부처럼 보이게 한다 */
function applyHostStyles(context: Record<string, unknown>): void
{
    const styles = isRecord(context["styles"]) ? context["styles"] : {};
    const variables = isRecord(styles["variables"]) ? styles["variables"] : {};

    for (const [name, value] of Object.entries(variables))
    {
        if (name.startsWith("--") && typeof value === "string")
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
            appInfo: { name: "notes", version: "0.0.1" },
            appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
        })
        .then((response) =>
        {
            const context = isRecord(response["hostContext"]) ? response["hostContext"] : {};

            applyHostStyles(context);
            dispatch({ type: "host-ready", capabilities: response["hostCapabilities"], context });
            transport.notify("ui/notifications/initialized");
        })
        .catch(fail(COPY.errors.load));
}
