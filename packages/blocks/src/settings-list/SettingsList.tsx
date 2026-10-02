"use client";

import { NativeSelect, NativeSelectOption } from "@investment/ui/components/native-select";
import { Switch } from "@investment/ui/components/switch";
import { cn } from "@investment/ui/lib/utils";

import type { SettingControl, SettingsListProps } from "./types";

function Control({ control, disabled }: Readonly<{ control: SettingControl; disabled: boolean }>)
{
    if (control.kind === "switch")
    {
        return (
            <Switch
                checked={control.checked}
                disabled={disabled}
                onCheckedChange={(checked) => control.onCheckedChange(checked)}
            />
        );
    }

    if (control.kind === "select")
    {
        return (
            <NativeSelect
                size="sm"
                value={control.value}
                disabled={disabled}
                onChange={(event) => control.onValueChange(event.target.value)}
            >
                {control.options.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
                ))}
            </NativeSelect>
        );
    }

    return control.render;
}

/**
 * 제목·설명과 컨트롤이 한 행을 이루는 설정 목록.
 *
 * 컨트롤은 프리미티브 그대로이고 블록은 행·구분선·설명 자리만 맡는다.
 * 저장은 행 단위다 — 토글 하나가 곧 mutation 이고, 실패하면 그 행만 되돌린다.
 */
export function SettingsList({ rows, divider = "line", density = "default", className }: SettingsListProps)
{
    return (
        <div data-slot="settings-list" data-density={density} className={cn("flex flex-col", className)}>
            {rows.map((row, index) =>
            {
                const disabled = row.disabled === true || row.saving === true;

                return (
                    <div
                        key={row.id}
                        data-slot="settings-row"
                        data-saving={row.saving === true ? "" : undefined}
                        className={cn(
                            "flex items-center justify-between gap-[var(--surface-gap-lg)]",
                            density === "compact"
                                ? "py-[var(--surface-padding-sm)]"
                                : "py-[var(--surface-padding-md)]",
                            divider === "line" && index < rows.length - 1 ? "border-b border-border" : "",
                            disabled ? "opacity-60" : "",
                        )}
                    >
                        <div className="flex min-w-0 flex-col gap-[var(--surface-gap)]">
                            <span
                                className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground"
                                style={{ fontWeight: "var(--ui-font-weight)" }}
                            >
                                {row.title}
                            </span>
                            {row.description === undefined
                                ? null
                                : (
                                    <span className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                                        {row.description}
                                    </span>
                                )}
                            {row.error === undefined
                                ? null
                                : (
                                    <span className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-destructive">
                                        {row.error}
                                    </span>
                                )}
                        </div>
                        <div className="shrink-0">
                            <Control control={row.control} disabled={disabled} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
