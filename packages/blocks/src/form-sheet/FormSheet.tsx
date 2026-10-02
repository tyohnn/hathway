"use client";

import { Button } from "@investment/ui/components/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@investment/ui/components/sheet";
import { cn } from "@investment/ui/lib/utils";

import { FieldGroup } from "../field-group";
import { FORM_SHEET_LABELS } from "./labels";
import type { FormSheetProps } from "./types";

/**
 * 등록·편집 폼을 담은 시트.
 *
 * 시트 자체는 Sheet 조각 그대로이고, 블록은 폼 자리와 발의 버튼 배치만 맡는다.
 * 폭은 surface/panel-width 를 읽어 DetailPanel 과 어긋나지 않는다 —
 * 나란히 열렸을 때 두 면의 폭이 다르면 화면이 흔들린다.
 * 필드 검증은 FieldGroup 이 맡고, 저장 가능한지는 호출부가 정한다.
 */
export function FormSheet({
    open,
    onOpenChange,
    title,
    description,
    fields,
    values,
    onValueChange,
    errors,
    columns = 1,
    side = "right",
    width,
    submitting = false,
    onDelete,
    onSubmit,
    children,
    labels,
    className,
}: FormSheetProps)
{
    const text = { ...FORM_SHEET_LABELS, ...labels };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={side}
                data-slot="form-sheet"
                className={cn("flex flex-col", className)}
                style={{ width: width === undefined ? "var(--surface-panel-width)" : `${width}px` }}
            >
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    {description === undefined ? null : <SheetDescription>{description}</SheetDescription>}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-[var(--surface-padding-md)]">
                    {fields === undefined
                        ? null
                        : (
                            <FieldGroup
                                fields={fields}
                                columns={columns}
                                values={values}
                                onValueChange={onValueChange}
                                errors={errors}
                                disabled={submitting}
                            />
                        )}
                    {children}
                </div>

                <SheetFooter className="flex-row justify-end gap-[var(--control-gap-sm)]">
                    {onDelete === undefined
                        ? null
                        : (
                            <Button variant="destructive" disabled={submitting} className="mr-auto" onClick={onDelete}>
                                {text.remove}
                            </Button>
                        )}
                    <SheetClose render={<Button variant="outline" disabled={submitting}>{text.cancel}</Button>} />
                    <Button disabled={submitting} onClick={onSubmit}>{text.submit}</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
