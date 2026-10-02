import type React from "react";

import type { Tone } from "../tone";

export interface StatTrend
{
    readonly direction: "up" | "down";
    /**
     * 증감이 좋은 일인지 나쁜 일인지는 지표마다 다르다. 매출이 오르면 success 지만
     * 지연 건수가 오르면 danger 다. 그래서 방향과 tone 을 따로 받는다. 비우면 neutral.
     */
    readonly tone?: Tone;
    /** 화면 낭독기용 설명. 비우면 방향만 읽힌다 */
    readonly label?: string;
}

export interface StatCardProps
{
    readonly label: string;
    /** 이미 형식이 정해진 문자열. 숫자 형식은 호출부가 정한다 */
    readonly value: string;
    readonly description?: string;
    /**
     * 라벨 앞에 서는 글리프. 숫자만 넉 장 늘어서면 어느 것이 무엇인지 라벨을 읽어야 알므로,
     * 훑을 때 자리를 짚어 주는 표시다.
     *
     * ⚠ 크기는 주지 않아도 된다 — 블록이 2층의 `--control-icon-size-md` 로 재운다.
     *    다른 크기가 필요하면 호출부가 `className` 으로 적어 넘기고 그것을 그대로 쓴다.
     */
    readonly icon?: React.ReactNode;
    readonly trend?: StatTrend;
    /**
     * 카드 머리 오른쪽에 붙는 조각. 누르면 같은 조건으로 걸러진 목록이 열리는 카드가 그 표시를 여기 둔다.
     *
     * ⚠ 블록이 링크를 만들지 않는다. 주소를 아는 것은 앱이고(경로 헬퍼) 블록은 Next 를 모른다 —
     *    호출부가 카드를 `<Link>` 로 감싸고 여기에는 표시만 넣는다.
     */
    readonly action?: React.ReactNode;
    readonly size?: "default" | "sm";
    readonly className?: string;
}

export interface StatGridProps
{
    readonly columns?: 2 | 3 | 4;
    readonly children: React.ReactNode;
    readonly className?: string;
}
