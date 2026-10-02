import { describe, expect, it } from "vitest";

import { formatCurrency } from "@investment/shared/utils/formatters";

import { buildColumnDefs, defaultAlign, formatCellValue, matchesFacet, matchesText, metaColumnIds } from "./columns";
import type { ColumnSpec } from "./types";

/**
 * 「열 명세(ColumnSpec) → TanStack 열 정의」와 셀 형식.
 * 형식은 packages/shared 의 포매터 하나만 쓴다. 표마다 toLocaleString 을 따로 부르던 드리프트를 여기서 막는다.
 */
describe("셀 형식", () =>
{
    it("종류별로 shared 포매터에 위임한다", () =>
    {
        expect(formatCellValue("money", 1500000)).toBe(formatCurrency(1500000));
        expect(formatCellValue("money", 1500000)).toBe("₩1,500,000");
        expect(formatCellValue("hours", 8.5)).toBe("8.5시간");
        expect(formatCellValue("number", 1234567)).toBe("1,234,567");
        expect(formatCellValue("date", "2026-09-12")).toBe("2026.09.12");
        expect(formatCellValue("boolean", true)).toBe("예");
        expect(formatCellValue("text", "그대로")).toBe("그대로");
    });

    it("비어 있는 값은 빈 문자열이다", () =>
    {
        expect(formatCellValue("money", null)).toBe("");
        expect(formatCellValue("date", undefined)).toBe("");
        expect(formatCellValue("number", "")).toBe("");
    });

    it("숫자 종류는 오른쪽 정렬이 기본이다", () =>
    {
        expect(defaultAlign("money")).toBe("end");
        expect(defaultAlign("hours")).toBe("end");
        expect(defaultAlign("boolean")).toBe("center");
        expect(defaultAlign("text")).toBe("start");
    });
});

describe("필터 술어", () =>
{
    it("텍스트 필터는 대소문자 없이 부분 일치다", () =>
    {
        expect(matchesText("계약서 Review", ["review"])).toBe(true);
        expect(matchesText("계약서", ["검토"])).toBe(false);
        expect(matchesText("아무거나", [])).toBe(true);
    });

    it("패싯 필터는 선택값 중 하나와 같으면 통과한다", () =>
    {
        expect(matchesFacet("in_progress", ["done", "in_progress"])).toBe(true);
        expect(matchesFacet("draft", ["done"])).toBe(false);
        expect(matchesFacet("draft", [])).toBe(true);
    });
});

describe("열 정의", () =>
{
    const specs: ReadonlyArray<ColumnSpec> = [
        { key: "title", label: "제목", filter: "text" },
        { key: "status", label: "상태", kind: "badge", filter: "facet", sortable: false },
        { key: "amount", label: "금액", kind: "money", width: 120 },
    ];

    it("키가 열 id 가 되고 명세의 플래그가 TanStack 플래그로 옮겨진다", () =>
    {
        const defs = buildColumnDefs(specs, { sorting: "single" });

        expect(defs.map((def) => def.id)).toEqual(["title", "status", "amount"]);
        expect(defs[0]?.enableSorting).toBe(true);
        expect(defs[1]?.enableSorting).toBe(false);
        expect(defs[0]?.enableColumnFilter).toBe(true);
        expect(defs[2]?.enableColumnFilter).toBe(false);
        expect(defs[2]?.size).toBe(120);
        expect(defs[2]?.meta?.kind).toBe("money");
        expect(defs[2]?.meta?.align).toBe("end");
    });

    it("정렬 축이 none 이면 모든 열의 정렬이 꺼진다", () =>
    {
        const defs = buildColumnDefs(specs, { sorting: "none" });

        expect(defs.every((def) => def.enableSorting === false)).toBe(true);
    });

    it("행 기능에 따라 앞뒤에 붙는 메타 열이 정해진다", () =>
    {
        expect(metaColumnIds({})).toEqual([]);
        expect(metaColumnIds({ rows: { selection: true, actions: true } })).toEqual(["__select", "__actions"]);
        expect(metaColumnIds({ rows: { reorder: true, selection: true, expansion: true, actions: true } }))
            .toEqual(["__drag", "__select", "__expand", "__actions"]);
    });
});
