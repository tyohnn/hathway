import { routeOfDeepLink } from "../deepLink";
import { noteMarkdown, noteUri } from "../shared";
import type { NoteCard, PluginView } from "../views";

import { COPY } from "./copy";

/**
 * 화면(iframe)의 상태와 그 전이. 순수 함수라 브라우저 없이 잰다(`state.test.ts`).
 *
 * 화면은 호스트(ChatGPT) 안에서 뜨고, 호스트가 보내는 것에 따라 바뀐다. 도구의 결과, 호스트의 맥락(테마 · 표시 방식 ·
 * 딥링크 · 붙어 있는 컨텍스트), 연 파일의 내용이다. 그 하나하나가 사건이고, `reduce` 가 사건마다 다음 상태를 정한다.
 * 호스트에 말을 거는 일(`main.ts`)은 상태를 보고 하며, 여기서는 하지 않는다.
 *
 * ⚠ **호스트를 지나온 것도 밖에서 온 입력이다.** 도구의 결과와 맥락은 모양을 확인하고 받는다. 틀린 것은 버리고 화면을
 *    그대로 둔다.
 * ⚠ **처음 그릴 것은 호스트가 준다.** 화면은 뜨자마자 도구를 다시 부르지 않고 `tool-result` 를 기다린다. 다시 부르면
 *    늦게 그려지고 한 번 깜빡인다.
 * ⚠ **이 폴더의 파일은 화면의 묶음에 들어간다.** 서버의 것을 import 하지 않는다. 타입만 가져오는 것은 묶음에 실리지 않는다.
 */
export interface Abilities
{
    /** 대화에 메시지를 보낼 수 있다(MCP Apps 표준) */
    readonly message: boolean;
    /** 새 대화로 보낼 수 있다(OpenAI 확장) */
    readonly newThread: boolean;
    /** 고른 것을 모델의 컨텍스트에 붙일 수 있다 */
    readonly modelContext: boolean;
    /** 사용자의 컴퓨터에 있는 파일을 호스트의 뷰어로 열 수 있다 */
    readonly openFile: boolean;
    /** 연 파일을 호스트를 지나 읽고 지켜보고 쓸 수 있다 */
    readonly hostFiles: boolean;
}

export type FileStatus = "loading" | "ready" | "saving" | "saved" | "conflict" | "too-large" | "failed";

export interface FileState
{
    readonly name: string;
    /** 호스트가 준 주소. 파일의 경로가 아니고, 호스트를 지나서만 읽고 쓴다 */
    readonly resourceUri: string;
    readonly text: string | null;
    /** 읽었을 때의 판. 저장할 때 이 판과 같을 때만 쓰게 한다 */
    readonly etag: string | null;
    readonly writable: boolean;
    readonly dirty: boolean;
    readonly status: FileStatus;
    readonly path: string | null;
}

export interface AppState
{
    /** 도구의 결과가 오기 전에는 `null` 이고 기다리는 얼굴을 그린다 */
    readonly view: PluginView | null;
    readonly selectedId: string | null;
    /** 결과보다 먼저 온 「이 쪽지를 펼쳐라」. 딥링크나 다시 뜰 때 되찾은 컨텍스트에서 온다 */
    readonly pendingNoteId: string | null;
    readonly abilities: Abilities;
    readonly theme: "light" | "dark" | null;
    readonly displayMode: "inline" | "fullscreen" | null;
    readonly canFullscreen: boolean;
    /** 이 화면이 붙여 둔 컨텍스트의 번호. 없으면 붙인 것이 없다 */
    readonly contextUpdateId: string | null;
    readonly file: FileState | null;
    readonly notice: string | null;
}

