import type React from "react";

export interface SettingOption
{
    readonly value: string;
    readonly label: string;
}

export type SettingControl =
    | {
        readonly kind: "switch";
        readonly checked: boolean;
        readonly onCheckedChange: (checked: boolean) => void;
    }
    | {
        readonly kind: "select";
        readonly value: string;
        readonly options: ReadonlyArray<SettingOption>;
        readonly onValueChange: (value: string) => void;
    }
    | {
        readonly kind: "custom";
        readonly render: React.ReactNode;
    };

export interface SettingRow
{
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly control: SettingControl;
    readonly disabled?: boolean;
    /** 저장 중에는 그 행만 잠근다. 저장은 행 단위이고 토글 하나가 곧 mutation 이다 */
    readonly saving?: boolean;
    readonly error?: string;
}

export interface SettingsListProps
{
    readonly rows: ReadonlyArray<SettingRow>;
    readonly divider?: "line" | "none";
    readonly density?: "default" | "compact";
    readonly className?: string;
}
