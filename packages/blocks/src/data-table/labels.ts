/** 화면 문구. 기본은 한국어이고 호출부가 일부만 덮어쓸 수 있다 */
export interface Labels
{
    readonly search: string;
    readonly clearSearch: string;
    readonly columns: string;
    readonly sort: string;
    readonly addSort: string;
    readonly clearSort: string;
    readonly density: string;
    readonly compact: string;
    readonly comfortable: string;
    readonly pinLeft: string;
    readonly pinRight: string;
    readonly unpin: string;
    readonly hide: string;
    readonly moveLeft: string;
    readonly moveRight: string;
    readonly selectAll: string;
    readonly selectRow: string;
    readonly expandRow: string;
    readonly collapseRow: string;
    readonly dragRow: string;
    readonly dragColumn: string;
    readonly actions: string;
    readonly selected: (count: number) => string;
    readonly clearSelection: string;
    readonly copy: string;
    readonly paste: string;
    readonly edit: string;
    readonly exportCsv: string;
    readonly previous: string;
    readonly next: string;
    readonly first: string;
    readonly last: string;
    readonly rowsPerPage: string;
    readonly range: (from: number, to: number, total: number) => string;
    readonly page: (page: number, total: number) => string;
    readonly empty: string;
    readonly noResults: string;
    readonly resetFilters: string;
    readonly filterSearch: string;
    readonly clearFilter: string;
    readonly ascending: string;
    readonly descending: string;
}

export const DEFAULT_LABELS: Labels = {
    search: "검색",
    clearSearch: "검색어 지우기",
    columns: "열",
    sort: "정렬",
    addSort: "정렬 추가",
    clearSort: "정렬 지우기",
    density: "밀도",
    compact: "좁게",
    comfortable: "기본",
    pinLeft: "왼쪽에 고정",
    pinRight: "오른쪽에 고정",
    unpin: "고정 해제",
    hide: "숨기기",
    moveLeft: "왼쪽으로 이동",
    moveRight: "오른쪽으로 이동",
    selectAll: "전체 선택",
    selectRow: "행 선택",
    expandRow: "펼치기",
    collapseRow: "접기",
    dragRow: "행 순서 바꾸기",
    dragColumn: "열 순서 바꾸기",
    actions: "작업",
    selected: (count) => `${count}개 선택`,
    clearSelection: "선택 해제",
    copy: "복사",
    paste: "붙여넣기",
    edit: "편집",
    exportCsv: "CSV 내보내기",
    previous: "이전",
    next: "다음",
    first: "처음",
    last: "마지막",
    rowsPerPage: "페이지당",
    range: (from, to, total) => `${from}–${to} / ${total}`,
    page: (page, total) => `${page} / ${total} 페이지`,
    empty: "아직 항목이 없어요",
    noResults: "조건에 맞는 항목이 없어요",
    resetFilters: "필터 초기화",
    filterSearch: "찾기",
    clearFilter: "지우기",
    ascending: "오름차순",
    descending: "내림차순",
};
