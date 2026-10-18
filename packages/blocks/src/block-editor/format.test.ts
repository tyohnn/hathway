import { assert, describe, it } from "@effect/vitest";

import { parseBody, readsAsMarkdown, roundTrip } from "./format";

/**
 * 본문의 꼴(노션 enhanced markdown)과 편집기의 문서를 오가는 검사. 편집기가 쓰는 확장 목록을 그대로 쓴다.
 *
 * ⚠ 같은 글이 한 번 오가도 바뀌지 않아야 한다. 바뀌면 열기만 해도 자동 저장이 판을 올리고, 다른 탭에서 연 사람이
 *    「다른 곳에서 먼저 고쳤어요」를 받는다.
 */
const types = (body: string): ReadonlyArray<string> =>
    (parseBody(body).content ?? []).map((node) => node.type ?? "");

describe("블록 편집기 본문의 꼴", () =>
{
    it("마크다운 블록(제목 · 목록 · 할 일 · 인용 · 코드 · 구분선)과 글자 꾸밈은 저장과 열기를 오가도 글이 바뀌지 않는다", () =>
    {
        const body = [
            "# 제목",
            "문단 **굵게** *기울임* ~~취소~~ `코드` [링크](https://example.test)",
            "- 하나\n- 둘\n  - 안쪽",
            "1. 첫째\n2. 둘째",
            "- [ ] 할 일\n- [x] 한 일",
            "> 인용",
            "```ts\nconst a = 1;\n```",
            "---",
            "끝",
        ].join("\n\n");

        assert.strictEqual(roundTrip(body), body);
    });

    it("토글은 <details><summary> 로 읽고 같은 글로 다시 쓴다", () =>
    {
        const body = "<details>\n<summary>왜 자유인가</summary>\n\t안쪽 문단\n\n\t- 안쪽 목록\n</details>\n\n다음";

        assert.deepStrictEqual(types(body), ["details", "paragraph"]);
        assert.strictEqual(roundTrip(body), body);
    });

    it("콜아웃은 <callout icon> 으로 읽고, 첫 문단은 여는 태그와 같은 줄에 다시 쓴다", () =>
    {
        const body = "<callout icon=\"💡\">짧고 담백하게\n\t둘째 문단\n</callout>";

        assert.deepStrictEqual(types(body), ["callout"]);
        assert.strictEqual(roundTrip(body), body);
    });

    it("문단 하나뿐인 콜아웃은 한 줄로 닫고, 노션에서 온 색은 잃지 않는다", () =>
    {
        const body = "<callout icon=\"🔥\" color=\"gray_bg\">한 줄</callout>";

        assert.strictEqual(roundTrip(body), body);
    });

    it("탭으로 들여 쓴 줄은 바로 위 토글 · 콜아웃의 자식이다. 안쪽의 닫는 태그가 바깥 블록을 일찍 닫지 않는다", () =>
    {
        const body = "<details>\n<summary>바깥</summary>\n\t<details>\n\t<summary>안</summary>\n\t\t깊은 글\n\t</details>\n</details>";
        const outer = parseBody(body).content?.[0];
        const inner = outer?.content?.[1]?.content?.[0];

        assert.strictEqual(outer?.type, "details");
        assert.strictEqual(inner?.type, "details");
        assert.strictEqual(roundTrip(body), body);
    });

    it("닫는 태그가 없는 <details> 는 블록으로 읽지 않는다. 글이 사라지지 않는다", () =>
    {
        const out = roundTrip("<details>\n<summary>열기만</summary>\n\t글");

        assert.include(out, "열기만");
        assert.include(out, "글");
    });

    it("블록 기호나 노션 태그가 있는 글을 붙이면 마크다운으로 읽는다. Claude 가 준 글이 블록으로 선다", () =>
    {
        assert.isTrue(readsAsMarkdown("## 제목\n\n- 목록", ""));
        assert.isTrue(readsAsMarkdown("<callout icon=\"💡\">글</callout>", ""));
        assert.isTrue(readsAsMarkdown("그냥 글에 **굵게**", "<span>그냥 글에 **굵게**</span>"));
    });

    it("기호 없는 글과, 블록이 HTML 로 갖춰진 붙여넣기는 마크다운으로 읽지 않는다", () =>
    {
        assert.isFalse(readsAsMarkdown("그냥 한 줄", ""));
        assert.isFalse(readsAsMarkdown("# 제목", "<h1>제목</h1>"));
        assert.isFalse(readsAsMarkdown("  ", ""));
    });

    it("글머리 항목 밑의 번호 목록과, 안쪽 목록 뒤에 이어지는 문단도 저장과 열기를 오가도 그대로다", () =>
    {
        const body = "- 둘\n  - 안쪽\n\n  셋째 문단\n- 하나\n  1. 번호 일";

        assert.strictEqual(roundTrip(body), body);
    });

    it("문단 · 제목 밑의 안쪽 블록은 줄마다 탭으로 들여 쓰고, 다시 열면 같은 깊이로 선다(노션의 안쪽 블록)", () =>
    {
        const body = "## 세 가지 자유\n\n\t경제적 자유\n\n\t\t- 시간\n\t\t- 돈\n\n\t정신적 자유\n\n끝 문단";
        const doc = parseBody(body);
        const depths = (doc.content ?? []).map((node) => [node.type, (node.attrs as { indent?: number } | undefined)?.indent ?? 0]);

        assert.deepStrictEqual(depths, [["heading", 0], ["paragraph", 1], ["bulletList", 2], ["paragraph", 1], ["paragraph", 0]]);
        assert.strictEqual(roundTrip(body), body);
    });

    it("토글 안쪽의 탭 줄은 토글이 가져간다. 앞 블록의 안쪽 블록으로 읽지 않는다", () =>
    {
        const body = "<details>\n<summary>펼치기</summary>\n\t안쪽\n</details>\n\n\t토글의 안쪽 블록";
        const doc = parseBody(body);

        assert.deepStrictEqual((doc.content ?? []).map((node) => node.type), ["details", "paragraph"]);
        assert.strictEqual(roundTrip(body), body);
    });
});
