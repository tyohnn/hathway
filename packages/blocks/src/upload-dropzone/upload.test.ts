import { describe, expect, it } from "vitest";

import { isAcceptedType, partitionFiles, type FileLike } from "./upload";

const file = (name: string, type: string, size = 1): FileLike => ({ name, type, size });

describe("isAcceptedType", () =>
{
    it("accept 가 비면 전부 받는다", () =>
    {
        expect(isAcceptedType(file("a.exe", "application/octet-stream"))).toBe(true);
    });

    it("확장자 패턴은 파일 이름으로 본다", () =>
    {
        expect(isAcceptedType(file("정관.hwp", ""), ".pdf,.hwp")).toBe(true);
        expect(isAcceptedType(file("정관.doc", ""), ".pdf,.hwp")).toBe(false);
    });

    it("와일드카드는 MIME 앞부분으로 본다", () =>
    {
        expect(isAcceptedType(file("a.png", "image/png"), "image/*")).toBe(true);
        expect(isAcceptedType(file("a.pdf", "application/pdf"), "image/*")).toBe(false);
    });

    it("Slack 처럼 MIME 이 비어 오면 확장자가 판정한다", () =>
    {
        expect(isAcceptedType(file("계약서.pdf", ""), "application/pdf,.pdf")).toBe(true);
    });
});

describe("partitionFiles", () =>
{
    it("형식과 크기를 사유로 갈라 준다", () =>
    {
        const result = partitionFiles(
            [file("a.pdf", "application/pdf", 10), file("b.exe", "application/x-msdownload", 10), file("c.pdf", "application/pdf", 999)],
            { accept: ".pdf", maxBytes: 100 },
        );

        expect(result.accepted.map((item) => item.name)).toEqual(["a.pdf"]);
        expect(result.rejected).toEqual([
            { file: file("b.exe", "application/x-msdownload", 10), reason: "type" },
            { file: file("c.pdf", "application/pdf", 999), reason: "size" },
        ]);
    });
});