export type AppEvent =
    | { readonly type: "host-ready"; readonly capabilities: unknown; readonly context: unknown }
    | { readonly type: "host-context-changed"; readonly context: unknown }
    | { readonly type: "tool-input"; readonly arguments: unknown }
    | { readonly type: "tool-result"; readonly result: unknown }
    | { readonly type: "note-selected"; readonly noteId: string | null }
    | { readonly type: "context-attached"; readonly updateId: string | null }
    | { readonly type: "file-read"; readonly text: string; readonly etag: string | null; readonly writable: boolean }
    | { readonly type: "file-edited"; readonly text: string }
    | { readonly type: "file-saving" }
    | { readonly type: "file-written"; readonly outcome: "saved"; readonly etag: string }
    | { readonly type: "file-written"; readonly outcome: "conflict"; readonly etag: string }
    | { readonly type: "file-written"; readonly outcome: "too-large"; readonly maxBytes: number }
    | { readonly type: "file-save-failed" }
    | { readonly type: "file-changed-outside" }
    | { readonly type: "file-failed" }
    | { readonly type: "file-located"; readonly path: string }
    | { readonly type: "notice"; readonly text: string | null };

const NO_ABILITIES: Abilities = { message: false, newThread: false, modelContext: false, openFile: false, hostFiles: false };

