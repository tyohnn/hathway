"use client";

import type { ReactNode } from "react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from "@hathway/ui/components/input-group";
import { Kbd } from "@hathway/ui/components/kbd";
import { AttachmentList, type AttachmentFile } from "@hathway/ui/blocks/attachment-list";
import { strings } from "@hathway/ui/strings";

export type PromptInputTool = { label: string; icon: ReactNode; onClick?: () => void };

/**
 * The message box of a conversation with an assistant, all in one field: the attached files on top, the text,
 * and a bottom row with the input tools (attach, dictate), a status (tokens used), the shortcut that sends and
 * the send button. `label` names the text field for assistive technology.
 */
export const PromptInput = ({
    label = strings.blocks.prompt.label,
    value,
    defaultValue,
    onValueChange,
    placeholder,
    files,
    tools,
    status,
    shortcut,
    send,
    className,
}: {
    label?: string;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    files?: readonly AttachmentFile[];
    tools?: readonly PromptInputTool[];
    /** After the tools: an icon and a short text */
    status?: ReactNode;
    /** The keys that send, in a Kbd */
    shortcut?: ReactNode;
    send: { label?: string; icon: ReactNode; onClick?: () => void };
    className?: string;
}) => (
    <InputGroup className={className}>
        {files !== undefined && (
            <InputGroupAddon align="block-start">
                <AttachmentList files={files} size="xs" />
            </InputGroupAddon>
        )}
        <InputGroupTextarea
            aria-label={label}
            className="min-h-16"
            value={value}
            defaultValue={defaultValue}
            placeholder={placeholder}
            onChange={onValueChange && ((event) => onValueChange(event.target.value))}
        />
        <InputGroupAddon align="block-end">
            {tools?.map((tool) => <InputGroupButton key={tool.label} size="icon-xs" variant="ghost" aria-label={tool.label} onClick={tool.onClick}>{tool.icon}</InputGroupButton>)}
            {status !== undefined && <InputGroupText className="ml-1">{status}</InputGroupText>}
            <span className="ml-auto flex items-center gap-2">
                {shortcut !== undefined && <InputGroupText><Kbd>{shortcut}</Kbd></InputGroupText>}
                <InputGroupButton size="icon-xs" variant="default" aria-label={send.label ?? strings.blocks.prompt.send} onClick={send.onClick}>{send.icon}</InputGroupButton>
            </span>
        </InputGroupAddon>
    </InputGroup>
);
