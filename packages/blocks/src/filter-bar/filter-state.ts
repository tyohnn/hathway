import type { FilterState } from "./types";

/**
 * 알약 줄의 「전체」 항목이 갖는 값.
 *
 * 「전체」 는 값이 아니라 **값이 없는 상태**다. 그래서 골라도 `facets` 에 담기지 않고
 * 그 키가 아예 빠진다 — URL 에 `f.status=__all` 같은 군더더기가 남지 않게 하려는 것이다.
 * 화면의 ToggleGroup 은 눌린 항목을 값으로 식별하므로 이 자리표시자만 쓴다.
 *
 * ⚠ 패싯 값은 밑줄 둘로 시작할 수 없다(DataTable 의 메타 열 id 와 같은 규약).
 */
export const FACET_ALL_VALUE = "__all";

/** 조건이 하나라도 걸려 있으면 초기화 버튼이 나온다 */
export function hasCondition(value: FilterState): boolean
{
    if (value.search !== undefined && value.search !== "")
    {
        return true;
    }

    return Object.values(value.facets ?? {}).some((selected) => selected.length > 0);
}

/** 조건을 전부 걷어낸다. 정렬은 조건이 아니라 보기 방식이라 남는다 */
export function clearConditions(value: FilterState): FilterState
{
    return { sort: value.sort };
}

/** 패싯 하나의 값을 통째로 정한다. 빈 배열이면 그 키를 뺀다 */
export function setFacetValues(
    value: FilterState,
    key: string,
    selected: ReadonlyArray<string>,
): FilterState
{
    const facets: Record<string, ReadonlyArray<string>> = { ...value.facets };

    if (selected.length === 0)
    {
        delete facets[key];
    }
    else
    {
        facets[key] = selected;
    }

    return { ...value, facets };
}

/** 패싯 값 하나를 켜고 끈다. 남는 값이 없으면 그 키를 통째로 뺀다 */
export function toggleFacetValue(value: FilterState, key: string, option: string): FilterState
{
    const current = value.facets?.[key] ?? [];
    const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];

    return setFacetValues(value, key, next);
}

/**
 * ToggleGroup 이 돌려준 배열을 패싯 값으로 접는다.
 *
 * 「전체」 는 배타적이다. 그것을 새로 누르면 나머지가 전부 꺼지고, 다른 값을 누르면
 * 「전체」 가 빠진다. 값이 하나도 남지 않은 것과 「전체」 는 같은 상태이므로 둘을 구분하지 않는다.
 */
export function resolvePillValues(
    value: FilterState,
    key: string,
    next: ReadonlyArray<string>,
): FilterState
{
    const current = value.facets?.[key] ?? [];

    // ⚠ 「전체」 가 눌려 있었는지는 `current` 로 알 수 없다. 그것은 값이 아니라 **값이 없는
    //    상태**라 `facets` 에 담기지 않기 때문이다. 화면이 누른 것으로 그리는 조건과 같은
    //    조건(고른 값이 없음)을 여기서도 써야 「전체 → 다른 값」이 초기화로 읽히지 않는다.
    const wasAllPressed = current.length === 0;
    const addedAll = next.includes(FACET_ALL_VALUE) && !wasAllPressed;

    return setFacetValues(
        value,
        key,
        addedAll ? [] : next.filter((item) => item !== FACET_ALL_VALUE),
    );
}

/**
 * URL 검색 파라미터로 적는다. 빈 축은 적지 않는다.
 *   sort=<정렬>
 *   q=<검색어>
 *   f.<패싯>=<값>                  (반복. DataTable 의 TableView 와 같은 형식)
 *
 * ⚠ 알약 배치의 값도 `f.` 로 나간다. 늘 보이느냐만 다르고 고르는 방법이 같기 때문이다.
 */
export function serializeFilterState(value: FilterState): URLSearchParams
{
    const params = new URLSearchParams();

    if (value.sort !== undefined && value.sort !== "")
    {
        params.set("sort", value.sort);
    }

    if (value.search !== undefined && value.search !== "")
    {
        params.set("q", value.search);
    }

    for (const [key, selected] of Object.entries(value.facets ?? {}))
    {
        for (const option of selected)
        {
            params.append(`f.${key}`, option);
        }
    }

    return params;
}

/** `serializeFilterState` 의 역. 모르는 키와 빈 값은 무시한다 */
export function parseFilterState(params: URLSearchParams): FilterState
{
    const facets: Record<string, string[]> = {};

    for (const [key, value] of params)
    {
        if (!key.startsWith("f.") || value === "")
        {
            continue;
        }

        const id = key.slice(2);

        if (id === "")
        {
            continue;
        }

        const list = facets[id];

        if (list)
        {
            list.push(value);
        }
        else
        {
            facets[id] = [value];
        }
    }

    const sort = params.get("sort") ?? "";
    const search = params.get("q") ?? "";

    return {
        ...(sort === "" ? {} : { sort }),
        ...(search === "" ? {} : { search }),
        ...(Object.keys(facets).length === 0 ? {} : { facets }),
    };
}
