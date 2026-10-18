import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import { customerActor, otherCustomerActor } from "@hathway/access/testing/actor";
import type { Note } from "@hathway/notes/domain/Note";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";
import { noteStoreMemory } from "@hathway/notes/testing/noteStoreMemory";
import type { PreferenceStore } from "@hathway/preferences/ports/PreferenceStore";
import { preferenceStoreMemory } from "@hathway/preferences/testing/preferenceStoreMemory";

import type { SurfaceCall, SurfaceOutcome } from "@/extensions/McpSurface";
import type { McpClient } from "@/lib/mcp";
import { listNotes } from "@/usecases/notes";

import { FORM_TTL_MS, signState } from "./requestState";
import { UI_LIBRARY } from "./surface";
import { callTool, readResource, type PluginConfig } from "./usecases";

/**
 * 플러그인의 도구와 자원. 메모리 저장소로 도커 없이 잰다.
 *
 * ⚠ 판정 규칙 자체는 `packages/notes` 와 `packages/preferences` 가 잰다. 여기서 보는 것은 **새로 생긴 자리(보관함 ·
 *    서랍 · 멘션 · 폼 · 자원)가 그 판정을 건너뛰지 않는가**다.
 */
const note = (id: number, over: Partial<Note>): Note => ({
    id: String(id),
    tenantId: "2",
    authorId: "2",
    title: "",
    body: "",
    visibility: "tenant",
    status: "active",
    version: 1,
    createdAt: "2026-10-02T00:00:00.000Z",
    ...over,
});

const SEED: ReadonlyArray<Note> = [
    note(1, { title: "공유 메모", body: "모두가 보는 것" }),
    note(2, { title: "김의 비공개", visibility: "private" }),
    note(3, { title: "이의 비공개", authorId: "3", visibility: "private" }),
    note(4, { title: "고객사 B 공개", tenantId: "3", authorId: "4" }),
    note(5, { title: "보관한 것", authorId: "3", status: "archived" }),
];

const SECRET = "검사용 비밀";
const CONFIG: PluginConfig = { stateSecret: SECRET, pluginId: null, appHtml: "<!doctype html><title>틀</title>" };
const NOW = new Date("2026-10-02T03:00:00.000Z");
const OPENAI: McpClient = { modern: true, capabilities: { extensions: { "openai/elicitation": { form: {} } } } };
const LEGACY: McpClient = { modern: false, capabilities: {} };

const kim = customerActor("2");
const lee = customerActor("3");
const park = otherCustomerActor("4");

const call = (actor: Actor, name: string, args: Record<string, unknown> = {}, more: Partial<SurfaceCall> = {}): SurfaceCall => ({
    actor,
    name,
    args,
    meta: {},
    client: OPENAI,
    inputResponses: null,
    requestState: null,
    now: NOW,
    ...more,
});

const run = <A>(program: Effect.Effect<A, unknown, NoteStore | PreferenceStore>) =>
    Effect.gen(function*()
    {
        const layer = Layer.mergeAll(yield* noteStoreMemory(SEED), yield* preferenceStoreMemory());

        return yield* program.pipe(Effect.provide(layer));
    });

const structured = (outcome: SurfaceOutcome): Record<string, unknown> =>
    (outcome.kind === "result" ? outcome.result["structuredContent"] ?? {} : {}) as Record<string, unknown>;

const isError = (outcome: SurfaceOutcome): boolean => outcome.kind === "result" && outcome.result["isError"] === true;

const titles = (outcome: SurfaceOutcome): ReadonlyArray<string> =>
    ((structured(outcome)["notes"] ?? []) as ReadonlyArray<{ title: string }>).map((card) => card.title);

/** 폼이 낸 선택지의 이름. 고르는 폼은 `oneOf`, 참고할 쪽지 폼은 자원의 목록이다 */
const offered = (outcome: SurfaceOutcome): ReadonlyArray<string> =>
{
    if (outcome.kind !== "input-required")
    {
        return [];
    }

    const text = JSON.stringify(outcome.inputRequests);

    return SEED.map((seeded) => seeded.title).filter((title) => text.includes(title));
};

