import type { RejectedFile } from "./upload";

export type UploadStatus = "idle" | "uploading" | "error";

export interface UploadProgress
{
    readonly current: number;
    readonly total: number;
    /** 지금 올라가는 파일 이름 */
    readonly name?: string;
}

export interface UploadDropzoneProps
{
    /** input 과 같은 문자열. `.pdf,.hwp,image/*` */
    readonly accept?: string;
    /** 안내에 적을 허용 형식 문구. 목록을 그대로 노출하지 않으려면 여기서 줄인다 */
    readonly acceptLabel?: string;
    readonly maxBytes?: number;
    readonly maxLabel?: string;
    readonly multiple?: boolean;
    readonly disabled?: boolean;
    /** 밖에서 준 상태. dragover 는 블록이 스스로 안다 */
    readonly status?: UploadStatus;
    readonly progress?: UploadProgress;
    readonly error?: string;
    readonly size?: "default" | "compact";
    readonly onFiles: (files: ReadonlyArray<File>) => void;
    readonly onReject?: (rejected: ReadonlyArray<RejectedFile<File>>) => void;
    readonly labels?: Partial<UploadDropzoneLabels>;
    readonly className?: string;
}

export interface UploadDropzoneLabels
{
    readonly idle: string;
    readonly dragover: string;
    readonly uploading: (progress: UploadProgress) => string;
    readonly error: string;
    readonly disabled: string;
    readonly choose: string;
    readonly retry: string;
}
