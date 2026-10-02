import type React from "react";

export interface ChoiceOption
{
    readonly value: string;
    readonly label: string;
    readonly description?: string;
    readonly icon?: React.ReactNode;
    readonly disabled?: boolean;
}

export interface ChoiceCardsProps
{
    readonly options: ReadonlyArray<ChoiceOption>;
    readonly value?: string;
    readonly onValueChange?: (value: string) => void;
    /** auto 는 가로로 늘어놓고, 숫자는 그 수만큼 열을 만든다 */
    readonly columns?: "auto" | 1 | 2 | 3;
    /** 선택 표시. none 은 테두리만으로 알린다 */
    readonly indicator?: "radio" | "none";
    readonly name?: string;
    readonly disabled?: boolean;
    readonly className?: string;
}
