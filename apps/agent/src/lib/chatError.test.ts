import { assert, describe, it } from "vitest";

import { chatErrorText, FALLBACK } from "./chatError";

const failed = (status: number, body: string): Error => new Error(`Failed to fetch chat: ${status} ${body}`);

describe("대화를 보내다 실패했을 때의 말", () =>
{
    it("글이 규칙에 걸렸으면 그 까닭을 그대로 보인다. 다시 보내라고 하면 같은 결과가 되풀이된다", () =>
    {
        assert.strictEqual(chatErrorText(failed(422, "한 번에 8000자까지 보낼 수 있어요.")), "한 번에 8000자까지 보낼 수 있어요.");
    });

    it("로그인이 끊겼으면 다시 로그인하라고 한다", () =>
    {
        assert.strictEqual(chatErrorText(failed(401, "로그인이 필요해요")), "다시 로그인해 주세요.");
    });

    it("종료된 대화면 새 대화로 안내한다", () =>
    {
        assert.include(chatErrorText(failed(409, "Closed")) ?? "", "새 대화");
    });

    it("서버의 본문은 422 가 아니면 싣지 않는다", () =>
    {
        assert.strictEqual(chatErrorText(failed(500, "TypeError: fetch failed")), FALLBACK);
        assert.strictEqual(chatErrorText(new Error("network down")), FALLBACK);
    });

    it("오류가 없으면 아무것도 세우지 않는다", () =>
    {
        assert.isNull(chatErrorText(undefined));
    });
});
