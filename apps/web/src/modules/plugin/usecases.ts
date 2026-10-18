import { Effect } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";
import { BODY_MAX } from "@hathway/notes/rules/draft";
import { DEFAULT_PREFERENCES, type DefaultVisibility, type Preferences } from "@hathway/preferences/domain/Preference";
import { PreferenceStore } from "@hathway/preferences/ports/PreferenceStore";
import { planPreferenceUpdate, VISIBILITY_VALUES } from "@hathway/preferences/rules/update";

import type { SurfaceCall, SurfaceOutcome, SurfaceRead } from "@/extensions/McpSurface";
import { createNote, listNotes, openNote } from "@/usecases/notes";

import { notePath, webDeepLink } from "./deepLink";
import { attachForm, composeForm, formAnswer, formRequest, formSupport, pickForm, type Form, type FormSupport } from "./forms";
import { FORM_TTL_MS, signState, verifyState } from "./requestState";
import { isUiResource, uiContents } from "./surface";
import {
    mentionItems,
    noteCards,
    noteIdOf,
    noteMarkdown,
    noteUri,
    settingsChanges,
    settingsReadResult,
    settingsValues,
    type NoteCard,
    type PluginView,
} from "./views";

/**
 * 플러그인의 도구와 자원의 조립. 라우트가 세운 행위자를 받아 코어의 유스케이스와 설정 저장소를 잇는다.
 *
 * ⚠ **쪽지는 코어의 유스케이스(`usecases/notes.ts`)로만 읽고 쓴다.** 쪽지 목록 · 서랍 · 멘션 · 폼의 선택지 · `note://` 자원이
 *    모두 `listNotes` 와 `openNote` 를 지난다. 여기서 저장소를 직접 불러 조건을 적으면 같은 판정이 두 곳에 살고, 밖에서
 *    붙은 세션에만 더 보이는 날이 온다(REQ-02).
 * ⚠ **폼의 답은 밖에서 온 입력이다.** 선택지에 없던 번호와 주소가 올 수 있다. 답을 믿지 않고 유스케이스로 다시 연다.
 * ⚠ **`requestState` 가 확인되지 않으면 아무것도 하지 않는다.** 폼을 받은 적 없는 요청이 답만 지어 보내는 길을 막는다
 *    (`requestState.ts`).
 * ⚠ **모델이 읽는 답에는 실을 것만 싣는다.** 화면이 그리지 않아도 응답에 실리면 밖으로 나간 것이다(`views.ts`).
 */
export interface PluginConfig
{
    /** 폼의 `requestState` 를 서명하는 비밀. 없으면 폼을 내지 않는다 */
    readonly stateSecret: string | null;
    /** 디렉터리에 올린 뒤에 아는 플러그인의 id. 있으면 답에 딥링크를 싣는다 */
    readonly pluginId: string | null;
    /** 화면 자원이 내주는 HTML 한 장 */
    readonly appHtml: string;
}

type Stores = NoteStore | PreferenceStore;

const text = (value: string): { readonly type: "text"; readonly text: string } => ({ type: "text", text: value });

const done = (result: Record<string, unknown>): SurfaceOutcome => ({ kind: "result", result });

const failed = (message: string): SurfaceOutcome => done({ content: [text(message)], isError: true });

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const stringOf = (value: unknown): string => (typeof value === "string" ? value : "");

const isVisibility = (value: unknown): value is DefaultVisibility => VISIBILITY_VALUES.some((known) => known === value);

const preferencesFor = (actor: Actor): Effect.Effect<Preferences, unknown, PreferenceStore> =>
    Effect.flatMap(PreferenceStore, (store) => store.find(actor)).pipe(Effect.map((found) => found ?? DEFAULT_PREFERENCES));

const viewFor = (
    actor: Actor,
    page: PluginView["page"],
    noteId: string | null = null,
): Effect.Effect<PluginView, unknown, Stores> =>
    Effect.gen(function*()
    {
        const preferences = yield* preferencesFor(actor);
        const notes = noteCards(yield* listNotes(actor), preferences);

        return {
            page,
            notes,
            preferences,
            // 펼칠 쪽지는 목록에 있는 것만 받는다. 볼 수 없는 번호를 주면 목록만 선다
            selectedId: notes.some((card) => card.id === noteId) ? noteId : null,
            file: null,
        };
    });

/** 대화에 끌어올 수 있는 쪽지. 보관한 것은 설정과 상관없이 뺀다 */
const pickable = (actor: Actor): Effect.Effect<ReadonlyArray<NoteCard>, unknown, NoteStore> =>
    Effect.map(listNotes(actor), (notes) => noteCards(notes, { ...DEFAULT_PREFERENCES, showArchived: false }));

