import type React from "react";

export interface WorkbenchProps
{
    /** 왼쪽 기둥의 알맹이. 대개 목록이다 */
    readonly aside: React.ReactNode;
    /** 오른쪽 본문. 고른 것의 상세가 들어온다 */
    readonly children: React.ReactNode;
    /** 왼쪽 기둥의 폭(px). 비우면 360 이다 */
    readonly asideWidth?: number;
    /** 왼쪽 기둥 맨 위에 고정되는 자리. 검색과 조건 띠가 여기 선다 */
    readonly asideHeader?: React.ReactNode;
    /** 오른쪽이 비었을 때 그릴 것. 비우면 아무것도 그리지 않는다 */
    readonly empty?: React.ReactNode;
    readonly className?: string;
}
