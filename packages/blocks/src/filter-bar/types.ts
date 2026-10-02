import type { Tone } from "../tone";

export interface FacetChoice
{
    readonly value: string;
    readonly label: string;
    readonly tone?: Tone;
    /** 알약 배치에서 라벨 옆에 적는 건수. 드롭다운 배치는 읽지 않는다 */
    readonly count?: number;
}

/**
 * 패싯을 어떻게 늘어놓을지.
 *   `dropdown` — 트리거를 누르면 열리는 다중 선택 목록(기본).
 *   `pills`    — 값이 늘 보이는 알약 줄. 줄을 통째로 쓰고 「전체」가 앞에 선다.
 *
 * 고르는 방법은 같다. 둘 다 값을 여럿 고르며 같은 자리(`facets`)에 실린다.
 * 다른 것은 **늘 보이느냐**뿐이라, 목록을 여는 이유의 대부분을 차지하는 축에만 `pills` 를 준다.
 */
export type FacetDisplay = "dropdown" | "pills";

export interface FacetSpec
{
    readonly key: string;
    readonly label: string;
    readonly options: ReadonlyArray<FacetChoice>;
    readonly display?: FacetDisplay;
    /**
     * 아무것도 고르지 않았을 때 격자 배치의 트리거에 적을 말. 기본은 `labels.all`.
     * 띠 배치는 트리거가 이름과 요약을 함께 그리므로 읽지 않는다.
     */
    readonly placeholder?: string;
}

export interface SortChoice
{
    readonly value: string;
    readonly label: string;
}

/**
 * 조건의 값. URL 검색 파라미터가 정본이고 블록은 값을 갖지 않는다 —
 * DataTable 의 TableView 와 같은 모양이라 두 곳을 같은 직렬화로 다룰 수 있다.
 *
 * ⚠ 알약 배치의 값도 여기에 함께 실린다. 종전에는 단일 선택 세그먼트를 `segment` 로
 *    따로 두었으나, 상태를 다중 선택으로 정하면서(2026-09-10) 패싯과 구분할 근거가
 *    사라졌다. 축이 하나면 직렬화도 하나이고 「이건 어느 쪽이지」를 묻지 않게 된다.
 */
export interface FilterState
{
    readonly search?: string;
    readonly facets?: Readonly<Record<string, ReadonlyArray<string>>>;
    readonly sort?: string;
}

/**
 * 조건을 늘어놓는 배치.
 *   `bar`  — 한 줄에 검색·패싯·정렬이 나란히 선다(기본).
 *   `grid` — 패싯이 라벨을 위에 붙인 격자로 서고 검색이 한 줄을 통째로 쓴다.
 */
export type FilterBarLayout = "bar" | "grid";

export interface FilterBarProps
{
    readonly value: FilterState;
    readonly onChange: (value: FilterState) => void;
    readonly searchable?: boolean;
    readonly facets?: ReadonlyArray<FacetSpec>;
    readonly sortOptions?: ReadonlyArray<SortChoice>;
    readonly layout?: FilterBarLayout;
    readonly disabled?: boolean;
    readonly labels?: Partial<FilterBarLabels>;
    readonly className?: string;
}

export interface FilterBarLabels
{
    readonly search: string;
    readonly clearSearch: string;
    readonly filterSearch: string;
    readonly noResults: string;
    readonly selected: (count: number) => string;
    readonly reset: string;
    /** 격자 배치의 정렬 칸 이름 */
    readonly sort: string;
    /** 알약 줄의 첫 항목이자 격자 패싯의 기본 자리표시자 */
    readonly all: string;
}
