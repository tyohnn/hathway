import type React from "react";

import type { FieldSpec } from "../field-group/types";

export interface FormSheetProps
{
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly title: string;
    readonly description?: string;
    /** 폼의 필드. 직접 그리고 싶으면 children 을 쓴다 */
    readonly fields?: ReadonlyArray<FieldSpec>;
    readonly values?: Readonly<Record<string, string>>;
    readonly onValueChange?: (name: string, value: string) => void;
    readonly errors?: Readonly<Record<string, string>>;
    readonly columns?: 1 | 2;
    readonly side?: "right" | "left";
    /** 비우면 surface/panel-width(400) */
    readonly width?: number;
    readonly submitting?: boolean;
    /** 지우기 버튼을 발에 둔다 */
    readonly onDelete?: () => void;
    readonly onSubmit: () => void;
    readonly children?: React.ReactNode;
    readonly labels?: Partial<FormSheetLabels>;
    readonly className?: string;
}

export interface FormSheetLabels
{
    readonly submit: string;
    readonly cancel: string;
    readonly remove: string;
}
