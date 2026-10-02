import type React from "react";

import type { FieldCondition } from "./rules";

export type FieldKind = "text" | "number" | "email" | "tel" | "date" | "textarea" | "select" | "switch" | "custom";

export interface FieldOption
{
    readonly value: string;
    readonly label: string;
}

export interface FieldSpec
{
    readonly name: string;
    readonly label: string;
    readonly kind?: FieldKind;
    readonly description?: string;
    readonly placeholder?: string;
    readonly required?: boolean;
    readonly disabled?: boolean;
    /** select 종류의 선택지 */
    readonly options?: ReadonlyArray<FieldOption>;
    /** 한 필드가 두 열을 다 쓰게 한다. 긴 입력(요청 사항 등)이 쓰는 자리다 */
    readonly full?: boolean;
    /** kind 가 custom 일 때 그릴 것. 블록은 값을 모르고 자리만 준다 */
    readonly render?: React.ReactNode;
    /**
     * 보임 조건. 다른 필드의 값에 따라 이 필드를 감춘다. 온톨로지의 `$cond` 가 여기로 내려온다.
     * 여럿이면 전부 참이어야 한다. 감춰진 필드의 값은 블록이 지우지 않는다 — 값의 주인은 호출부다.
     */
    readonly when?: FieldCondition | ReadonlyArray<FieldCondition>;
}

export interface FieldGroupProps
{
    readonly fields: ReadonlyArray<FieldSpec>;
    readonly legend?: string;
    readonly description?: string;
    readonly columns?: 1 | 2;
    /** 값과 변경. 블록은 값을 갖지 않는다 */
    readonly values?: Readonly<Record<string, string>>;
    readonly onValueChange?: (name: string, value: string) => void;
    /** 필드별 오류 문구 */
    readonly errors?: Readonly<Record<string, string>>;
    readonly disabled?: boolean;
    readonly className?: string;
}
