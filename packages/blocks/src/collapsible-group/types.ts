import type React from "react";

import type { Tone } from "../tone";

export interface CollapsibleGroupProps
{
    readonly title: string;
    /** 묶음이 담고 있는 수. 접어도 머리글에 남는다 */
    readonly count?: number;
    /** 주면 제어 모드다. 여닫는 상태를 호출부가 갖는다 */
    readonly open?: boolean;
    /** 비제어 모드의 처음 상태. 비우면 접혀 있다 */
    readonly defaultOpen?: boolean;
    readonly onOpenChange?: (open: boolean) => void;
    /** 머리글 오른쪽 버튼들. 여닫는 버튼 밖에 서므로 눌러도 묶음이 열리지 않는다 */
    readonly actions?: React.ReactNode;
    /** 수 배지의 색. 비우면 neutral 이다 */
    readonly tone?: Tone;
    readonly children: React.ReactNode;
    readonly labels?: Partial<CollapsibleGroupLabels>;
    readonly className?: string;
}

export interface CollapsibleGroupLabels
{
    readonly expand: string;
    readonly collapse: string;
    readonly count: (count: number) => string;
}
