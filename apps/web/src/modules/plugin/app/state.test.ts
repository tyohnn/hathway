import { assert, describe, it } from "vitest";

import type { PluginView } from "../views";

import { abilitiesOf, INITIAL, modelContextFor, reduce, shouldReloadFile, type AppEvent, type AppState } from "./state";

const VIEW: PluginView = {
    page: "library",
    notes: [
        { id: "1", title: "공유 메모", body: "모두가 보는 것", visibility: "tenant", archived: false },
        { id: "2", title: "김의 비공개", body: "", visibility: "private", archived: false },
    ],
    preferences: { defaultVisibility: "tenant", showArchived: false },
    selectedId: null,
    file: null,
};

const FILE_VIEW: PluginView = { ...VIEW, page: "file", notes: [], file: { name: "메모.md", resourceUri: "host-resource://memo" } };

const after = (...events: ReadonlyArray<AppEvent>): AppState => events.reduce(reduce, INITIAL);

const result = (view: PluginView): AppEvent => ({ type: "tool-result", result: { structuredContent: view } });

describe("화면의 상태", () =>
{
    it("도구 결과가 오기 전에는 기다리는 얼굴이고, 처음 받은 결과로 그린다", () =>
    {
        assert.isNull(INITIAL.view);
        assert.deepStrictEqual(after(result(VIEW)).view, VIEW);
    });

    it("모양이 틀린 결과는 화면을 바꾸지 않는다. 호스트를 지나온 것도 밖에서 온 입력이다", () =>
    {
        const state = after(result(VIEW), { type: "tool-result", result: { structuredContent: { page: "library", notes: "없음" } } });

        assert.deepStrictEqual(state.view, VIEW);
        assert.deepStrictEqual(after({ type: "tool-result", result: { isError: true, content: [{ type: "text", text: "Claude 연결은 프로 요금제부터 쓸 수 있어요." }] } }).notice, "Claude 연결은 프로 요금제부터 쓸 수 있어요.");
    });

    it("도구가 펼쳐 두라고 한 쪽지를 펼친다", () =>
    {
        assert.strictEqual(after(result({ ...VIEW, selectedId: "2" })).selectedId, "2");
    });

    it("딥링크의 /notes/<id> 는 그 쪽지를 연다. 결과보다 먼저 와도 결과가 오면 연다", () =>
    {
        const linkFirst = after({ type: "host-ready", capabilities: {}, context: { "openai/deepLink": { url: "/notes/2" } } }, result(VIEW));
        const resultFirst = after(result(VIEW), { type: "host-context-changed", context: { "openai/deepLink": { url: "/notes/1" } } });

        assert.strictEqual(linkFirst.selectedId, "2");
        assert.strictEqual(resultFirst.selectedId, "1");
    });

    it("딥링크가 가리키는 쪽지가 목록에 없으면 목록에 머문다. 모르는 길도 목록으로 간다", () =>
    {
        assert.isNull(after({ type: "host-ready", capabilities: {}, context: { "openai/deepLink": { url: "/notes/999" } } }, result(VIEW)).selectedId);
        assert.isNull(after({ type: "host-ready", capabilities: {}, context: { "openai/deepLink": { url: "/settings" } } }, result(VIEW)).selectedId);
    });

    it("쪽지를 고르면 제목을 단 컨텍스트로 알린다. 모델만 읽는 조각에는 번호를 싣는다", () =>
    {
        const context = modelContextFor(VIEW.notes[0] ?? null);

        assert.deepStrictEqual(context.content?.[0], { type: "text", text: "# 공유 메모\n\n모두가 보는 것", _meta: { "openai/title": "공유 메모" } });
        assert.deepStrictEqual(context.content?.[1]?.annotations, { audience: ["assistant"] });
        assert.include(context.content?.[1]?.text ?? "", "note://1");
        assert.deepStrictEqual(context.structuredContent, { noteId: "1" });
    });

    it("고른 것을 풀면 빈 컨텍스트로 덮는다. 같은 화면이 낸 앞의 컨텍스트가 그대로 지워진다", () =>
    {
        assert.deepStrictEqual(modelContextFor(null), { content: [] });
    });

    it("호스트가 컨텍스트를 지우면 고른 표시를 푼다. 사람이 첨부를 떼면 화면도 따른다", () =>
    {
        const attached = after(result(VIEW), { type: "note-selected", noteId: "1" }, { type: "context-attached", updateId: "u1" });
        const cleared = reduce(attached, { type: "host-context-changed", context: { "openai/modelContext": null } });

        assert.deepStrictEqual([attached.selectedId, attached.contextUpdateId], ["1", "u1"]);
        assert.deepStrictEqual([cleared.selectedId, cleared.contextUpdateId], [null, null]);
    });

    it("다시 뜨면 붙어 있던 컨텍스트에서 고른 쪽지를 되찾는다", () =>
    {
        const remounted = after(
            { type: "host-ready", capabilities: {}, context: { "openai/modelContext": { updateId: "u9", structuredContent: { noteId: "2" } } } },
            result(VIEW),
        );

        assert.deepStrictEqual([remounted.selectedId, remounted.contextUpdateId], ["2", "u9"]);
    });

    it("호스트가 알리지 않은 능력의 단추는 서지 않는다", () =>
    {
        assert.deepStrictEqual(abilitiesOf({}), { message: false, newThread: false, modelContext: false, openFile: false, hostFiles: false });
        assert.deepStrictEqual(
            abilitiesOf({
                message: { text: {} },
                updateModelContext: { text: {} },
                experimental: { "openai/message": {}, "openai/modelContext": {}, "openai/files": {}, "openai/resource": {} },
            }),
            { message: true, newThread: true, modelContext: true, openFile: true, hostFiles: true },
        );
        // 새 대화로 보내기는 메시지를 보낼 수 있는 호스트에서만 뜻이 있다
        assert.isFalse(abilitiesOf({ experimental: { "openai/message": {} } }).newThread);
    });

    it("호스트의 맥락은 온 칸만 고친다. 테마만 바뀌어도 표시 방식을 잃지 않는다", () =>
    {
        const state = after(
            { type: "host-ready", capabilities: {}, context: { theme: "dark", displayMode: "inline", availableDisplayModes: ["inline", "fullscreen"] } },
            { type: "host-context-changed", context: { theme: "light" } },
        );

        assert.deepStrictEqual([state.theme, state.displayMode, state.canFullscreen], ["light", "inline", true]);
    });
});

