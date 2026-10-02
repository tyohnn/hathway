import type React from "react";

import type { Tone } from "../tone";

export interface ListItem
{
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    /** 오른쪽 끝의 짧은 보조 정보(시각·수량 등) */
    readonly meta?: string;
    /** 아이콘·아바타·이미지. 무엇을 넣을지는 호출부가 정한다 */
    readonly media?: React.ReactNode;
    readonly tone?: Tone;
    readonly actions?: React.ReactNode;
    readonly disabled?: boolean;
}

export interface ItemListProps
{
    readonly items: ReadonlyArray<ListItem>;
    /** plain 은 면이 없고, card 는 항목마다 테두리, divided 는 사이에 구분선 */
    readonly appearance?: "plain" | "card" | "divided";
    readonly density?: "default" | "compact";
    readonly selectedId?: string;
    readonly onItemPress?: (item: ListItem) => void;
    /** 비었을 때 그릴 것. 비우면 기본 문구 */
    readonly empty?: React.ReactNode;
    readonly labels?: Partial<ItemListLabels>;
    /**
     * 항목이 오기 전. 같은 묶음 · 같은 줄 · 같은 구분선에 제목 · 설명 자리만 막대로 선다. `items` 는 보지 않는다.
     * 화면의 `<Suspense fallback>` 은 따로 그린 뼈대가 아니라 이것이다
     */
    readonly loading?: boolean;
    /** 기다리는 동안 세울 줄 수. 기본 3 */
    readonly loadingRows?: number;
    readonly className?: string;
}

export interface ItemListLabels
{
    readonly empty: string;
}
