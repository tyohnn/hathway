import type React from "react";

import type { CellKind } from "../data-table/types";
import type { Tone } from "../tone";

export interface Property
{
    readonly label: string;
    /**
     * 문자열·숫자면 `kind` 가 형식을 정하고, 그 밖의 노드는 그대로 그린다.
     * StatusBadge 처럼 이미 그려진 것을 넣을 수 있다.
     */
    readonly value: React.ReactNode;
    /** DataTable 과 같은 셀 종류. 금액·시간·날짜 표기가 표와 상세에서 갈리지 않게 한다 */
    readonly kind?: CellKind;
    readonly href?: string;
    /**
     * 그 자리에서 고치는 방법. 주지 않으면 종전처럼 읽기만 한다.
     * 갈래와 판정은 `edit.ts` 가 갖는다.
     */
    readonly edit?: PropertyEdit;
}

/** 고를 거리 하나. 값 → 문구·tone 대응은 호출부(도메인)가 갖는다 */
export interface PropertyOption
{
    readonly value: string;
    readonly label: string;
    readonly tone?: Tone;
    /** 이름만으로 무엇을 고르는지 갈리지 않는 자리에 붙는 한 줄 */
    readonly description?: string;
}

/** ① 글 · 수 — 누르면 테두리 없는 칸이 그 자리에 선다 */
export interface TextEdit
{
    readonly kind: "text";
    /** 칸에 담기는 날것. 그려지는 값(`Property.value`)과 다를 수 있다 */
    readonly value: string;
    /** 참이면 여러 줄로 선다. Enter 가 줄바꿈이 되고 저장은 벗어날 때 한다 */
    readonly multiline?: boolean;
    readonly placeholder?: string;
    readonly onCommit: (value: string) => void;
}

/** ② 날짜 — 눌러서 달력 */
export interface DateEdit
{
    readonly kind: "date";
    /** `yyyy-MM-dd`. 비우면 아직 없는 날짜다 */
    readonly value?: string;
    readonly onCommit: (value: string | null) => void;
}

/** ③ 하나 고르기 */
export interface SelectEdit
{
    readonly kind: "select";
    readonly value?: string;
    readonly options: ReadonlyArray<PropertyOption>;
    /** 참이면 비우는 것도 고를 거리다 */
    readonly clearable?: boolean;
    readonly onCommit: (value: string | null) => void;
}

/** ④ 여럿 고르기 — 칩과 더하기 */
export interface MultiEdit
{
    readonly kind: "multi";
    readonly value: ReadonlyArray<string>;
    readonly options: ReadonlyArray<PropertyOption>;
    readonly max?: number;
    readonly onCommit: (value: ReadonlyArray<string>) => void;
}

/**
 * ⑤ 전이 — 허용된 곳만 서고 사유를 받는다.
 *
 * ⚠ **`options` 는 도메인이 준 것이다.** advisor 에서는 `allowedTransitions(from)` 의 결과에
 * 문구와 tone 만 입혀 넘긴다. 블록이 표를 갖지 않는 까닭은 `edit.ts` 머리말에 있다.
 */
export interface TransitionEdit
{
    readonly kind: "transition";
    readonly value: string;
    readonly options: ReadonlyArray<PropertyOption>;
    /** 기본은 받되 비워도 된다. 되돌리는 전이처럼 까닭이 남아야 하는 자리만 `required` 로 둔다 */
    readonly reason?: "required" | "optional" | "none";
    readonly onCommit: (value: string, reason: string) => void;
}

/**
 * ⑥ 잠김 — 못 누르고 까닭이 붙는다.
 *
 * ⚠ **`reason` 을 비우지 않는다.** 회색으로만 두면 사람이 고장으로 읽고 다시 누른다.
 * advisor 에서는 청구가 나간 달의 시간이 이 자리다(INV-LEGAL-09).
 */
export interface LockedEdit
{
    readonly kind: "locked";
    readonly reason: string;
}

/** ⑦ 셈한 값 — 아예 칸이 아니다. 커서가 서면 고칠 수 있다고 읽힌다 */
export interface DerivedEdit
{
    readonly kind: "derived";
    /** 어디서 셈했는지 한 마디. 비우면 값만 선다 */
    readonly from?: string;
}

export type PropertyEdit =
    | TextEdit
    | DateEdit
    | SelectEdit
    | MultiEdit
    | TransitionEdit
    | LockedEdit
    | DerivedEdit;

export type PropertyEditKind = PropertyEdit["kind"];

export interface PropertyListLabels
{
    readonly edit: (label: string) => string;
    readonly choose: (label: string) => string;
    readonly add: (label: string) => string;
    readonly remove: (label: string) => string;
    readonly search: string;
    readonly noResults: string;
    readonly clear: string;
    readonly reason: string;
    readonly confirm: string;
    readonly transitionTitle: (label: string) => string;
}

export interface PropertyListProps
{
    readonly items: ReadonlyArray<Property>;
    /** horizontal 은 라벨을 왼쪽에 고정하고, vertical 은 라벨을 값 위에 둔다 */
    readonly orientation?: "horizontal" | "vertical";
    readonly columns?: 1 | 2;
    /**
     * 라벨 열 폭. 화면마다 달라지는 값이라 토큰이 아니라 이 기본값이다.
     * 2026-09-06 사용자 결정.
     */
    readonly labelWidth?: number;
    readonly divider?: "line" | "none";
    /** 값이 비었을 때 그리는 글자. 빈칸은 「아직 안 불러왔다」와 구분되지 않는다 */
    readonly emptyValue?: string;
    /**
     * 참이면 고치는 칸이 전부 읽는 모양으로 선다. 열람권이 갈리는 자리다.
     * 잠김은 자기 까닭을 그대로 들고 선다.
     */
    readonly readOnly?: boolean;
    readonly labels?: Partial<PropertyListLabels>;
    readonly className?: string;
}
