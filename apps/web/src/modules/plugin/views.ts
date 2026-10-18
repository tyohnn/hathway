import type { Note, NoteVisibility } from "@hathway/notes/domain/Note";
import type { Preferences } from "@hathway/preferences/domain/Preference";
import { VISIBILITY_VALUES } from "@hathway/preferences/rules/update";

import { NOTE_PREFIX, noteMarkdown, noteUri, VISIBILITY_LABELS } from "./shared";

export { noteMarkdown, noteUri, VISIBILITY_LABELS };

/**
 * 도구의 답과 화면에 싣는 모양. 순수 함수라 도커 없이 잰다(`views.test.ts`).
 *
 * ⚠ **실을 칸을 여기서 고른다.** 쪽지를 통째로 내보내지 않는다. 테넌트와 쓴 사람의 id 는 화면이 그리지 않아도 응답에
 *    실리면 밖으로 나간 것이다. 화면은 호스트 안의 iframe 이라 우리 브라우저 탭보다 멀다.
 * ⚠ **무엇이 보이는지는 여기서 정하지 않는다.** 받은 쪽지는 이미 유스케이스(`listNotes`)가 행 단위 판정으로 거른 것이다.
 *    여기서 하는 것은 설정에 따라 보관한 것을 접는 일과 모양을 줄이는 일뿐이다.
 */
export interface NoteCard
{
    readonly id: string;
    readonly title: string;
    readonly body: string;
    readonly visibility: NoteVisibility;
    readonly archived: boolean;
}

/** 화면 하나가 처음 그릴 때 받는 것. 도구의 `structuredContent` 로 간다 */
export interface PluginView
{
    readonly page: "library" | "tray" | "file";
    readonly notes: ReadonlyArray<NoteCard>;
    readonly preferences: Preferences;
    /** 펼쳐 둘 쪽지. 목록에 없으면 `null` 이다 */
    readonly selectedId: string | null;
    readonly file: { readonly name: string; readonly resourceUri: string } | null;
}

const cardOf = (note: Note): NoteCard => ({
    id: note.id,
    title: note.title,
    body: note.body,
    visibility: note.visibility,
    archived: note.status === "archived",
});

export const noteCards = (notes: ReadonlyArray<Note>, preferences: Preferences): ReadonlyArray<NoteCard> =>
    notes.filter((note) => preferences.showArchived || note.status === "active").map(cardOf);

/** `note://12` 에서 번호를 꺼낸다. 숫자가 아닌 것은 쪽지의 주소가 아니다 */
export const noteIdOf = (uri: string): string | null =>
{
    const id = uri.startsWith(NOTE_PREFIX) ? uri.slice(NOTE_PREFIX.length) : "";

    return /^\d+$/.test(id) ? id : null;
};

export const MENTION_LIMIT = 30;

export interface MentionItem
{
    readonly type: "resource_link";
    readonly uri: string;
    readonly name: string;
    readonly title: string;
    readonly mimeType: "text/markdown";
}

/**
 * 컴포저에서 `@` 로 찾는 쪽지. 고른 쪽지는 주소(`note://<id>`)로 메시지에 붙고, 호스트가 읽을 때 다시 판정을 지난다.
 *
 * ⚠ 보관한 쪽지는 싣지 않는다. 설정은 목록을 볼 때의 것이고, 대화에 새로 끌어올 때는 살아 있는 것만 고른다.
 */
export const mentionItems = (notes: ReadonlyArray<Note>, query: string): ReadonlyArray<MentionItem> =>
{
    const needle = query.trim().toLowerCase();

    return notes
        .filter((note) => note.status === "active" && note.title.toLowerCase().includes(needle))
        .slice(0, MENTION_LIMIT)
        .map((note) => ({ type: "resource_link", uri: noteUri(note.id), name: note.title, title: note.title, mimeType: "text/markdown" }));
};

/**
 * 구조화 설정의 모양. 호스트가 이 스키마를 읽어 제 모양의 토글과 선택 상자로 그린다.
 *
 * ⚠ **선택지는 값이 곧 화면의 글이다.** 설정의 스키마에는 선택지마다 따로 붙이는 이름이 없어서, `private` 을 그대로 보내면
 *    사람이 그 글자를 본다. 그래서 사람이 읽는 말(`VISIBILITY_LABELS`)을 보내고 돌아올 때 도메인의 어휘로 되돌린다.
 */
interface SettingField
{
    readonly type: "string" | "boolean";
    readonly title: string;
    readonly description?: string;
    readonly enum?: ReadonlyArray<string>;
}

type SettingsLayoutItem =
    | { readonly kind: "property"; readonly property: string }
    | { readonly kind: "tool"; readonly tool: string; readonly title: string; readonly description?: string };

export interface SettingsReadResult
{
    readonly schema: { readonly type: "object"; readonly properties: Readonly<Record<string, SettingField>> };
    readonly values: Readonly<Record<string, string | boolean>>;
    readonly layout?: ReadonlyArray<{ readonly kind: "group"; readonly title: string; readonly items: ReadonlyArray<SettingsLayoutItem> }>;
}

export const settingsValues = (preferences: Preferences): Readonly<Record<string, string | boolean>> => ({
    defaultVisibility: VISIBILITY_LABELS[preferences.defaultVisibility],
    showArchived: preferences.showArchived,
});

export const settingsReadResult = (preferences: Preferences): SettingsReadResult => ({
    schema: {
        type: "object",
        properties: {
            defaultVisibility: {
                type: "string",
                title: "기본 공개 범위",
                enum: VISIBILITY_VALUES.map((value) => VISIBILITY_LABELS[value]),
            },
            showArchived: { type: "boolean", title: "보관한 쪽지도 보기" },
        },
    },
    values: settingsValues(preferences),
    layout: [{
        kind: "group",
        title: "쪽지",
        items: [
            { kind: "property", property: "defaultVisibility" },
            { kind: "property", property: "showArchived" },
            { kind: "tool", tool: "open_library", title: "쪽지 보기" },
        ],
    }],
});

/** 호스트가 보낸 「바뀐 칸」을 도메인의 어휘로 되돌린다. 받을지는 `planPreferenceUpdate` 가 정한다 */
export const settingsChanges = (set: unknown): Record<string, unknown> =>
{
    if (typeof set !== "object" || set === null || Array.isArray(set))
    {
        return {};
    }

    return Object.fromEntries(Object.entries(set).map(([field, value]) =>
        [field, field === "defaultVisibility" ? (VISIBILITY_VALUES.find((known) => VISIBILITY_LABELS[known] === value) ?? value) : value]));
};
