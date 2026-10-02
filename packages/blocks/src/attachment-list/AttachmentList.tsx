"use client";

import {
    Attachment,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentGroup,
    AttachmentMedia,
    AttachmentTitle,
} from "@investment/ui/components/attachment";
import { Button } from "@investment/ui/components/button";
import { Empty, EmptyDescription, EmptyHeader } from "@investment/ui/components/empty";
import { Download, FileText, Image, Trash } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { isInteractiveTarget } from "../interaction";
import { ATTACHMENT_LIST_LABELS } from "./labels";
import type { AttachmentFile, AttachmentListProps, AttachmentStatus } from "./types";

/** 프리미티브의 상태 이름이 블록보다 하나 많다. ready 는 done 이고 failed 는 error 다 */
const PRIMITIVE_STATE: Record<AttachmentStatus, "done" | "uploading" | "processing" | "error"> = {
    ready: "done",
    uploading: "uploading",
    processing: "processing",
    failed: "error",
};

/** 아이콘은 확장자가 아니라 정본 MIME 으로 고른다. 업로드 게이트와 표기가 갈리지 않게 한다 */
function mediaIcon(file: AttachmentFile)
{
    return file.mime !== undefined && file.mime.startsWith("image/")
        ? <Image aria-hidden />
        : <FileText aria-hidden />;
}

/**
 * 첨부 파일 목록.
 *
 * 파일 한 줄은 Attachment 조각 그대로이고, 블록은 머리·나열·빈 상태만 맡는다.
 * 진행률과 오류 표시는 Attachment 의 상태가 그린다.
 *
 * ⚠ **줄을 누르는 것과 내려받는 것이 다른 일이다.** 내려받기는 파일을 디스크로 가져가는 일이고
 * 줄을 누르는 것은 그 파일을 여기서 펴 보는 일이다. 안쪽 단추를 누른 것을 줄 누르기로 치지 않는
 * 술어는 `ItemList` 와 같은 것을 읽는다(`src/interaction.ts`).
 */
export function AttachmentList({
    files,
    header = "count-download",
    density = "default",
    onPress,
    selectedId,
    onDownload,
    onDownloadAll,
    onRemove,
    empty,
    labels,
    className,
}: AttachmentListProps)
{
    const text = { ...ATTACHMENT_LIST_LABELS, ...labels };

    const press = (file: AttachmentFile) => (event: React.MouseEvent | React.KeyboardEvent) =>
    {
        if (onPress === undefined || isInteractiveTarget(event.target))
        {
            return;
        }

        if (event.type === "keydown")
        {
            const key = (event as React.KeyboardEvent).key;

            if (key !== "Enter" && key !== " ")
            {
                return;
            }

            event.preventDefault();
        }

        onPress(file);
    };

    if (files.length === 0)
    {
        return (
            <div data-slot="attachment-list" data-empty className={className}>
                {empty ?? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyDescription>{text.empty}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        );
    }

    return (
        <div data-slot="attachment-list" className={cn("flex flex-col gap-[var(--surface-gap-lg)]", className)}>
            {header === "none"
                ? null
                : (
                    <div className="flex items-center justify-between gap-[var(--surface-gap-lg)]">
                        <span
                            className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground"
                            style={{ fontWeight: "var(--ui-font-weight)" }}
                        >
                            {text.count(files.length)}
                        </span>
                        {header === "count-download" && onDownloadAll !== undefined
                            ? (
                                <Button variant="ghost" size="xs" onClick={onDownloadAll}>
                                    <Download />
                                    {text.downloadAll}
                                </Button>
                            )
                            : null}
                    </div>
                )}

            <AttachmentGroup className="flex flex-col gap-[var(--control-gap-sm)]">
                {files.map((file) => (
                    <Attachment
                        key={file.id}
                        size={density === "compact" ? "sm" : "default"}
                        orientation="horizontal"
                        state={PRIMITIVE_STATE[file.status ?? "ready"]}
                        data-selected={file.id === selectedId ? "" : undefined}
                        role={onPress === undefined ? undefined : "button"}
                        aria-label={onPress === undefined ? undefined : file.name}
                        tabIndex={onPress === undefined ? undefined : 0}
                        onClick={onPress === undefined ? undefined : press(file)}
                        onKeyDown={onPress === undefined ? undefined : press(file)}
                        className={cn(
                            "w-full",
                            onPress === undefined ? "" : "cursor-pointer hover:bg-accent",
                            file.id === selectedId ? "bg-accent" : "",
                        )}
                    >
                        <AttachmentMedia variant="icon">{mediaIcon(file)}</AttachmentMedia>
                        <AttachmentContent>
                            <AttachmentTitle>{file.name}</AttachmentTitle>
                            <AttachmentDescription>
                                {file.error ?? [file.size, file.meta].filter((part) => part !== undefined).join(" · ")}
                            </AttachmentDescription>
                        </AttachmentContent>
                        {onDownload === undefined && onRemove === undefined
                            ? null
                            : (
                                <AttachmentActions>
                                    {onDownload === undefined
                                        ? null
                                        : (
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                aria-label={text.download(file.name)}
                                                onClick={() => onDownload(file)}
                                            >
                                                <Download />
                                            </Button>
                                        )}
                                    {onRemove === undefined
                                        ? null
                                        : (
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                aria-label={text.remove(file.name)}
                                                onClick={() => onRemove(file)}
                                            >
                                                <Trash />
                                            </Button>
                                        )}
                                </AttachmentActions>
                            )}
                    </Attachment>
                ))}
            </AttachmentGroup>
        </div>
    );
}