describe("화면의 상태: 파일", () =>
{
    const opened = after(result(FILE_VIEW));

    it("파일 진입점의 결과가 오면 읽기를 기다리는 파일이 선다", () =>
    {
        assert.deepStrictEqual(opened.file, { name: "메모.md", resourceUri: "host-resource://memo", text: null, etag: null, writable: false, dirty: false, status: "loading", path: null });
    });

    it("도구의 인자로 먼저 온 파일도 같은 자리에 선다. 결과를 기다리지 않고 읽기 시작한다", () =>
    {
        const state = after({ type: "tool-input", arguments: { file: { name: "메모.md", resourceUri: "host-resource://memo" } } });

        assert.strictEqual(state.file?.resourceUri, "host-resource://memo");
    });

    it("호스트가 쓸 수 있다고 한 파일만 고칠 수 있다", () =>
    {
        const readOnly = reduce(opened, { type: "file-read", text: "글", etag: "v1", writable: false });
        const writable = reduce(opened, { type: "file-read", text: "글", etag: "v1", writable: true });

        assert.deepStrictEqual([readOnly.file?.writable, readOnly.file?.status, readOnly.file?.text], [false, "ready", "글"]);
        assert.isTrue(writable.file?.writable);
        assert.isFalse(reduce(readOnly, { type: "file-edited", text: "고친 글" }).file?.dirty);
        assert.isTrue(reduce(writable, { type: "file-edited", text: "고친 글" }).file?.dirty);
    });

    it("저장되면 새 판을 쥐고 고친 표시를 푼다", () =>
    {
        const edited = after(result(FILE_VIEW), { type: "file-read", text: "글", etag: "v1", writable: true }, { type: "file-edited", text: "고친 글" });
        const saved = reduce(edited, { type: "file-written", outcome: "saved", etag: "v2" });

        assert.deepStrictEqual([saved.file?.etag, saved.file?.dirty, saved.file?.status], ["v2", false, "saved"]);
    });

    it("판이 어긋난 파일은 덮어쓰지 않는다. 내 글과 옛 판을 둔 채로 알린다", () =>
    {
        const edited = after(result(FILE_VIEW), { type: "file-read", text: "글", etag: "v1", writable: true }, { type: "file-edited", text: "고친 글" });
        const conflicted = reduce(edited, { type: "file-written", outcome: "conflict", etag: "v3" });

        assert.deepStrictEqual([conflicted.file?.text, conflicted.file?.etag, conflicted.file?.dirty, conflicted.file?.status], ["고친 글", "v1", true, "conflict"]);
    });

    it("다시 읽으면 내 글을 버리고 지금의 판으로 선다", () =>
    {
        const conflicted = after(
            result(FILE_VIEW),
            { type: "file-read", text: "글", etag: "v1", writable: true },
            { type: "file-edited", text: "고친 글" },
            { type: "file-written", outcome: "conflict", etag: "v3" },
        );
        const reloaded = reduce(conflicted, { type: "file-read", text: "남이 고친 글", etag: "v3", writable: true });

        assert.deepStrictEqual([reloaded.file?.text, reloaded.file?.etag, reloaded.file?.dirty, reloaded.file?.status], ["남이 고친 글", "v3", false, "ready"]);
    });

    it("파일이 밖에서 바뀌면 고치던 중이 아닐 때만 다시 읽는다", () =>
    {
        const ready = after(result(FILE_VIEW), { type: "file-read", text: "글", etag: "v1", writable: true });
        const editing = reduce(ready, { type: "file-edited", text: "고친 글" });

        assert.isTrue(shouldReloadFile(ready, "host-resource://memo"));
        assert.isFalse(shouldReloadFile(editing, "host-resource://memo"));
        assert.isFalse(shouldReloadFile(ready, "host-resource://other"));
        assert.strictEqual(reduce(editing, { type: "file-changed-outside" }).file?.status, "conflict");
    });

    it("너무 큰 파일은 저장되지 않았다고 알리고 한도를 사람이 쓰는 단위로 적는다", () =>
    {
        const edited = after(result(FILE_VIEW), { type: "file-read", text: "글", etag: "v1", writable: true }, { type: "file-edited", text: "고친 글" });
        const refused = reduce(edited, { type: "file-written", outcome: "too-large", maxBytes: 1024 });
        const notice = (maxBytes: number): string | null => reduce(edited, { type: "file-written", outcome: "too-large", maxBytes }).notice;

        assert.deepStrictEqual([refused.file?.status, refused.file?.dirty, refused.notice], ["too-large", true, "파일이 너무 커서 저장하지 못했어요. 1KB까지 저장할 수 있어요."]);
        assert.include(notice(1_572_864) ?? "", "1.5MB까지");
        assert.include(notice(512) ?? "", "512바이트까지");
    });

    it("한도를 모르면 한도를 적지 않는다. 0 까지 저장할 수 있다고 말하지 않는다", () =>
    {
        const edited = after(result(FILE_VIEW), { type: "file-read", text: "글", etag: "v1", writable: true }, { type: "file-edited", text: "고친 글" });

        assert.strictEqual(reduce(edited, { type: "file-written", outcome: "too-large", maxBytes: 0 }).notice, "파일이 너무 커서 저장하지 못했어요.");
    });

    it("저장에 실패하면 저장하는 중에서 풀린다. 고친 글을 든 채로 다시 저장할 수 있다", () =>
    {
        const saving = after(result(FILE_VIEW), { type: "file-read", text: "글", etag: "v1", writable: true }, { type: "file-edited", text: "고친 글" }, { type: "file-saving" });
        const failed = reduce(saving, { type: "file-save-failed" });

        assert.strictEqual(saving.file?.status, "saving");
        assert.deepStrictEqual([failed.file?.status, failed.file?.dirty, failed.file?.text], ["ready", true, "고친 글"]);
        assert.strictEqual(failed.notice, "저장하지 못했어요. 잠시 뒤 다시 저장해 주세요.");
    });
});
