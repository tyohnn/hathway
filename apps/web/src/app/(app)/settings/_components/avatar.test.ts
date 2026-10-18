import { describe, expect, it } from "vitest";

import { AVATAR_TONES, avatarTone, initialOf } from "./avatar";

describe("아바타", () =>
{
    it("같은 열쇠는 늘 같은 색조이고, 색조는 시스템이 아는 이름 가운데 하나다", () =>
    {
        expect(avatarTone("kim@example.test")).toBe(avatarTone("kim@example.test"));
        expect(AVATAR_TONES).toContain(avatarTone("kim@example.test"));
        expect(AVATAR_TONES).toContain(avatarTone(""));
    });

    it("머리글자는 이름의 첫 글자이고 영문은 대문자다", () =>
    {
        expect(initialOf("김고객")).toBe("김");
        expect(initialOf("  invited@example.test")).toBe("I");
    });

    it("머리글자는 코드 포인트로 자른다. 빈 이름은 빈 글자다", () =>
    {
        expect(initialOf("😀 웃는 사람")).toBe("😀");
        expect(initialOf("   ")).toBe("");
    });
});
