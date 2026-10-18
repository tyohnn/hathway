import { assert, describe, it } from "vitest";

import { safeRedirect } from "./safeRedirect";

/** 로그인 화면이 남의 사이트로 보내는 통로가 되지 않게 막는 자리 */
describe("돌아갈 주소", () =>
{
    it("같은 출처의 경로는 그대로 쓴다", () =>
    {
        assert.strictEqual(safeRedirect("/notes/12", "/notes"), "/notes/12");
        assert.strictEqual(safeRedirect("/notes?view=archived", "/notes"), "/notes?view=archived");
    });

    it("비어 있으면 기본 자리로 간다", () =>
    {
        assert.strictEqual(safeRedirect(null, "/notes"), "/notes");
        assert.strictEqual(safeRedirect(undefined, "/notes"), "/notes");
        assert.strictEqual(safeRedirect("", "/notes"), "/notes");
    });

    it("바깥 주소는 쓰지 않는다 — 프로토콜을 물려받는 //도 바깥이다", () =>
    {
        assert.strictEqual(safeRedirect("https://example.test/notes", "/notes"), "/notes");
        assert.strictEqual(safeRedirect("//example.test", "/notes"), "/notes");
        assert.strictEqual(safeRedirect("/\\example.test", "/notes"), "/notes");
        assert.strictEqual(safeRedirect("javascript:alert(1)", "/notes"), "/notes");
    });
});
