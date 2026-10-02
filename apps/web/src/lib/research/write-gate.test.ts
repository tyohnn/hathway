import { describe, expect, it } from "vitest";
import { boardWritesAllowed } from "./write-gate";

describe("리서치 보드 쓰기 관문", () =>
{
    it("Vercel 프로덕션에서는 쓰지 못한다. 로그인이 없어 서버 액션을 누구나 부를 수 있다", () =>
    {
        expect(boardWritesAllowed({ VERCEL_ENV: "production", NODE_ENV: "production" })).toBe(false);
    });

    it("Vercel 프리뷰에서는 쓸 수 있다. 프리뷰 주소는 Vercel 로그인 뒤에 있다", () =>
    {
        expect(boardWritesAllowed({ VERCEL_ENV: "preview", NODE_ENV: "production" })).toBe(true);
    });

    it("로컬 개발 서버에서는 쓸 수 있다. 환경변수 없이 보드를 고칠 수 있어야 한다", () =>
    {
        expect(boardWritesAllowed({ NODE_ENV: "development" })).toBe(true);
    });

    it("Vercel 밖에서 프로덕션 빌드로 띄우면 쓰지 못한다. 누가 앞을 막고 있는지 코드가 알 수 없다", () =>
    {
        expect(boardWritesAllowed({ NODE_ENV: "production" })).toBe(false);
    });
});
