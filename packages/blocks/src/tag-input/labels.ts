import type { TagInputLabels } from "./types";

export const TAG_INPUT_LABELS: TagInputLabels = {
    input: "값 추가",
    remove: (tag) => `${tag} 지우기`,
    duplicate: (tag) => `이미 있는 태그예요: ${tag}`,
    overflow: (max) => `${max}개까지 넣을 수 있어요`,
};