interface FormPrompt
{
    readonly message: string;
    readonly form: Form;
    /** 폼을 띄우지 못하는 클라이언트에서 폼 대신 내는 글 */
    readonly fallback: string;
    /** 사람이 폼을 닫았을 때의 답 */
    readonly dismissed: string;
    /** 폼을 낼 것이 없을 때의 답. 고를 쪽지가 하나도 없으면 빈 폼을 내지 않는다 */
    readonly nothing: string | null;
}

/** 사람이 실제로 만나는 까닭은 폼을 오래 열어 둔 것이다. 고친 상태와 남의 상태도 같은 글로 답해 까닭을 가르지 않는다 */
const FORM_REFUSED = "시간이 지나 받지 못했어요. 다시 요청해 주세요.";

const NOTHING_TO_PICK = "고를 수 있는 쪽지가 없어요.";

/**
 * 폼으로 되묻는 도구의 뼈대. 처음 부르면 폼을 내고, 답과 서명된 상태가 함께 돌아오면 뒤를 잇는다.
 */
const withForm = (
    call: SurfaceCall,
    config: PluginConfig,
    prompt: (support: FormSupport) => Effect.Effect<FormPrompt, unknown, Stores>,
    accepted: (content: Readonly<Record<string, unknown>>) => Effect.Effect<SurfaceOutcome, unknown, Stores>,
): Effect.Effect<SurfaceOutcome, unknown, Stores> =>
    Effect.gen(function*()
    {
        const secret = config.stateSecret;
        const support = secret === null ? "none" : formSupport(call.client);
        const asked = yield* prompt(support);

        if (asked.nothing !== null)
        {
            return done({ content: [text(asked.nothing)], isError: false });
        }

        if (secret === null || support === "none")
        {
            return done({ content: [text(asked.fallback)], isError: false });
        }

        const sub = `${call.actor.tenantId}:${call.actor.accountId}`;
        const answer = formAnswer(call.inputResponses);

        if (call.requestState === null || answer === null)
        {
            return {
                kind: "input-required",
                inputRequests: formRequest(support, asked.message, asked.form),
                requestState: signState(secret, { sub, tool: call.name, exp: call.now.getTime() + FORM_TTL_MS }),
            } as const;
        }

        if (verifyState(secret, call.requestState, { sub, tool: call.name, now: call.now.getTime() }) !== "ok")
        {
            return failed(FORM_REFUSED);
        }

        if (answer.action !== "accept")
        {
            return done({ content: [text(asked.dismissed)], structuredContent: { selection: answer.action }, isError: false });
        }

        return yield* accepted(answer.content);
    });

/**
 * 폼 대신 글로 낼 때의 선택지. 번호를 함께 적는다. 폼을 모르는 클라이언트는 글만 모델에게 넘기므로, 번호가 글에 없으면
 * 모델이 고른 쪽지를 도구에 넘길 길이 없다.
 */
const listLines = (cards: ReadonlyArray<NoteCard>): string => cards.map((card) => `- ${card.title} (${card.id}번)`).join("\n");

const pickNote = (call: SurfaceCall, config: PluginConfig): Effect.Effect<SurfaceOutcome, unknown, Stores> =>
    withForm(
        call,
        config,
        (support) => Effect.map(pickable(call.actor), (cards) => ({
            message: "어느 쪽지를 볼까요?",
            form: pickForm(cards, support),
            fallback: `어느 쪽지를 볼까요?\n${listLines(cards)}`,
            dismissed: "쪽지를 고르지 않았어요.",
            nothing: cards.length === 0 ? NOTHING_TO_PICK : null,
        })),
        (content) => Effect.gen(function*()
        {
            const note = yield* openNote(call.actor, stringOf(content["note"]));

            if (note === null || note.status !== "active")
            {
                return failed("그사이 쪽지가 바뀌었어요. 다시 골라 주세요.");
            }

            return done({
                content: [text(noteMarkdown(note))],
                structuredContent: yield* viewFor(call.actor, "library", note.id),
                isError: false,
            });
        }),
    );

