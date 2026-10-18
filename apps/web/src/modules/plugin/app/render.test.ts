import { assert, describe, it } from "vitest";

import type { PluginView } from "../views";

import { render } from "./render";
import { INITIAL, reduce, type AppEvent, type AppState } from "./state";

const VIEW: PluginView = {
    page: "library",
    notes: [
        { id: "1", title: "공유 메모", body: "모두가 보는 것", visibility: "tenant", archived: false },
        { id: "2", title: "<img src=x onerror=alert(1)>", body: "</p><script>alert(2)</script>", visibility: "private", archived: true },
    ],
    preferences: { defaultVisibility: "private", showArchived: true },
    selectedId: null,
    file: null,
};

const after = (...events: ReadonlyArray<AppEvent>): AppState => events.reduce(reduce, INITIAL);
const shown = (view: PluginView): AppEvent => ({ type: "tool-result", result: { structuredContent: view } });
const ALL = { message: { text: {} }, updateModelContext: {}, experimental: { "openai/message": {}, "openai/files": {}, "openai/resource": {} } };
const FILE: PluginView = { ...VIEW, page: "file", notes: [], file: { name: "메모.md", resourceUri: "host-resource://memo" } };

describe("화면 그리기", () =>
{
    it("결과가 오기 전에는 기다리는 얼굴을 그린다", () =>
    {
        assert.include(render(INITIAL), "data-page=\"waiting\"");
    });

    it("쪽지의 글은 글자로만 그린다. 태그로 읽히지 않는다", () =>
    {
        const html = render(after(shown(VIEW), { type: "note-selected", noteId: "2" }));

        assert.notInclude(html, "<img");
        assert.notInclude(html, "<script>");
        assert.include(html, "&lt;img src=x onerror=alert(1)&gt;");
        assert.include(html, "&lt;/p&gt;&lt;script&gt;alert(2)&lt;/script&gt;");
    });

    it("기본값인 쪽지에는 배지를 달지 않는다. 비공개와 보관됨만 단다", () =>
    {
        const html = render(after(shown(VIEW)));

        assert.notInclude(html, "조직 전체</span>");
        assert.strictEqual(html.split("비공개</span>").length - 1, 1);
        assert.strictEqual(html.split("보관됨</span>").length - 1, 1);
    });

    it("읽기만 되는 파일에는 읽기 전용이 서고, 읽지 못한 파일에는 다시 불러오기가 선다", () =>
    {
        const readOnly = render(after(shown(FILE), { type: "file-read", text: "글", etag: "v1", writable: false }));
        const writable = render(after({ type: "host-ready", capabilities: ALL, context: {} }, shown(FILE), { type: "file-read", text: "글", etag: "v1", writable: true }));
        const failed = render(after(shown(FILE), { type: "file-failed" }));

        assert.include(readOnly, "읽기 전용");
        assert.notInclude(writable, "읽기 전용");
        assert.include(failed, "data-action=\"reload\"");
    });

    it("고른 쪽지는 눌린 것으로 알리고 본문을 펼친다", () =>
    {
        const html = render(after(shown(VIEW), { type: "note-selected", noteId: "1" }));

        assert.include(html, "data-id=\"1\" aria-pressed=\"true\"");
        assert.include(html, "data-id=\"2\" aria-pressed=\"false\"");
        assert.include(html, "모두가 보는 것");
    });

    it("호스트가 알리지 않은 능력의 단추는 서지 않는다", () =>
    {
        const bare = render(after(shown(VIEW), { type: "note-selected", noteId: "1" }));
        const full = render(after({ type: "host-ready", capabilities: ALL, context: {} }, shown(VIEW), { type: "note-selected", noteId: "1" }));

        assert.notInclude(bare, "data-action=\"message\"");
        assert.notInclude(bare, "data-action=\"message-new\"");
        assert.include(full, "data-action=\"message\"");
        assert.include(full, "data-action=\"message-new\"");
    });

    it("새 쪽지 폼의 공개 범위는 처음 값이 설정의 기본값이다", () =>
    {
        assert.include(render(after(shown(VIEW))), "<option value=\"private\" selected>");
        assert.include(render(after(shown({ ...VIEW, preferences: { defaultVisibility: "tenant", showArchived: false } }))), "<option value=\"tenant\" selected>");
    });

    it("크게 보기 단추는 호스트가 전체 화면을 받고 지금 대화 안에 떠 있을 때만 선다", () =>
    {
        const inline = { type: "host-ready", capabilities: {}, context: { displayMode: "inline", availableDisplayModes: ["inline", "fullscreen"] } } as const;
        const full = { type: "host-ready", capabilities: {}, context: { displayMode: "fullscreen", availableDisplayModes: ["inline", "fullscreen"] } } as const;

        assert.include(render(after(inline, shown(VIEW))), "data-action=\"fullscreen\"");
        assert.notInclude(render(after(full, shown(VIEW))), "data-action=\"fullscreen\"");
        assert.notInclude(render(after(shown(VIEW))), "data-action=\"fullscreen\"");
    });

    it("저장 단추는 쓸 수 있는 파일에만 서고, 고친 것이 없으면 꺼져 있다", () =>
    {
        const ready = { type: "host-ready", capabilities: ALL, context: {} } as const;
        const readOnly = render(after(ready, shown(FILE), { type: "file-read", text: "글", etag: "v1", writable: false }));
        const clean = render(after(ready, shown(FILE), { type: "file-read", text: "글", etag: "v1", writable: true }));
        const dirty = render(after(ready, shown(FILE), { type: "file-read", text: "글", etag: "v1", writable: true }, { type: "file-edited", text: "고친 글" }));

        assert.notInclude(readOnly, "data-action=\"save\"");
        assert.include(readOnly, "readonly");
        assert.include(clean, "data-action=\"save\" disabled");
        assert.include(dirty, "data-action=\"save\">");
    });

    it("판이 어긋나면 다시 불러오는 단추가 선다. 저장은 다시 불러올 때까지 꺼 둔다", () =>
    {
        const html = render(after(
            { type: "host-ready", capabilities: ALL, context: {} },
            shown(FILE),
            { type: "file-read", text: "글", etag: "v1", writable: true },
            { type: "file-edited", text: "고친 글" },
            { type: "file-written", outcome: "conflict", etag: "v3" },
        ));

        assert.include(html, "data-action=\"reload\"");
        assert.include(html, "data-action=\"save\" disabled");
    });

    it("원본 열기 단추는 호스트가 파일을 열어 줄 수 있을 때만 선다", () =>
    {
        const withFiles = render(after({ type: "host-ready", capabilities: ALL, context: {} }, shown(FILE), { type: "file-read", text: "글", etag: null, writable: false }));
        const without = render(after(shown(FILE), { type: "file-read", text: "글", etag: null, writable: false }));

        assert.include(withFiles, "data-action=\"reveal\"");
        assert.notInclude(without, "data-action=\"reveal\"");
    });
});
