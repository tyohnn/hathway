import type React from "react";

export type SectionHeaderLevel = 2 | 3 | 4;

export interface SectionHeaderProps
{
    readonly title: string;
    readonly description?: string;
    /** 제목 옆의 수. 형식 없이 그대로 적는다 */
    readonly count?: number;
    /** 문서의 제목 층. 비우면 3 이고, 패널 안의 구획이 그 자리다 */
    readonly level?: SectionHeaderLevel;
    /**
     * 제목 줄 오른쪽에 붙는 보조 한 줄.
     * 「검토가 끝나야 단계 완료 처리가 열려요」처럼 그 구획의 조건을 알리는 자리이고,
     * 누를 것이 아니라 읽을 것이라 actions 와 다른 칸이다.
     */
    readonly note?: React.ReactNode;
    /** 오른쪽 끝의 버튼들. 호출부가 Button 을 그대로 넣는다 */
    readonly actions?: React.ReactNode;
    readonly className?: string;
}
