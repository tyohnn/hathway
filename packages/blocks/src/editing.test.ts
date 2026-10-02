import { describe, expect, it } from "vitest";

import { editKeyIntent } from "./editing";

describe("editKeyIntent", () =>
{
    it("Esc 는 되돌린다", () =>
    {
        expect(editKeyIntent("Escape")).toBe("revert");
        expect(editKeyIntent("Escape", { multiline: true })).toBe("revert");
    });

    it("한 줄에서 Enter 는 저장한다", () =>
    {
        expect(editKeyIntent("Enter")).toBe("commit");
    });

    it("여러 줄에서 Enter 는 줄바꿈이라 아무것도 아니다", () =>
    {
        expect(editKeyIntent("Enter", { multiline: true })).toBe("none");
    });

    it("여러 줄에서는 ⌘·Ctrl 을 함께 눌러야 저장한다", () =>
    {
        expect(editKeyIntent("Enter", { multiline: true, metaKey: true })).toBe("commit");
        expect(editKeyIntent("Enter", { multiline: true, ctrlKey: true })).toBe("commit");
    });

    it("나머지 키는 아무것도 아니다", () =>
    {
        expect(editKeyIntent("Tab")).toBe("none");
        expect(editKeyIntent("a")).toBe("none");
    });
});