/** 폼을 받고 답을 실어 다시 부른다. 클라이언트가 하는 왕복 그대로다 */
const answer = (actor: Actor, name: string, response: Record<string, unknown>) =>
    Effect.gen(function*()
    {
        const first = yield* callTool(call(actor, name), CONFIG);

        assert.strictEqual(first.kind, "input-required");

        return yield* callTool(call(actor, name, {}, {
            inputResponses: { form: response },
            requestState: first.kind === "input-required" ? first.requestState : null,
        }), CONFIG);
    });

describe("플러그인의 도구: 행 단위", () =>
{
    it.effect("INV-NOTE-01 보관함 · 서랍 · 멘션 · 폼의 선택지에 남의 비공개 쪽지가 없다. 네 자리가 같은 유스케이스를 지난다", () =>
        run(Effect.gen(function*()
        {
            const expected = (yield* listNotes(kim)).filter((each) => each.status === "active").map((each) => each.title).slice().sort();
            const mentions = structured(yield* callTool(call(kim, "search_mentions", { query: "" }), CONFIG))["items"] as ReadonlyArray<{ title: string }>;

            assert.deepStrictEqual(expected, ["공유 메모", "김의 비공개"]);
            assert.deepStrictEqual(titles(yield* callTool(call(kim, "open_library"), CONFIG)).slice().sort(), expected);
            assert.deepStrictEqual(titles(yield* callTool(call(kim, "open_tray"), CONFIG)).slice().sort(), expected);
            assert.deepStrictEqual(mentions.map((item) => item.title).slice().sort(), expected);
            assert.deepStrictEqual(offered(yield* callTool(call(kim, "pick_note"), CONFIG)).slice().sort(), expected);
            assert.deepStrictEqual(offered(yield* callTool(call(kim, "attach_notes"), CONFIG)).slice().sort(), expected);
        })));

    it.effect("다른 테넌트의 쪽지는 공개여도 어느 자리에도 실리지 않는다", () =>
        run(Effect.gen(function*()
        {
            assert.deepStrictEqual(titles(yield* callTool(call(park, "open_library"), CONFIG)), ["고객사 B 공개"]);
            assert.deepStrictEqual(offered(yield* callTool(call(park, "pick_note"), CONFIG)), ["고객사 B 공개"]);
            assert.notInclude(titles(yield* callTool(call(lee, "open_tray"), CONFIG)), "고객사 B 공개");
        })));

    it.effect("INV-NOTE-02 볼 수 없는 쪽지의 note:// 자원은 없는 것으로 답한다", () =>
        run(Effect.gen(function*()
        {
            const mine = yield* readResource({ actor: kim, uri: "note://2" }, CONFIG);

            assert.deepStrictEqual(mine, [{ uri: "note://2", mimeType: "text/markdown", text: "# 김의 비공개" }]);
            assert.isNull(yield* readResource({ actor: lee, uri: "note://2" }, CONFIG));
            assert.isNull(yield* readResource({ actor: kim, uri: "note://4" }, CONFIG));
            assert.isNull(yield* readResource({ actor: kim, uri: "note://999" }, CONFIG));
            assert.isNull(yield* readResource({ actor: kim, uri: "note://2/../3" }, CONFIG));
        })));

    it.effect("화면 자원은 누가 읽어도 같은 틀이다. 쪽지가 들어 있지 않다", () =>
        run(Effect.gen(function*()
        {
            const forKim = yield* readResource({ actor: kim, uri: UI_LIBRARY }, CONFIG);
            const forPark = yield* readResource({ actor: park, uri: UI_LIBRARY }, CONFIG);

            assert.strictEqual(forKim?.[0]?.["text"], CONFIG.appHtml);
            assert.deepStrictEqual(forKim, forPark);
        })));

    it.effect("보관함에 펼쳐 달라고 한 쪽지가 볼 수 없는 것이면 펼치지 않는다. 목록에 있는 것만 펼친다", () =>
        run(Effect.gen(function*()
        {
            assert.strictEqual(structured(yield* callTool(call(kim, "open_library", { noteId: "2" }), CONFIG))["selectedId"], "2");
            assert.isNull(structured(yield* callTool(call(kim, "open_library", { noteId: "3" }), CONFIG))["selectedId"]);
        })));

    it.effect("모르는 도구는 오류로 답한다", () =>
        run(Effect.gen(function*()
        {
            assert.isTrue(isError(yield* callTool(call(kim, "drop_table"), CONFIG)));
        })));
});

