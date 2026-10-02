import { describe, expect, it } from "vitest";

import { createTableView, parseTableView, serializeTableView, splitTableView } from "./table-view";

/**
 * 「표의 상태(TableView)」. 사용자가 바꾸는 값의 단위이자 spec 에 적는 초기값의 단위다.
 * URL 로 가는 축(정렬·필터·검색·페이지)과 사용자 설정으로 가는 축(열 표시·순서·고정·너비·밀도)을 가른다.
 */
describe("TableView", () =>
{
    it("기본값은 정렬·필터 없이 첫 페이지 10행이다", () =>
    {
        const view = createTableView();

        expect(view.sorting).toEqual([]);
        expect(view.columnFilters).toEqual([]);
        expect(view.globalFilter).toBe("");
        expect(view.pagination).toEqual({ pageIndex: 0, pageSize: 10 });
        expect(view.columnPinning).toEqual({ left: [], right: [] });
        expect(view.density).toBe("default");
    });

    it("부분 값을 덮어쓰되 페이지네이션은 필드 단위로 합친다", () =>
    {
        const view = createTableView({ sorting: [{ id: "title", desc: false }], pagination: { pageSize: 25 } });

        expect(view.sorting).toEqual([{ id: "title", desc: false }]);
        expect(view.pagination).toEqual({ pageIndex: 0, pageSize: 25 });
    });

    it("URL 축과 사용자 설정 축으로 가른다. 선택·확장은 어느 쪽에도 없다", () =>
    {
        const { url, prefs } = splitTableView(createTableView({ rowSelection: { a: true }, expanded: { a: true } }));

        expect(Object.keys(url).sort()).toEqual(["columnFilters", "globalFilter", "pagination", "sorting"]);
        expect(Object.keys(prefs).sort()).toEqual(["columnOrder", "columnPinning", "columnSizing", "columnVisibility", "density"]);
    });

    it("URL 로 직렬화하고 되읽으면 같다", () =>
    {
        const view = createTableView({
            sorting: [{ id: "title", desc: false }, { id: "due_date", desc: true }],
            columnFilters: [{ id: "status", value: ["in_progress", "done"] }, { id: "title", value: ["계약, 검토"] }],
            globalFilter: "달램",
            pagination: { pageIndex: 2, pageSize: 25 },
        });

        const params = serializeTableView(splitTableView(view).url);

        expect(params.getAll("sort")).toEqual(["title", "-due_date"]);
        expect(params.get("page")).toBe("3");
        expect(params.get("size")).toBe("25");
        expect(parseTableView(params)).toEqual(splitTableView(view).url);
    });

    it("기본값과 같은 값은 URL 에 적지 않는다", () =>
    {
        expect(serializeTableView(splitTableView(createTableView()).url).toString()).toBe("");
    });

    it("잘못된 URL 값은 기본값으로 떨어진다", () =>
    {
        const parsed = parseTableView(new URLSearchParams("page=abc&size=-1&sort=&q="));

        expect(parsed.pagination).toEqual({ pageIndex: 0, pageSize: 10 });
        expect(parsed.sorting).toEqual([]);
        expect(parsed.globalFilter).toBe("");
    });
});
