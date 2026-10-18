import { VISIBILITY_LABELS } from "../shared";
import type { NoteCard } from "../views";

import { COPY } from "./copy";
import { selectedCard, type AppState, type FileState } from "./state";

/**
 * 상태를 HTML 글로 그린다. 순수 함수라 브라우저 없이 잰다(`render.test.ts`).
 *
 * 화면은 틀 없이 글로 그린다. 호스트가 화면 자원을 HTML 한 장으로 받아 iframe 에 띄우므로, 묶음이 작을수록 빨리 뜬다.
 * 단추마다 `data-action` 을 달고 `main.ts` 가 그 이름으로 일을 잇는다.
 *
 * ⚠ **쪽지의 글은 반드시 `escape` 를 지난다.** 제목과 본문은 사람이 적은 글이라 태그가 들어 있을 수 있다. 그대로 끼워 넣으면
 *    남이 쓴 쪽지가 이 화면에서 스크립트로 돈다.
 * ⚠ **호스트가 알리지 않은 능력의 단추는 그리지 않는다.** 눌러도 되지 않는 단추를 세우지 않는다. 받는 곳이 호스트마다 다르다
 *    (파일 · 멘션은 데스크톱에서만 된다).
 * ⚠ 사람이 적는 칸에는 `data-keep` 을 단다. 다시 그릴 때 `main.ts` 가 그 값을 옮겨 적던 글이 사라지지 않게 한다.
 */
export const escape = (value: string): string =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const button = (action: string, label: string, tone: "plain" | "quiet" = "plain"): string =>
    `<button type="button"${tone === "quiet" ? " class=\"quiet\"" : ""} data-action="${action}">${label}</button>`;

const badge = (label: string): string => `<span class="badge">${label}</span>`;

/** 기본값(조직 전체 · 살아 있음)에는 배지를 달지 않는다. 모든 줄이 같은 배지를 들면 소음이다 */
const badges = (card: NoteCard): string =>
    `${card.visibility === "private" ? badge(COPY.badges.private) : ""}${card.archived ? badge(COPY.badges.archived) : ""}`;

const row = (card: NoteCard, selected: boolean): string =>
    `<li><button type="button" class="row" data-action="select" data-id="${escape(card.id)}" aria-pressed="${selected}">`
    + `<span class="row-title">${escape(card.title)}</span>${badges(card)}</button></li>`;

const detail = (state: AppState): string =>
{
    const card = selectedCard(state);

    if (card === null)
    {
        return "";
    }

    const actions = [
        state.abilities.message ? button("message", COPY.actions.message) : "",
        state.abilities.newThread ? button("message-new", COPY.actions.messageNew) : "",
        button("deselect", COPY.actions.deselect, "quiet"),
    ].join("");

    return `<section class="detail"><h2>${escape(card.title)}</h2>`
        + `${card.body === "" ? "" : `<p class="body">${escape(card.body)}</p>`}`
        + `<div class="actions">${actions}</div></section>`;
};

const compose = (state: AppState): string =>
{
    const chosen = state.view?.preferences.defaultVisibility ?? "tenant";
    const options = (["private", "tenant"] as const)
        .map((value) => `<option value="${value}"${value === chosen ? " selected" : ""}>${VISIBILITY_LABELS[value]}</option>`)
        .join("");

    return "<form class=\"compose\" data-action=\"compose\">"
        + `<label>${COPY.labels.title}<input name="title" data-keep="title" maxlength="120" required></label>`
        + `<label>${COPY.labels.body}<textarea name="body" data-keep="body" rows="3"></textarea></label>`
        + `<label>${COPY.labels.visibility}<select name="visibility" data-keep="visibility">${options}</select></label>`
        + `<button type="submit">${COPY.actions.compose}</button></form>`;
};

const notice = (state: AppState): string =>
    (state.notice === null ? "" : `<p class="notice" role="status">${escape(state.notice)}</p>`);

const FILE_STATUS: Readonly<Record<FileState["status"], string>> = {
    loading: COPY.file.loading,
    ready: "",
    saving: COPY.file.saving,
    saved: COPY.file.saved,
    conflict: COPY.file.conflict,
    "too-large": "",
    failed: COPY.file.failed,
};

const filePage = (state: AppState, file: FileState): string =>
{
    const status = FILE_STATUS[file.status] || (file.dirty ? COPY.file.unsaved : "");
    const loaded = file.text !== null;
    const actions = [
        file.writable ? `<button type="button" data-action="save"${file.dirty && file.status !== "conflict" && file.status !== "saving" ? "" : " disabled"}>${COPY.actions.save}</button>` : "",
        file.status === "conflict" || file.status === "failed" ? button("reload", COPY.actions.reload) : "",
        loaded ? button("import", COPY.actions.import) : "",
        state.abilities.openFile ? button("reveal", COPY.actions.reveal, "quiet") : "",
    ].join("");

    return "<main class=\"app\" data-page=\"file\">"
        + `<header class="bar"><h1>${escape(file.name)}</h1>${loaded && !file.writable ? badge(COPY.badges.readOnly) : ""}</header>${notice(state)}`
        + `<p class="status" role="status">${escape(status)}</p>`
        + `<textarea class="editor" data-keep="editor" data-action="edit" aria-label="${COPY.labels.editor}"${file.writable ? "" : " readonly"}>${escape(file.text ?? "")}</textarea>`
        + `<div class="actions">${actions}</div></main>`;
};

export const render = (state: AppState): string =>
{
    if (state.file !== null && (state.view === null || state.view.page === "file"))
    {
        return filePage(state, state.file);
    }

    if (state.view === null)
    {
        return `<main class="app" data-page="waiting">${notice(state)}<p class="empty" role="status">${state.notice === null ? COPY.waiting : ""}</p></main>`;
    }

    const { view } = state;
    const page = view.page === "tray" ? "tray" : "library";
    const fullscreen = state.canFullscreen && state.displayMode === "inline"
        ? button("fullscreen", COPY.actions.fullscreen, "quiet")
        : "";
    const list = view.notes.length === 0
        ? `<p class="empty">${COPY.empty}</p>`
        : `<ul class="list">${view.notes.map((card) => row(card, card.id === state.selectedId)).join("")}</ul>`;

    return `<main class="app" data-page="${page}">`
        + `<header class="bar"><h1>${COPY.pages[page]}</h1>${fullscreen}</header>`
        + `${notice(state)}<div class="columns">${list}${detail(state)}</div>${compose(state)}</main>`;
};