describe("플러그인의 도구: 설정", () =>
{
    it.effect("설정을 읽으면 모든 칸에 값이 있다. 고른 적 없는 칸은 기본값이다", () =>
        run(Effect.gen(function*()
        {
            const read = structured(yield* callTool(call(kim, "read_settings"), CONFIG));

            assert.deepStrictEqual(read["values"], { defaultVisibility: "조직 전체", showArchived: false });
        })));

    it.effect("바뀐 칸만 받아 고치고 나머지는 그대로 돌려준다", () =>
        run(Effect.gen(function*()
        {
            yield* callTool(call(kim, "update_settings", { set: { defaultVisibility: "나만" } }), CONFIG);

            const updated = structured(yield* callTool(call(kim, "update_settings", { set: { showArchived: true } }), CONFIG));

            assert.deepStrictEqual(updated, { values: { defaultVisibility: "나만", showArchived: true } });
            assert.deepStrictEqual(structured(yield* callTool(call(kim, "read_settings"), CONFIG))["values"], updated["values"]);
        })));

    it.effect("INV-PREFERENCE-02 모르는 칸이나 어휘 밖의 값은 고치지 않고 오류로 답한다", () =>
        run(Effect.gen(function*()
        {
            const refusals = yield* Effect.all([
                callTool(call(kim, "update_settings", { set: { defaultVisibility: "모두에게" } }), CONFIG),
                callTool(call(kim, "update_settings", { set: { showArchived: true, tenantId: "3" } }), CONFIG),
                callTool(call(kim, "update_settings", { set: {} }), CONFIG),
                callTool(call(kim, "update_settings", {}), CONFIG),
            ]);

            assert.deepStrictEqual(refusals.map(isError), [true, true, true, true]);
            assert.deepStrictEqual(structured(yield* callTool(call(kim, "read_settings"), CONFIG))["values"], { defaultVisibility: "조직 전체", showArchived: false });
        })));

    it.effect("INV-PREFERENCE-01 설정은 자기 것만 읽고 쓴다. 같은 조직의 다른 사람의 설정에 닿지 못한다", () =>
        run(Effect.gen(function*()
        {
            yield* callTool(call(kim, "update_settings", { set: { showArchived: true, accountId: "3" } }), CONFIG);
            yield* callTool(call(kim, "update_settings", { set: { showArchived: true } }), CONFIG);

            assert.deepStrictEqual(structured(yield* callTool(call(lee, "read_settings"), CONFIG))["values"], { defaultVisibility: "조직 전체", showArchived: false });
        })));

    it.effect("보관한 쪽지는 설정을 켠 사람의 보관함에만 실린다", () =>
        run(Effect.gen(function*()
        {
            assert.notInclude(titles(yield* callTool(call(kim, "open_library"), CONFIG)), "보관한 것");

            yield* callTool(call(kim, "update_settings", { set: { showArchived: true } }), CONFIG);

            assert.include(titles(yield* callTool(call(kim, "open_library"), CONFIG)), "보관한 것");
            assert.notInclude(titles(yield* callTool(call(lee, "open_library"), CONFIG)), "보관한 것");
        })));
});