export const INITIAL: AppState = {
    view: null,
    selectedId: null,
    pendingNoteId: null,
    abilities: NO_ABILITIES,
    theme: null,
    displayMode: null,
    canFullscreen: false,
    contextUpdateId: null,
    file: null,
    notice: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const stringOf = (value: unknown): string => (typeof value === "string" ? value : "");

/** 호스트가 `ui/initialize` 의 답으로 알린 능력에서 이 화면이 쓰는 것만 고른다. 알리지 않은 것은 없는 것이다 */
export const abilitiesOf = (capabilities: unknown): Abilities =>
{
    const host = isRecord(capabilities) ? capabilities : {};
    const experimental = isRecord(host["experimental"]) ? host["experimental"] : {};
    const message = isRecord(host["message"]);

    return {
        message,
        newThread: message && isRecord(experimental["openai/message"]),
        modelContext: isRecord(host["updateModelContext"]),
        openFile: isRecord(experimental["openai/files"]),
        hostFiles: isRecord(experimental["openai/resource"]),
    };
};

const cardOf = (value: unknown): NoteCard | null =>
{
    if (!isRecord(value))
    {
        return null;
    }

    const { id, title, body, visibility, archived } = value;

    return typeof id === "string" && typeof title === "string" && typeof body === "string"
        && (visibility === "private" || visibility === "tenant") && typeof archived === "boolean"
        ? { id, title, body, visibility, archived }
        : null;
};

const fileOf = (value: unknown): { readonly name: string; readonly resourceUri: string } | null =>
{
    const name = isRecord(value) ? stringOf(value["name"]) : "";
    const resourceUri = isRecord(value) ? stringOf(value["resourceUri"]) : "";

    return name === "" || resourceUri === "" ? null : { name, resourceUri };
};

/** 도구의 `structuredContent` 를 화면이 그릴 모양으로 읽는다. 하나라도 틀리면 `null` 이다 */
export const viewOf = (value: unknown): PluginView | null =>
{
    if (!isRecord(value) || !Array.isArray(value["notes"]) || !isRecord(value["preferences"]))
    {
        return null;
    }

    const { page, preferences, selectedId } = value;
    const notes = value["notes"].map(cardOf);
    const { defaultVisibility, showArchived } = preferences as Record<string, unknown>;

    if ((page !== "library" && page !== "tray" && page !== "file") || notes.some((card) => card === null)
        || (defaultVisibility !== "private" && defaultVisibility !== "tenant") || typeof showArchived !== "boolean")
    {
        return null;
    }

    return {
        page,
        notes: notes.flatMap((card) => (card === null ? [] : [card])),
        preferences: { defaultVisibility, showArchived },
        selectedId: typeof selectedId === "string" ? selectedId : null,
        file: fileOf(value["file"]),
    };
};

const openedFile = (file: { readonly name: string; readonly resourceUri: string }): FileState =>
    ({ ...file, text: null, etag: null, writable: false, dirty: false, status: "loading", path: null });

const has = (view: PluginView | null, noteId: string | null): boolean =>
    noteId !== null && view !== null && view.notes.some((card) => card.id === noteId);

/** 호스트의 맥락은 바뀐 칸만 온다. 온 칸만 고친다 */
const withContext = (state: AppState, context: unknown): AppState =>
{
    if (!isRecord(context))
    {
        return state;
    }

    let next: AppState = {
        ...state,
        theme: context["theme"] === "light" || context["theme"] === "dark" ? context["theme"] : state.theme,
        displayMode: context["displayMode"] === "inline" || context["displayMode"] === "fullscreen" ? context["displayMode"] : state.displayMode,
        canFullscreen: Array.isArray(context["availableDisplayModes"]) ? context["availableDisplayModes"].includes("fullscreen") : state.canFullscreen,
    };

    if ("openai/modelContext" in context)
    {
        const attached = context["openai/modelContext"];

        if (isRecord(attached))
        {
            // 화면이 다시 뜨면 붙여 두었던 컨텍스트가 여기로 돌아온다. 고른 쪽지를 되찾는다
            const noteId = isRecord(attached["structuredContent"]) ? stringOf(attached["structuredContent"]["noteId"]) : "";

            next = {
                ...next,
                contextUpdateId: stringOf(attached["updateId"]) || null,
                pendingNoteId: noteId === "" ? next.pendingNoteId : noteId,
                selectedId: has(next.view, noteId) ? noteId : next.selectedId,
            };
        }
        else
        {
            // 사람이 컴포저에서 첨부를 뗐다. 화면이 계속 고른 것처럼 보이면 모델이 읽는 것과 어긋난다
            next = { ...next, contextUpdateId: null, selectedId: next.contextUpdateId === null ? next.selectedId : null };
        }
    }

    if ("openai/deepLink" in context)
    {
        const link = context["openai/deepLink"];
        const route = routeOfDeepLink(isRecord(link) ? stringOf(link["url"]) : undefined);
        const noteId = route.page === "note" ? route.noteId : null;

        next = { ...next, pendingNoteId: next.view === null ? noteId : null, selectedId: has(next.view, noteId) ? noteId : null };
    }

    return next;
};

const withFile = (state: AppState, change: (file: FileState) => FileState): AppState =>
    (state.file === null ? state : { ...state, file: change(state.file) });

const firstText = (result: Record<string, unknown>): string =>
{
    const block = Array.isArray(result["content"]) ? result["content"].find((each) => isRecord(each) && each["type"] === "text") : undefined;

    return isRecord(block) ? stringOf(block["text"]) : "";
};

/** 저장 한도를 사람이 쓰는 단위로. 한도를 모르면 `null` 이다 */
const sizeLabel = (bytes: number): string | null =>
{
    const scaled = (unit: number, name: string): string => `${Number.isInteger(bytes / unit) ? bytes / unit : (bytes / unit).toFixed(1)}${name}`;

    if (bytes <= 0)
    {
        return null;
    }

    return bytes >= 1_048_576 ? scaled(1_048_576, "MB") : bytes >= 1024 ? scaled(1024, "KB") : `${bytes}바이트`;
};

export const reduce = (state: AppState, event: AppEvent): AppState =>
{
    switch (event.type)
    {
        case "host-ready":
            return withContext({ ...state, abilities: abilitiesOf(event.capabilities) }, event.context);

        case "host-context-changed":
            return withContext(state, event.context);

        case "tool-input":
        {
            const file = fileOf(isRecord(event.arguments) ? event.arguments["file"] : undefined);

            return file === null || state.file?.resourceUri === file.resourceUri ? state : { ...state, file: openedFile(file) };
        }

        case "tool-result":
        {
            const result = isRecord(event.result) ? event.result : {};

            if (result["isError"] === true)
            {
                return { ...state, notice: firstText(result) || COPY.errors.load };
            }

            const view = viewOf(result["structuredContent"]);

            if (view === null)
            {
                return state;
            }

            const wanted = [view.selectedId, state.pendingNoteId, state.selectedId].find((noteId) => has(view, noteId ?? null)) ?? null;

            return {
                ...state,
                view,
                selectedId: wanted,
                pendingNoteId: null,
                file: view.file === null || state.file?.resourceUri === view.file.resourceUri ? state.file : openedFile(view.file),
                notice: null,
            };
        }

        case "note-selected":
            return { ...state, selectedId: has(state.view, event.noteId) ? event.noteId : null };

        case "context-attached":
            return { ...state, contextUpdateId: event.updateId };

        case "file-read":
            return withFile(state, (file) => ({ ...file, text: event.text, etag: event.etag, writable: event.writable, dirty: false, status: "ready" }));

        case "file-edited":
            return withFile(state, (file) => (file.writable ? { ...file, text: event.text, dirty: true, status: file.status === "conflict" ? "conflict" : "ready" } : file));

        case "file-saving":
            return withFile(state, (file) => ({ ...file, status: "saving" }));

        case "file-written":
            if (event.outcome === "saved")
            {
                return withFile({ ...state, notice: null }, (file) => ({ ...file, etag: event.etag, dirty: false, status: "saved" }));
            }

            if (event.outcome === "conflict")
            {
                // 판을 새것으로 바꾸지 않는다. 바꾸면 다음 저장이 남의 글을 덮는다. 다시 읽어야 새 판을 쥔다
                return withFile(state, (file) => ({ ...file, status: "conflict" }));
            }

            return withFile(
                { ...state, notice: COPY.file.tooLarge(sizeLabel(event.maxBytes)) },
                (file) => ({ ...file, status: "too-large" }),
            );

        case "file-save-failed":
            // 저장하는 중에서 풀어 준다. 풀지 않으면 저장 단추가 꺼진 채로 남아 다시 저장할 길이 없다
            return withFile({ ...state, notice: COPY.file.saveFailed }, (file) => ({ ...file, status: "ready" }));

        case "file-changed-outside":
            return withFile(state, (file) => (file.dirty ? { ...file, status: "conflict" } : file));

        case "file-failed":
            return withFile(state, (file) => ({ ...file, status: "failed" }));

        case "file-located":
            return withFile(state, (file) => ({ ...file, path: event.path }));

        case "notice":
            return { ...state, notice: event.text };
    }
};

/** 밖에서 파일이 바뀌었다는 알림이 왔을 때 곧바로 다시 읽어도 되는가. 고치던 글이 있으면 덮지 않는다 */
export const shouldReloadFile = (state: AppState, uri: string): boolean =>
    state.file !== null && state.file.resourceUri === uri && !state.file.dirty;

interface ContextBlock
{
    readonly type: "text";
    readonly text: string;
    readonly _meta?: Readonly<Record<string, unknown>>;
    readonly annotations?: { readonly audience: ReadonlyArray<"assistant" | "user"> };
}

export interface ModelContext
{
    readonly content?: ReadonlyArray<ContextBlock>;
    readonly structuredContent?: Readonly<Record<string, unknown>>;
}

/**
 * 고른 쪽지를 모델의 컨텍스트로. `ui/update-model-context` 의 인자다.
 *
 * - 첫 조각은 컴포저에 뗄 수 있는 첨부로 선다. 제목(`openai/title`)이 그 첨부의 이름이다.
 * - 둘째 조각은 모델만 읽는다(`audience: assistant`). 사람에게 보일 까닭이 없는 주소를 싣는다.
 * - `structuredContent` 는 화면이 다시 뜰 때 호스트가 돌려준다. 고른 쪽지를 그것으로 되찾는다.
 *
 * 부를 때마다 이 화면이 앞서 낸 컨텍스트를 통째로 갈아 끼운다. 그래서 고른 것을 풀 때는 빈 것을 보낸다.
 */
export const modelContextFor = (card: NoteCard | null): ModelContext =>
    (card === null
        ? { content: [] }
        : {
            content: [
                { type: "text", text: noteMarkdown(card), _meta: { "openai/title": card.title } },
                { type: "text", text: `사용자가 쪽지 목록에서 고른 쪽지의 주소는 ${noteUri(card.id)} 이다.`, annotations: { audience: ["assistant"] } },
            ],
            structuredContent: { noteId: card.id },
        });

export const selectedCard = (state: AppState): NoteCard | null =>
    state.view?.notes.find((card) => card.id === state.selectedId) ?? null;
