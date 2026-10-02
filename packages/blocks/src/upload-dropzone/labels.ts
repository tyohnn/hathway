import type { UploadDropzoneLabels } from "./types";

export const UPLOAD_DROPZONE_LABELS: UploadDropzoneLabels = {
    idle: "파일을 끌어다 놓거나 클릭해 선택하세요",
    dragover: "여기에 놓아 주세요",
    uploading: (progress) => `올리는 중 · ${progress.current} / ${progress.total}`,
    error: "올릴 수 없는 파일이 있어요",
    disabled: "지금은 올릴 수 없어요",
    choose: "파일 선택",
    retry: "다시 선택",
};