const composeNote = (call: SurfaceCall, config: PluginConfig): Effect.Effect<SurfaceOutcome, unknown, Stores> =>
    withForm(
        call,
        config,
        (support) => Effect.map(preferencesFor(call.actor), (preferences) => ({
            message: "새 쪽지",
            form: composeForm(preferences, support),
            fallback: "제목과 내용을 알려 주세요.",
            dismissed: "쪽지를 쓰지 않았어요.",
            nothing: null,
        })),
        (content) => Effect.gen(function*()
        {
            const preferences = yield* preferencesFor(call.actor);
            const title = stringOf(content["title"]);
            const created = yield* createNote(call.actor, {
                title,
                body: stringOf(content["body"]),
                visibility: isVisibility(content["visibility"]) ? content["visibility"] : preferences.defaultVisibility,
            });

            if (!created.ok)
            {
                return failed(created.message);
            }

            const link = config.pluginId === null ? "" : `\n쪽지 열기: ${webDeepLink({ pluginId: config.pluginId, path: notePath(created.noteId) })}`;

            return done({ content: [text(`쪽지를 썼어요: ${title.trim()}${link}`)], structuredContent: { noteId: created.noteId }, isError: false });
        }),
    );

const STALE_CHOICE = "그사이 바뀐 쪽지가 있어요. 다시 골라 주세요.";

const attachNotes = (call: SurfaceCall, config: PluginConfig): Effect.Effect<SurfaceOutcome, unknown, Stores> =>
    withForm(
        call,
        config,
        (support) => Effect.map(pickable(call.actor), (cards) => ({
            message: "대화에 붙일 쪽지를 골라 주세요.",
            form: attachForm(cards, support),
            fallback: `대화에 붙일 쪽지를 알려 주세요.\n${listLines(cards)}`,
            dismissed: "쪽지를 고르지 않았어요.",
            nothing: cards.length === 0 ? NOTHING_TO_PICK : null,
        })),
        (content) => Effect.gen(function*()
        {
            const uris = Array.isArray(content["notes"]) ? content["notes"].map(stringOf) : [];
            const ids = uris.map(noteIdOf);

            if (ids.length === 0)
            {
                return failed("쪽지를 고르지 않았어요.");
            }

            if (ids.some((id) => id === null))
            {
                return failed(STALE_CHOICE);
            }

            const notes = yield* Effect.all(ids.map((id) => openNote(call.actor, id ?? "")));
            const readable = notes.flatMap((note) => (note === null || note.status !== "active" ? [] : [note]));

            if (readable.length !== notes.length)
            {
                return failed(STALE_CHOICE);
            }

            return done({
                content: [
                    text(`쪽지 ${readable.length}개를 대화에 붙였어요.`),
                    ...readable.map((note) => ({ type: "resource", resource: { uri: noteUri(note.id), mimeType: "text/markdown", text: noteMarkdown(note) } })),
                ],
                isError: false,
            });
        }),
    );

const updateSettings = (call: SurfaceCall): Effect.Effect<SurfaceOutcome, unknown, Stores> =>
    Effect.gen(function*()
    {
        const verdict = planPreferenceUpdate(settingsChanges(call.args["set"]));

        if (verdict._tag === "Rejected")
        {
            // 까닭을 가르지 않는다. 스위치를 누른 사람에게 「모르는 칸」과 「어휘 밖의 값」은 뜻이 없다
            return failed("설정을 바꾸지 못했어요.");
        }

        const next = yield* Effect.flatMap(PreferenceStore, (store) => store.apply(call.actor, verdict.changes));

        return done({ content: [], structuredContent: { values: settingsValues(next) }, isError: false });
    });

const IMPORT_FAILED = "쪽지로 가져오지 못했어요.";

const importFile = (call: SurfaceCall): Effect.Effect<SurfaceOutcome, unknown, Stores> =>
    Effect.gen(function*()
    {
        const { name, text: body } = call.args;

        if (typeof name !== "string" || typeof body !== "string")
        {
            return failed(IMPORT_FAILED);
        }

        const preferences = yield* preferencesFor(call.actor);
        // 마지막 확장자만 뗀다. `회의록.2026.md` 는 `회의록.2026` 이다
        const title = name.replace(/\.[^./\\]+$/, "");
        const created = yield* createNote(call.actor, { title, body, visibility: preferences.defaultVisibility });

        if (created.ok)
        {
            return done({ content: [text(`쪽지로 가져왔어요: ${title.trim()}`)], structuredContent: { noteId: created.noteId }, isError: false });
        }

        // 판정의 글은 폼의 칸을 가리킨다(「제목을 적어 주세요」). 이 화면에는 그 칸이 없으므로 파일의 말로 바꾼다
        return failed(created.field === "body"
            ? `파일이 너무 길어서 가져오지 못했어요. 쪽지는 ${BODY_MAX.toLocaleString("ko-KR")}자까지 담을 수 있어요.`
            : created.field === "title" ? "파일 이름이 비었거나 너무 길어서 가져오지 못했어요." : IMPORT_FAILED);
    });

