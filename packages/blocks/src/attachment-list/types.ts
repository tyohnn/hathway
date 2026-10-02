import type React from "react";

export type AttachmentStatus = "ready" | "uploading" | "processing" | "failed";

export interface AttachmentFile
{
    readonly id: string;
    readonly name: string;
    /** 정본 MIME. 아이콘 선택은 확장자가 아니라 이 값으로 한다 */
    readonly mime?: string;
    /** 이미 형식이 정해진 크기 문자열 */
    readonly size?: string;
    readonly meta?: string;
    readonly url?: string;
    readonly status?: AttachmentStatus;
    readonly error?: string;
}

export interface AttachmentListProps
{
    readonly files: ReadonlyArray<AttachmentFile>;
    readonly header?: "none" | "count" | "count-download";
    readonly density?: "default" | "compact";
    /** 줄 전체를 누르는 뜻. 안쪽 단추를 누른 것은 여기로 오지 않는다 */
    readonly onPress?: (file: AttachmentFile) => void;
    /** 지금 펴 둔 파일. 누른 줄이 어느 것인지 목록에 남아야 한다 */
    readonly selectedId?: string;
    readonly onDownload?: (file: AttachmentFile) => void;
    readonly onDownloadAll?: () => void;
    readonly onRemove?: (file: AttachmentFile) => void;
    readonly empty?: React.ReactNode;
    readonly labels?: Partial<AttachmentListLabels>;
    readonly className?: string;
}

export interface AttachmentListLabels
{
    readonly count: (count: number) => string;
    readonly downloadAll: string;
    readonly download: (name: string) => string;
    readonly remove: (name: string) => string;
    readonly empty: string;
}
