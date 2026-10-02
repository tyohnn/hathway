import type { PropertyListLabels } from "./types";

export const PROPERTY_LIST_LABELS: PropertyListLabels = {
    edit: (label) => `${label} 고치기`,
    choose: (label) => `${label} 고르기`,
    add: (label) => `${label} 더하기`,
    remove: (label) => `${label} 빼기`,
    search: "찾기",
    noResults: "없어요",
    clear: "비우기",
    reason: "사유 (기록에 남아요)",
    confirm: "바꾸기",
    transitionTitle: (label) => `${label} 바꾸기`,
};