/**
 * 연 파일이 사용자의 컴퓨터 어디에 있는지 화면에 돌려준다. 화면이 그 자리로 호스트에게 「원본 열기」를 청한다.
 *
 * ⚠ **자리는 호스트가 호출에 얹은 것(`_meta`)만 쓴다.** 화면은 믿을 수 없는 스크립트가 돌 수 있는 자리라 호스트가 경로를
 *    화면에 직접 주지 않고, 파일 진입점에서 나간 도구 호출에만 얹어 서버로 보낸다. 인자로 받으면 화면이 아무 경로나 넣는다.
 * ⚠ **적어 두지 않는다.** 경로에는 사용자의 계정 이름과 폴더가 들어 있다. 돌려주기만 하고 저장하거나 로그로 남기지 않는다.
 */
const revealFilePath = (call: SurfaceCall): SurfaceOutcome =>
{
    const resource = call.meta["openai/resource"];
    const path = isRecord(resource) ? stringOf(resource["path"]) : "";

    return path === ""
        ? failed("파일을 열지 못했어요.")
        : done({ content: [], structuredContent: { path }, isError: false });
};

const openFile = (call: SurfaceCall): Effect.Effect<SurfaceOutcome, unknown, Stores> =>
    Effect.gen(function*()
    {
        const file = isRecord(call.args["file"]) ? call.args["file"] : {};
        const name = stringOf(file["name"]);
        const resourceUri = stringOf(file["resourceUri"]);

        if (name === "" || resourceUri.trim() === "")
        {
            return failed("파일을 열지 못했어요.");
        }

        const view: PluginView = { page: "file", notes: [], preferences: yield* preferencesFor(call.actor), selectedId: null, file: { name, resourceUri } };

        return done({ content: [text(`${name} 파일을 열었어요.`)], structuredContent: view, isError: false });
    });

const openNotes = (call: SurfaceCall, page: "library" | "tray"): Effect.Effect<SurfaceOutcome, unknown, Stores> =>
    Effect.map(viewFor(call.actor, page, typeof call.args["noteId"] === "string" ? call.args["noteId"] : null), (view) =>
        done({ content: [text(view.notes.length === 0 ? "아직 쪽지가 없어요." : `쪽지 ${view.notes.length}개를 열었어요.`)], structuredContent: view, isError: false }));

export const callTool = (call: SurfaceCall, config: PluginConfig): Effect.Effect<SurfaceOutcome, unknown, Stores> =>
{
    switch (call.name)
    {
        case "open_library":
            return openNotes(call, "library");

        case "open_tray":
            return openNotes(call, "tray");

        case "open_file":
            return openFile(call);

        case "read_settings":
            return Effect.map(preferencesFor(call.actor), (preferences) =>
                done({ content: [], structuredContent: settingsReadResult(preferences), isError: false }));

        case "update_settings":
            return updateSettings(call);

        case "search_mentions":
            return Effect.map(listNotes(call.actor), (notes) =>
                done({ content: [], structuredContent: { items: mentionItems(notes, stringOf(call.args["query"])) }, isError: false }));

        case "pick_note":
            return pickNote(call, config);

        case "compose_note":
            return composeNote(call, config);

        case "attach_notes":
            return attachNotes(call, config);

        case "import_file":
            return importFile(call);

        case "reveal_file_path":
            return Effect.succeed(revealFilePath(call));

        default:
            return Effect.succeed(failed(`모르는 도구다: ${call.name}`)); // ux-writing: 봉투가 걸러서 닿지 않는 자리의 프로토콜 오류
    }
};

/**
 * 자원을 읽는다. 화면 자원은 누구에게나 같은 틀이고, 쪽지는 행 단위 판정을 지난 것만 온다.
 *
 * 볼 수 없는 쪽지와 없는 쪽지를 가르지 않고 `null` 로 답한다(INV-NOTE-02).
 */
export const readResource = (
    read: SurfaceRead,
    config: PluginConfig,
): Effect.Effect<ReadonlyArray<Record<string, unknown>> | null, unknown, NoteStore> =>
{
    if (isUiResource(read.uri))
    {
        return Effect.succeed(uiContents(read.uri, config.appHtml));
    }

    const noteId = noteIdOf(read.uri);

    return noteId === null
        ? Effect.succeed(null)
        : Effect.map(openNote(read.actor, noteId), (note) =>
            (note === null ? null : [{ uri: read.uri, mimeType: "text/markdown", text: noteMarkdown(note) }]));
};
