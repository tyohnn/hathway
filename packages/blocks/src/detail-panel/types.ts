import type React from "react";

export interface PanelTab
{
    readonly id: string;
    readonly label: string;
    /** 탭 옆의 짧은 수. 이미 형식이 정해진 문자열이다 */
    readonly badge?: string;
}

export type PanelStatus = "ready" | "loading" | "empty" | "error";

export interface DetailPanelProps
{
    readonly title: string;
    readonly description?: string;
    readonly tabs?: ReadonlyArray<PanelTab>;
    readonly activeTab?: string;
    readonly onTabChange?: (id: string) => void;
    /** 머리 오른쪽 버튼들 */
    readonly actions?: React.ReactNode;
    readonly footer?: React.ReactNode;
    /** 비우면 surface/panel-width(400). 넓은 변형은 숫자로 주고, `fill` 은 제 칸을 가득 채운다 */
    readonly width?: number | "fill";
    /** 비우면 제 칸을 채운다. `hug` 는 담은 것만큼만 서고 넘칠 때만 구른다 */
    readonly height?: "fill" | "hug";
    readonly status?: PanelStatus;
    readonly message?: string;
    readonly children?: React.ReactNode;
    readonly className?: string;
}
