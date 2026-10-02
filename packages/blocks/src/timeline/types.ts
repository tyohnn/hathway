import type React from "react";

import type { Tone } from "../tone";

export interface TimelineEvent
{
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    /** 이미 형식이 정해진 시각 문자열. 날짜 형식은 호출부가 정한다 */
    readonly at?: string;
    readonly tone?: Tone;
    /** 표식 아이콘. 비우면 tone 에 맞는 기본 표식 */
    readonly marker?: React.ReactNode;
    /** 아직 일어나지 않은 사건. 흐리게 그린다 */
    readonly pending?: boolean;
}

export interface TimelineProps
{
    readonly events: ReadonlyArray<TimelineEvent>;
    readonly density?: "default" | "compact";
    readonly empty?: React.ReactNode;
    readonly labels?: Partial<TimelineLabels>;
    readonly className?: string;
}

export interface TimelineLabels
{
    readonly empty: string;
}
