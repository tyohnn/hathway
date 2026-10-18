import { assert, describe, it } from "vitest";

import { DEFAULT_PREFERENCES } from "@hathway/preferences/domain/Preference";

import { attachForm, composeForm, formAnswer, formRequest, formSupport, pickForm } from "./forms";
import type { NoteCard } from "./views";

const CARDS: ReadonlyArray<NoteCard> = [
    { id: "11", title: "회의 메모", body: "안건 셋", visibility: "tenant", archived: false },
    { id: "12", title: "혼자 보는 것", body: "", visibility: "private", archived: false },
];

const modern = (capabilities: Record<string, unknown>) => ({ modern: true, capabilities });

describe("폼", () =>
{
    it("폼을 띄울 수 있는지는 클라이언트가 요청에 실은 capability 에서 읽는다", () =>
    {
        assert.strictEqual(formSupport(modern({ extensions: { "openai/elicitation": { form: {} } } })), "openai");
        assert.strictEqual(formSupport(modern({ elicitation: { form: {} } })), "standard");
        assert.strictEqual(formSupport(modern({ elicitation: {} })), "standard");
        assert.strictEqual(formSupport(modern({})), "none");
    });

    it("옛 판의 클라이언트에는 폼을 보내지 않는다. 되묻기가 열린 연결을 요구해 이 라우트와 맞지 않는다", () =>
    {
        assert.strictEqual(formSupport({ modern: false, capabilities: { elicitation: { form: {} } } }), "none");
    });

    it("고르는 폼의 선택지는 쪽지마다 하나이고 설명과 썸네일이 붙는다", () =>
    {
        const field = pickForm(CARDS, "openai").properties["note"] as { oneOf: ReadonlyArray<Record<string, unknown>> };

        assert.deepStrictEqual(field.oneOf.map((option) => option["const"]), ["11", "12"]);
        assert.strictEqual(field.oneOf[0]?.["description"], "안건 셋");
        assert.match((field.oneOf[0]?.["x-openai-thumbnail"] as { src: string }).src, /^data:image\/svg\+xml;base64,/);
        // 한 칸의 선택지 가운데 하나라도 썸네일이 있으면 모두 그림으로 그려진다. 그래서 빠진 것이 없어야 한다
        assert.isTrue(field.oneOf.every((option) => option["x-openai-thumbnail"] !== undefined));
    });

    it("표준 폼만 아는 클라이언트에는 확장 칸을 싣지 않는다. 모르는 칸이 든 폼은 통째로 뜨지 않는다", () =>
    {
        const text = JSON.stringify([pickForm(CARDS, "standard"), composeForm(DEFAULT_PREFERENCES, "standard"), attachForm(CARDS, "standard")]);

        assert.notInclude(text, "x-openai");
        assert.notInclude(text, "pattern");
    });

    it("새 쪽지 폼은 제목에 제안 값과 패턴을 달고, 공개 범위의 처음 값이 설정의 기본값이다", () =>
    {
        const form = composeForm({ defaultVisibility: "private", showArchived: false }, "openai");
        const title = form.properties["title"] as Record<string, unknown>;

        assert.deepStrictEqual(form.required, ["title"]);
        assert.isAbove((title["x-openai-suggestions"] as ReadonlyArray<unknown>).length, 0);
        assert.strictEqual(title["pattern"], "\\S");
        assert.strictEqual((form.properties["visibility"] as Record<string, unknown>)["default"], "private");
    });

    it("참고할 쪽지 폼은 자원 고르기이고 선택지마다 미리 보기가 붙는다. 사용자가 파일을 더하는 칸은 없다", () =>
    {
        const field = attachForm(CARDS, "openai").properties["notes"] as Record<string, unknown>;
        const input = field["x-openai-input"] as { type: string; selection: string; options: ReadonlyArray<Record<string, unknown>>; userOptions?: unknown };

        assert.strictEqual(input.type, "resource");
        assert.strictEqual(input.selection, "explicit");
        assert.isUndefined(input.userOptions);
        assert.deepStrictEqual(input.options.map((option) => option["uri"]), ["note://11", "note://12"]);
        assert.deepStrictEqual((input.options[0]?.["_meta"] as Record<string, unknown>)["openai/preview"], {
            target: { type: "resource_link", uri: "note://11", name: "회의 메모" },
        });
    });

    it("폼 요청은 폼을 아는 정도에 맞는 메서드로 나간다", () =>
    {
        const form = pickForm(CARDS, "openai");

        assert.deepStrictEqual(formRequest("openai", "고르세요", form), {
            form: { method: "openai/elicitation/create", params: { mode: "form", message: "고르세요", requestedSchema: form } },
        });
        assert.strictEqual((formRequest("standard", "고르세요", form)["form"] as { method: string }).method, "elicitation/create");
    });

    it("폼의 답은 받았는지 · 물렀는지 · 아직 없는지로 읽는다", () =>
    {
        assert.deepStrictEqual(formAnswer({ form: { action: "accept", content: { note: "11" } } }), { action: "accept", content: { note: "11" } });
        assert.deepStrictEqual(formAnswer({ form: { action: "decline" } }), { action: "decline" });
        assert.deepStrictEqual(formAnswer({ form: { action: "cancel" } }), { action: "cancel" });
        assert.isNull(formAnswer(null));
        assert.isNull(formAnswer({ other: { action: "accept", content: {} } }));
        assert.isNull(formAnswer({ form: { action: "accept" } }));
    });
});