describe("플러그인의 도구: 폼", () =>
{
    it.effect("답이 없으면 input_required 로 폼을 청한다", () =>
        run(Effect.gen(function*()
        {
            const first = yield* callTool(call(kim, "pick_note"), CONFIG);
            const request = first.kind === "input-required" ? first.inputRequests["form"] as { method: string; params: { mode: string } } : null;

            assert.strictEqual(request?.method, "openai/elicitation/create");
            assert.strictEqual(request?.params.mode, "form");
            assert.notStrictEqual(first.kind === "input-required" ? first.requestState : "", "");
        })));

    it.effect("답을 싣고 다시 오면 고른 쪽지로 끝낸다", () =>
        run(Effect.gen(function*()
        {
            const picked = yield* answer(kim, "pick_note", { action: "accept", content: { note: "2" } });

            assert.isFalse(isError(picked));
            assert.strictEqual(structured(picked)["selectedId"], "2");
            assert.strictEqual(structured(picked)["page"], "library");
        })));

    it.effect("취소하거나 거절하면 아무것도 하지 않고 그 사실을 답한다", () =>
        run(Effect.gen(function*()
        {
            const before = (yield* listNotes(kim)).length;
            const declined = yield* answer(kim, "compose_note", { action: "decline" });
            const cancelled = yield* answer(kim, "compose_note", { action: "cancel" });

            assert.deepStrictEqual([structured(declined)["selection"], structured(cancelled)["selection"]], ["decline", "cancel"]);
            assert.isFalse(isError(declined));
            assert.strictEqual((yield* listNotes(kim)).length, before);
        })));

    it.effect("고쳤거나 남의 것이거나 기한이 지난 requestState 로는 아무것도 하지 않는다", () =>
        run(Effect.gen(function*()
        {
            const before = (yield* listNotes(kim)).length;
            const accept = { form: { action: "accept", content: { title: "몰래 쓰기" } } };
            const exp = NOW.getTime() + FORM_TTL_MS;
            const states = [
                `${signState(SECRET, { sub: "2:2", tool: "compose_note", exp })}x`,
                signState(SECRET, { sub: "2:3", tool: "compose_note", exp }),
                signState(SECRET, { sub: "2:2", tool: "pick_note", exp }),
                signState(SECRET, { sub: "2:2", tool: "compose_note", exp: NOW.getTime() - 1 }),
            ];

            for (const requestState of states)
            {
                assert.isTrue(isError(yield* callTool(call(kim, "compose_note", {}, { inputResponses: accept, requestState }), CONFIG)), requestState);
            }

            assert.strictEqual((yield* listNotes(kim)).length, before);
        })));

    it.effect("requestState 없이 답만 싣고 오면 폼을 다시 낸다. 폼을 받은 적 없는 요청의 답은 답이 아니다", () =>
        run(Effect.gen(function*()
        {
            const before = (yield* listNotes(kim)).length;
            const outcome = yield* callTool(call(kim, "compose_note", {}, { inputResponses: { form: { action: "accept", content: { title: "몰래 쓰기" } } } }), CONFIG);

            assert.strictEqual(outcome.kind, "input-required");
            assert.strictEqual((yield* listNotes(kim)).length, before);
        })));

    it.effect("선택지 밖의 쪽지를 답으로 보내면 받지 않는다. 폼의 답도 밖에서 온 입력이다", () =>
        run(Effect.gen(function*()
        {
            const picked = yield* answer(kim, "pick_note", { action: "accept", content: { note: "3" } });
            const attached = yield* answer(kim, "attach_notes", { action: "accept", content: { notes: ["note://1", "note://4"] } });
            const uploaded = yield* answer(kim, "attach_notes", { action: "accept", content: { notes: ["file:///etc/passwd"] } });

            assert.deepStrictEqual([picked, attached, uploaded].map(isError), [true, true, true]);
            assert.notInclude(JSON.stringify([picked, attached]), "이의 비공개");
            assert.notInclude(JSON.stringify([picked, attached]), "고객사 B 공개");
        })));

    it.effect("참고할 쪽지를 고르면 고른 쪽지의 글이 모델에게 간다", () =>
        run(Effect.gen(function*()
        {
            const attached = yield* answer(kim, "attach_notes", { action: "accept", content: { notes: ["note://1", "note://2"] } });
            const content = attached.kind === "result" ? attached.result["content"] as ReadonlyArray<{ type: string; resource?: { uri: string; text: string } }> : [];

            assert.deepStrictEqual(content.filter((block) => block.type === "resource").map((block) => block.resource?.uri), ["note://1", "note://2"]);
            assert.include(content.find((block) => block.resource?.uri === "note://1")?.resource?.text ?? "", "모두가 보는 것");
        })));

    it.effect("새 쪽지 폼의 답은 화면과 같은 규칙을 지난다. 빈 제목은 쓰지 않는다", () =>
        run(Effect.gen(function*()
        {
            const before = (yield* listNotes(kim)).length;
            const blank = yield* answer(kim, "compose_note", { action: "accept", content: { title: "   " } });
            const written = yield* answer(kim, "compose_note", { action: "accept", content: { title: "폼으로 쓴 것", body: "본문", visibility: "private" } });
            const mine = (yield* listNotes(kim)).find((each) => each.title === "폼으로 쓴 것");

            assert.isTrue(isError(blank));
            assert.isFalse(isError(written));
            assert.strictEqual((yield* listNotes(kim)).length, before + 1);
            assert.deepStrictEqual([mine?.tenantId, mine?.authorId, mine?.visibility], ["2", "2", "private"]);
        })));

    it.effect("공개 범위를 말하지 않은 새 쪽지는 설정의 기본값을 따른다", () =>
        run(Effect.gen(function*()
        {
            yield* callTool(call(kim, "update_settings", { set: { defaultVisibility: "나만" } }), CONFIG);
            yield* answer(kim, "compose_note", { action: "accept", content: { title: "기본값으로" } });
            yield* callTool(call(kim, "import_file", { name: "가져온 것.md", text: "파일의 글" }), CONFIG);

            const mine = yield* listNotes(kim);

            assert.strictEqual(mine.find((each) => each.title === "기본값으로")?.visibility, "private");
            assert.strictEqual(mine.find((each) => each.title === "가져온 것")?.visibility, "private");
            assert.isUndefined((yield* listNotes(lee)).find((each) => each.title === "기본값으로"));
        })));

    it.effect("고를 쪽지가 하나도 없으면 빈 폼을 내지 않고 그렇다고 답한다", () =>
        Effect.gen(function*()
        {
            const empty = Layer.mergeAll(yield* noteStoreMemory(), yield* preferenceStoreMemory());
            const outcomes = yield* Effect.all(["pick_note", "attach_notes"].map((name) => callTool(call(kim, name), CONFIG))).pipe(Effect.provide(empty));

            assert.deepStrictEqual(outcomes.map((outcome) => outcome.kind), ["result", "result"]);
            assert.deepStrictEqual(outcomes.map(isError), [false, false]);
        }));

    it.effect("아무것도 고르지 않고 낸 답은 붙이지 않는다", () =>
        run(Effect.gen(function*()
        {
            assert.isTrue(isError(yield* answer(kim, "attach_notes", { action: "accept", content: { notes: [] } })));
        })));

    it.effect("폼을 모르는 클라이언트에는 폼을 보내지 않고 글로 안내한다", () =>
        run(Effect.gen(function*()
        {
            const outcomes = yield* Effect.all(["pick_note", "compose_note", "attach_notes"].map((name) =>
                callTool(call(kim, name, {}, { client: LEGACY }), CONFIG)));

            assert.deepStrictEqual(outcomes.map((outcome) => outcome.kind), ["result", "result", "result"]);
            assert.deepStrictEqual(outcomes.map(isError), [false, false, false]);
            assert.include(JSON.stringify(outcomes[0]), "김의 비공개");
            assert.notInclude(JSON.stringify(outcomes[0]), "이의 비공개");
        })));

    it.effect("서명할 비밀이 없으면 폼을 내지 않는다. 확인할 수 없는 답을 받는 길을 열지 않는다", () =>
        run(Effect.gen(function*()
        {
            const outcome = yield* callTool(call(kim, "compose_note"), { ...CONFIG, stateSecret: null });

            assert.strictEqual(outcome.kind, "result");
        })));

    it.effect("표준 폼만 아는 클라이언트에는 표준 메서드로 폼을 낸다", () =>
        run(Effect.gen(function*()
        {
            const outcome = yield* callTool(call(kim, "pick_note", {}, { client: { modern: true, capabilities: { elicitation: { form: {} } } } }), CONFIG);

            assert.strictEqual(outcome.kind === "input-required" && (outcome.inputRequests["form"] as { method: string }).method, "elicitation/create");
        })));
});

