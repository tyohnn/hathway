"use client";

import { useRef, useState } from "react";

import { Button } from "@investment/ui/components/button";
import { Progress } from "@investment/ui/components/progress";
import { Loader, Upload } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { UPLOAD_DROPZONE_LABELS } from "./labels";
import type { UploadDropzoneProps } from "./types";
import { partitionFiles } from "./upload";

/**
 * 파일을 끌어다 놓는 자리.
 *
 * 점선 면은 프리미티브에 드롭존이 없어 직접 그렸다. 색·모서리·테두리 폭과 위아래 여백까지
 * 전부 토큰이다(위아래는 surface/padding-lg).
 *
 * ⚠ 올린 파일의 목록은 이 블록이 갖지 않는다. AttachmentList 가 맡는다 —
 * 드롭존 안에 목록을 그리면 같은 것이 둘이 된다.
 */
export function UploadDropzone({
    accept,
    acceptLabel,
    maxBytes,
    maxLabel,
    multiple = true,
    disabled = false,
    status = "idle",
    progress,
    error,
    size = "default",
    onFiles,
    onReject,
    labels,
    className,
}: UploadDropzoneProps)
{
    const text = { ...UPLOAD_DROPZONE_LABELS, ...labels };
    const inputRef = useRef<HTMLInputElement>(null);
    const [isOver, setIsOver] = useState(false);

    const state = disabled ? "disabled" : (isOver ? "dragover" : status);

    const take = (list: FileList | null) =>
    {
        if (list === null || disabled)
        {
            return;
        }

        const { accepted, rejected } = partitionFiles([...list], { accept, maxBytes });

        if (rejected.length > 0)
        {
            onReject?.(rejected);
        }

        if (accepted.length > 0)
        {
            onFiles(accepted);
        }
    };

    const headline = state === "dragover"
        ? text.dragover
        : state === "uploading"
            ? text.uploading(progress ?? { current: 0, total: 0 })
            : state === "error"
                ? text.error
                : state === "disabled"
                    ? text.disabled
                    : text.idle;

    const hint = state === "uploading"
        ? progress?.name
        : state === "error"
            ? error
            : [acceptLabel, maxLabel].filter((part) => part !== undefined).join(", ");

    return (
        <div
            data-slot="upload-dropzone"
            data-state={state}
            aria-disabled={disabled ? true : undefined}
            className={cn(
                "flex flex-col items-center justify-center gap-[var(--surface-gap)] border border-dashed text-center",
                state === "dragover" ? "border-primary bg-primary/5" : "",
                state === "error" ? "border-destructive" : "",
                state === "idle" || state === "uploading" ? "border-border bg-background" : "",
                disabled ? "cursor-not-allowed opacity-50" : "",
                className,
            )}
            style={{
                borderRadius: "var(--surface-radius)",
                borderWidth: "var(--control-border-width)",
                paddingBlock: size === "compact" ? "var(--surface-padding-md)" : "var(--surface-padding-lg)",
                paddingInline: "var(--surface-padding-md)",
            }}
            onDragOver={(event) =>
            {
                if (disabled)
                {
                    return;
                }

                event.preventDefault();
                setIsOver(true);
            }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(event) =>
            {
                event.preventDefault();
                setIsOver(false);
                take(event.dataTransfer.files);
            }}
        >
            <span
                aria-hidden
                className={cn(
                    state === "error" ? "text-destructive" : "",
                    state === "dragover" ? "text-primary" : "",
                    state === "idle" || state === "uploading" || state === "disabled" ? "text-muted-foreground" : "",
                )}
            >
                {state === "uploading" ? <Loader className="size-6 animate-spin" /> : <Upload className="size-6" />}
            </span>

            <span
                className={cn(
                    "text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)]",
                    state === "error" ? "text-destructive" : "text-foreground",
                )}
                style={{ fontWeight: "var(--ui-font-weight)" }}
            >
                {headline}
            </span>

            {hint === undefined || hint === ""
                ? null
                : (
                    <span className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                        {hint}
                    </span>
                )}

            {state === "uploading" && progress !== undefined && progress.total > 0
                ? (
                    // ⚠ 트랙과 인디케이터를 자식으로 넣지 않는다. 프리미티브 `Progress` 가
                    // 자식 뒤에 자기 트랙을 이미 그리므로, 넣으면 막대가 두 겹이 된다.
                    // 자식 자리는 `ProgressLabel`·`ProgressValue` 를 위한 것이다.
                    <Progress
                        value={Math.round((progress.current / progress.total) * 100)}
                        className="mt-[var(--surface-gap)] w-full max-w-80"
                    />
                )
                : null}

            {state === "dragover" || state === "uploading"
                ? null
                : (
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        className="mt-[var(--surface-gap)]"
                        onClick={() => inputRef.current?.click()}
                    >
                        {state === "error" ? text.retry : text.choose}
                    </Button>
                )}

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                disabled={disabled}
                className="hidden"
                onChange={(event) =>
                {
                    take(event.target.files);
                    event.target.value = "";
                }}
            />
        </div>
    );
}
