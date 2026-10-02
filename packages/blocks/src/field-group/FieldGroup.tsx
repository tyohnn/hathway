"use client";

import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup as UiFieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from "@investment/ui/components/field";
import { Input } from "@investment/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@investment/ui/components/native-select";
import { Switch } from "@investment/ui/components/switch";
import { Textarea } from "@investment/ui/components/textarea";
import { cn } from "@investment/ui/lib/utils";

import { matchesAll } from "./rules";
import type { FieldGroupProps, FieldSpec } from "./types";

/** 프리미티브에도 FieldGroup 이 있다. 블록과 이름이 겹쳐 import 를 별칭한다 */
function FieldControl(
    { field, value, disabled, onValueChange }: Readonly<{
        field: FieldSpec;
        value: string;
        disabled: boolean;
        onValueChange?: (name: string, value: string) => void;
    }>,
)
{
    const kind = field.kind ?? "text";

    if (kind === "custom")
    {
        return field.render ?? null;
    }

    if (kind === "switch")
    {
        return (
            <Switch
                id={field.name}
                name={field.name}
                checked={value === "true"}
                disabled={disabled}
                onCheckedChange={(checked) => onValueChange?.(field.name, checked ? "true" : "false")}
            />
        );
    }

    if (kind === "select")
    {
        return (
            <NativeSelect
                id={field.name}
                name={field.name}
                value={value}
                disabled={disabled}
                onChange={(event) => onValueChange?.(field.name, event.target.value)}
            >
                {field.placeholder === undefined ? null : <NativeSelectOption value="">{field.placeholder}</NativeSelectOption>}
                {(field.options ?? []).map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
                ))}
            </NativeSelect>
        );
    }

    if (kind === "textarea")
    {
        return (
            <Textarea
                id={field.name}
                name={field.name}
                value={value}
                placeholder={field.placeholder}
                disabled={disabled}
                onChange={(event) => onValueChange?.(field.name, event.target.value)}
            />
        );
    }

    return (
        <Input
            id={field.name}
            name={field.name}
            type={kind}
            value={value}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(event) => onValueChange?.(field.name, event.target.value)}
        />
    );
}

/**
 * Field 를 범례 아래 한 열·두 열로 묶는 폼 구역.
 *
 * 필드 하나는 Field 조각 그대로이고, 블록은 범례·열 수·간격과 오류 자리만 맡는다.
 * 조건(`when`)은 데이터로 받아 다른 필드의 값에 따라 감춘다. 감춘 필드의 값을 지우지는 않는다 —
 * 값의 주인은 호출부다. 계산(`$computed`)은 받지 않는다. 이유는 rules.ts 에 적었다.
 */
export function FieldGroup({
    fields,
    legend,
    description,
    columns = 1,
    values,
    onValueChange,
    errors,
    disabled = false,
    className,
}: FieldGroupProps)
{
    return (
        <FieldSet data-slot="field-group-block" className={cn("gap-[var(--surface-gap-lg)]", className)}>
            {legend === undefined
                ? null
                : (
                    <FieldLegend>
                        {legend}
                        {description === undefined ? null : <FieldDescription>{description}</FieldDescription>}
                    </FieldLegend>
                )}
            <UiFieldGroup
                className={cn(
                    "grid grid-cols-1 gap-[var(--surface-gap-lg)]",
                    columns === 2 ? "sm:grid-cols-2" : "",
                )}
            >
                {fields.filter((field) => matchesAll(values ?? {}, field.when)).map((field) =>
                {
                    const error = errors?.[field.name];
                    const isDisabled = disabled || field.disabled === true;

                    return (
                        <Field
                            key={field.name}
                            orientation={field.kind === "switch" ? "horizontal" : "vertical"}
                            data-invalid={error === undefined ? undefined : ""}
                            className={cn(columns === 2 && field.full === true ? "sm:col-span-2" : "")}
                        >
                            <FieldLabel htmlFor={field.name}>
                                {field.label}
                                {field.required === true ? <span aria-hidden className="text-destructive"> *</span> : null}
                            </FieldLabel>
                            <FieldControl
                                field={field}
                                value={values?.[field.name] ?? ""}
                                disabled={isDisabled}
                                onValueChange={onValueChange}
                            />
                            {field.description === undefined || error !== undefined
                                ? null
                                : <FieldDescription>{field.description}</FieldDescription>}
                            {error === undefined ? null : <FieldError>{error}</FieldError>}
                        </Field>
                    );
                })}
            </UiFieldGroup>
        </FieldSet>
    );
}
