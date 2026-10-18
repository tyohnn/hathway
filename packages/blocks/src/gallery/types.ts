import type React from "react";

import type { Tone } from "../tone";

/**
 * 갤러리의 카드 한 장. 그림이 위에 서고 아래에 제목과 보조 한 줄이 선다.
 *
 * ⚠ **`render` 는 링크다.** 블록은 `next/link` 를 모르므로 앱이 `render={<Link href={...} />}` 로 넘기고 블록이 카드 전체를
 *    그 자리에 끼운다(`AppShell` 의 메뉴와 같은 규약).
 */
export interface GalleryItem
{
    readonly id: string;
    readonly title: string;
    /** 제목 아래의 보조 한 줄. 만든 사람 · 쪽수 · 기한처럼 고를 때 보는 것 하나 */
    readonly meta?: string;
    /** 그림 주소. 없으면 그림 칸이 옅은 면으로 비어 선다. 같은 제목을 그림 칸에 다시 적지 않는다 */
    readonly image?: string | null;
    /** 그림 왼쪽 위의 배지. 「새로 나옴」 · 「10.19 마감」처럼 그 카드에만 붙는 짧은 말 */
    readonly badge?: string;
    readonly badgeTone?: Tone;
    readonly render: React.ReactElement<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
}

/**
 * 둘러보기의 판 하나. 갈래 하나로 들어가는 큰 타일이고, 그 갈래의 그림 몇 장이 부채처럼 겹쳐 선다.
 */
export interface GalleryTile
{
    readonly id: string;
    readonly title: string;
    readonly meta?: string;
    /** 부채로 겹칠 그림. 앞의 셋만 쓴다 */
    readonly images: ReadonlyArray<string>;
    readonly render: React.ReactElement<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
}

export interface GalleryLabels
{
    /** 묶음 머리 오른쪽의 링크 글 */
    readonly more: string;
    /** 그 링크의 이름. 같은 화면에 「모두 보기」 가 여럿이라 묶음 제목을 붙인다 */
    readonly moreName: (title: string) => string;
}

export type GallerySectionProps =
    & {
        readonly title: string;
        /** 묶음 전체로 가는 링크. 주지 않으면 「모두 보기」 가 서지 않는다 */
        readonly more?: React.ReactElement<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
        readonly labels?: Partial<GalleryLabels>;
        readonly className?: string;
    }
    & (
        | { readonly appearance?: "cards"; readonly items: ReadonlyArray<GalleryItem>; readonly loading?: false }
        | { readonly appearance?: "cards"; readonly loading: true; readonly loadingCount?: number }
        | { readonly appearance: "tiles"; readonly tiles: ReadonlyArray<GalleryTile> }
    );
