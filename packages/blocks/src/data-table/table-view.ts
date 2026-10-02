import type { ColumnFilter, PaginationState, SortRule, TableView, TableViewPrefs, TableViewUrl } from "./types";

export const DEFAULT_PAGE_SIZE = 10;

export interface TableViewInit
{
    readonly sorting?: ReadonlyArray<SortRule>;
    readonly columnFilters?: ReadonlyArray<ColumnFilter>;
    readonly globalFilter?: string;
    readonly pagination?: Partial<PaginationState>;
    readonly columnVisibility?: Readonly<Record<string, boolean>>;
    readonly columnOrder?: ReadonlyArray<string>;
    readonly columnPinning?: Partial<TableView["columnPinning"]>;
    readonly columnSizing?: Readonly<Record<string, number>>;
    readonly density?: TableView["density"];
    readonly rowSelection?: Readonly<Record<string, boolean>>;
    readonly expanded?: Readonly<Record<string, boolean>>;
}

/** 기본값 위에 부분 값을 얹는다. 페이지네이션·고정은 필드 단위로 합친다 */
export function createTableView(init: TableViewInit = {}): TableView
{
    return {
        sorting: init.sorting ?? [],
        columnFilters: init.columnFilters ?? [],
        globalFilter: init.globalFilter ?? "",
        pagination: {
            pageIndex: init.pagination?.pageIndex ?? 0,
            pageSize: init.pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
        },
        columnVisibility: init.columnVisibility ?? {},
        columnOrder: init.columnOrder ?? [],
        columnPinning: { left: init.columnPinning?.left ?? [], right: init.columnPinning?.right ?? [] },
        columnSizing: init.columnSizing ?? {},
        density: init.density ?? "default",
        rowSelection: init.rowSelection ?? {},
        expanded: init.expanded ?? {},
    };
}

/**
 * URL 축과 사용자 설정 축으로 가른다.
 * 정렬·필터·검색·페이지는 공유 가능한 링크의 일부이고, 열 표시·순서·고정·너비·밀도는 개인 설정이다.
 * 선택·확장은 화면의 순간 상태라 어느 쪽에도 넣지 않는다.
 */
export function splitTableView(view: TableView): { readonly url: TableViewUrl; readonly prefs: TableViewPrefs }
{
    return {
        url: {
            sorting: view.sorting,
            columnFilters: view.columnFilters,
            globalFilter: view.globalFilter,
            pagination: view.pagination,
        },
        prefs: {
            columnVisibility: view.columnVisibility,
            columnOrder: view.columnOrder,
            columnPinning: view.columnPinning,
            columnSizing: view.columnSizing,
            density: view.density,
        },
    };
}

/**
 * URL 검색 파라미터로 적는다. 기본값과 같은 값은 적지 않는다.
 *   sort=title · sort=-due_date   (반복. 앞의 - 가 내림차순)
 *   q=<검색어>
 *   page=<1부터> · size=<페이지 크기>
 *   f.<열>=<값>                    (반복. 값 안의 쉼표를 걱정하지 않는다)
 */
export function serializeTableView(url: TableViewUrl, defaults: { readonly pageSize: number } = { pageSize: DEFAULT_PAGE_SIZE }): URLSearchParams
{
    const params = new URLSearchParams();

    for (const rule of url.sorting)
    {
        params.append("sort", rule.desc ? `-${rule.id}` : rule.id);
    }

    if (url.globalFilter !== "")
    {
        params.set("q", url.globalFilter);
    }

    if (url.pagination.pageIndex > 0)
    {
        params.set("page", String(url.pagination.pageIndex + 1));
    }

    if (url.pagination.pageSize !== defaults.pageSize)
    {
        params.set("size", String(url.pagination.pageSize));
    }

    for (const filter of url.columnFilters)
    {
        for (const value of filter.value)
        {
            params.append(`f.${filter.id}`, value);
        }
    }

    return params;
}

const toPositiveInt = (value: string | null): number | undefined =>
{
    if (value === null || !/^\d+$/.test(value))
    {
        return undefined;
    }

    const parsed = Number(value);

    return parsed > 0 ? parsed : undefined;
};

/** `serializeTableView` 의 역. 모르는 키는 무시하고 잘못된 값은 기본값으로 떨어진다 */
export function parseTableView(params: URLSearchParams, defaults: { readonly pageSize: number } = { pageSize: DEFAULT_PAGE_SIZE }): TableViewUrl
{
    const sorting: SortRule[] = [];

    for (const raw of params.getAll("sort"))
    {
        const desc = raw.startsWith("-");
        const id = desc ? raw.slice(1) : raw;

        if (id !== "")
        {
            sorting.push({ id, desc });
        }
    }

    const filters = new Map<string, string[]>();

    for (const [key, value] of params)
    {
        if (!key.startsWith("f."))
        {
            continue;
        }

        const id = key.slice(2);

        if (id === "")
        {
            continue;
        }

        const list = filters.get(id);

        if (list)
        {
            list.push(value);
        }
        else
        {
            filters.set(id, [value]);
        }
    }

    const page = toPositiveInt(params.get("page"));
    const size = toPositiveInt(params.get("size"));

    return {
        sorting,
        columnFilters: [...filters].map(([id, value]) => ({ id, value })),
        globalFilter: params.get("q") ?? "",
        pagination: { pageIndex: page === undefined ? 0 : page - 1, pageSize: size ?? defaults.pageSize },
    };
}
