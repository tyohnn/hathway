import type { ReactNode } from "react";

import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentGroup,
    AttachmentMedia,
    AttachmentTitle,
} from "@hathway/ui/components/attachment";
import { PendingText, pendingFrame } from "@hathway/ui/blocks/pending";

export type AttachmentFile = {
    name: string;
    /** Under the name: kind and size */
    detail?: ReactNode;
    icon: ReactNode;
    /** The file's one action: download it, remove it. `label` names the button ("Download notes.pdf") */
    action?: { label: string; icon: ReactNode; onClick?: () => void };
};

/**
 * Files as a group of attachment chips, each with an icon, its name, a detail line and one action: `sm` under a
 * message, `xs` in a composer. `loading` draws `count` chips: the icon's tile empty, bars for the name and the detail.
 */
export const AttachmentList = ({
    files = [],
    size = "sm",
    loading,
    count = 2,
    className,
}: {
    files?: readonly AttachmentFile[];
    size?: "sm" | "xs";
    loading?: boolean;
    /** How many chips to draw while loading */
    count?: number;
    className?: string;
}) => (
    <AttachmentGroup {...pendingFrame(loading)} className={className}>
        {loading && Array.from({ length: count }, (_, index) => (
            <Attachment key={index} size={size}>
                <AttachmentMedia />
                <AttachmentContent>
                    <AttachmentTitle><PendingText length={16} /></AttachmentTitle>
                    <AttachmentDescription><PendingText length={10} /></AttachmentDescription>
                </AttachmentContent>
            </Attachment>
        ))}
        {!loading && files.map((file) => (
            <Attachment key={file.name} size={size}>
                <AttachmentMedia>{file.icon}</AttachmentMedia>
                <AttachmentContent>
                    <AttachmentTitle>{file.name}</AttachmentTitle>
                    {file.detail !== undefined && <AttachmentDescription>{file.detail}</AttachmentDescription>}
                </AttachmentContent>
                {file.action !== undefined && (
                    <AttachmentActions>
                        <AttachmentAction aria-label={file.action.label} onClick={file.action.onClick}>{file.action.icon}</AttachmentAction>
                    </AttachmentActions>
                )}
            </Attachment>
        ))}
    </AttachmentGroup>
);
