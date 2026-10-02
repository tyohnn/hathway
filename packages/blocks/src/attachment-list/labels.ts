import type { AttachmentListLabels } from "./types";

export const ATTACHMENT_LIST_LABELS: AttachmentListLabels = {
    count: (count) => `첨부 ${count}건`,
    downloadAll: "모두 내려받기",
    download: (name) => `${name} 내려받기`,
    remove: (name) => `${name} 지우기`,
    empty: "첨부한 파일이 없어요",
};