describe("플러그인의 도구: 파일", () =>
{
    it.effect("파일 진입점은 받은 파일의 이름과 주소를 화면에 그대로 넘긴다. 내용은 화면이 호스트에게서 읽는다", () =>
        run(Effect.gen(function*()
        {
            const file = { name: "메모.md", resourceUri: "host-resource://memo" };
            const opened = structured(yield* callTool(call(kim, "open_file", { file }), CONFIG));

            assert.deepStrictEqual([opened["page"], opened["file"]], ["file", file]);
            assert.isTrue(isError(yield* callTool(call(kim, "open_file", {}), CONFIG)));
        })));

    it.effect("파일을 쪽지로 가져오면 확장자를 뗀 이름이 제목이 되고 연 사람의 쪽지로 선다", () =>
        run(Effect.gen(function*()
        {
            const imported = yield* callTool(call(kim, "import_file", { name: "회의록.2026.md", text: "첫 줄\n둘째 줄" }), CONFIG);
            const mine = (yield* listNotes(kim)).find((each) => each.title === "회의록.2026");

            assert.isFalse(isError(imported));
            assert.deepStrictEqual([mine?.tenantId, mine?.authorId, mine?.body], ["2", "2", "첫 줄\n둘째 줄"]);
            assert.strictEqual(structured(imported)["noteId"], mine?.id);
        })));

    it.effect("가져오지 못한 까닭은 파일의 말로 답한다. 이 화면에는 제목 칸이 없다", () =>
        run(Effect.gen(function*()
        {
            const nameless = yield* callTool(call(kim, "import_file", { name: ".md", text: "글" }), CONFIG);
            const tooLong = yield* callTool(call(kim, "import_file", { name: "긴 글.md", text: "가".repeat(4001) }), CONFIG);
            const said = (outcome: SurfaceOutcome): string => JSON.stringify(outcome);

            assert.deepStrictEqual([isError(nameless), isError(tooLong)], [true, true]);
            assert.include(said(nameless), "파일 이름이");
            assert.include(said(tooLong), "4,000자까지");
            assert.notInclude(said(nameless), "제목을 적어 주세요");
        })));

    it.effect("연 파일의 자리는 호스트가 호출에 얹어 준 것만 돌려준다. 인자로는 받지 않는다", () =>
        run(Effect.gen(function*()
        {
            const fromHost = yield* callTool(call(kim, "reveal_file_path", {}, { meta: { "openai/resource": { path: "/work/메모.md" } } }), CONFIG);
            const fromArgs = yield* callTool(call(kim, "reveal_file_path", { path: "/etc/passwd" }), CONFIG);

            assert.deepStrictEqual(structured(fromHost), { path: "/work/메모.md" });
            assert.isTrue(isError(fromArgs));
        })));
});
