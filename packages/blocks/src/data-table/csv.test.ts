import { describe, expect, it } from "vitest";

import { cellsToDelimited, toDelimited } from "./csv";
import type { ColumnSpec } from "./types";

/** 「행 → 구분자 텍스트」. 클립보드(탭)와 내보내기(쉼표)가 같은 규칙을 쓴다. */
const columns: ReadonlyArray<ColumnSpec> = [
    { key: "title", label: "제목" },
    { key: "amount", label: "금액", kind: "money" },
    { key: "hours", label: "시간", kind: "hours" },
];

const rows = [
    { id: "1", title: "투자계약 검토", amount: 1500000, hours: 8.5 },
    { id: "2", title: '표기 "따옴표", 쉼표', amount: null, hours: 0 },
];

describe("toDelimited", () =>
{
    it("헤더는 라벨이고 값은 화면과 같은 형식으로 나간다", () =>
    {
        const csv = toDelimited(rows, columns, { delimiter: "\t" });
        const lines = csv.split("\n");

        expect(lines[0]).toBe("제목\t금액\t시간");
        expect(lines[1]).toBe("투자계약 검토\t₩1,500,000\t8.5시간");
    });

    it("구분자·따옴표·줄바꿈이 든 값은 따옴표로 감싸고 안의 따옴표는 두 번 적는다", () =>
    {
        const csv = toDelimited(rows, columns, { delimiter: "," });

        expect(csv.split("\n")[2]).toBe('"표기 ""따옴표"", 쉼표",,0.0시간');
    });

    it("행이 없으면 헤더만 나간다", () =>
    {
        expect(toDelimited([], columns)).toBe("제목\t금액\t시간");
    });

    it("이미 형식이 잡힌 셀 행렬도 같은 규칙으로 잇는다", () =>
    {
        expect(cellsToDelimited([["a", "b\tc"], ["d", "e"]], "\t")).toBe('a\t"b\tc"\nd\te');
    });
});
