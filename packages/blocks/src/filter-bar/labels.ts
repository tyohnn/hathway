import type { FilterBarLabels } from "./types";

export const FILTER_BAR_LABELS: FilterBarLabels = {
    search: "검색",
    clearSearch: "검색어 지우기",
    filterSearch: "찾기",
    noResults: "조건에 맞는 항목이 없어요",
    selected: (count) => `${count}개 선택`,
    reset: "필터 초기화",
    sort: "정렬",
    all: "전체",
};
