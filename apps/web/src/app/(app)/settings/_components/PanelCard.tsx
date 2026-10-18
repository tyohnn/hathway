import type { ReactNode } from "react";

import { Card } from "@hathway/ui/components/card";
import { cn } from "@hathway/ui/lib/utils";

import "./settings.css";

interface PanelCardProps
{
    /** 머리의 제목(`h2`). 주지 않으면 머리가 서지 않는다 */
    readonly title?: ReactNode;
    /** 제목의 id. 주면 카드가 그 제목을 이름으로 갖는 구역(`region`)이 된다 */
    readonly headingId?: string;
    /** 제목 옆에 흐리게 서는 수. 「5명」 */
    readonly count?: ReactNode;
    /** 제목 아래 한 줄 */
    readonly description?: ReactNode;
    /** 머리 오른쪽 자리. 검색 · 조건 · 단추 */
    readonly action?: ReactNode;
    /** 몸 아래 줄. 왼쪽에 상태, 오른쪽에 단추가 선다 */
    readonly footer?: ReactNode;
    /** 몸이 카드의 가장자리까지 쓴다. 표를 넣을 때 준다 */
    readonly flush?: boolean;
    readonly busy?: boolean;
    readonly className?: string;
    readonly children: ReactNode;
}

/**
 * 설정 화면의 큰 카드. 선으로 가른 머리 · 몸 · 아래 줄이 한 장에 선다. 표 카드와 폼 카드가 같은 틀을 써서 세 화면의
 * 머리 높이와 여백이 같다.
 *
 * ⚠ 줄어들 수 있다(`min-w-0`). 격자의 칸에 서므로, 없으면 넓은 표가 칸을 밀어 화면 밖으로 나간다. 표는 카드 안에서 옆으로 구른다.
 * ⚠ 데이터를 모른다. 받은 조각을 제 자리에 세울 뿐이고, 기다리는 얼굴은 넣는 쪽이 값 자리에 막대(`PendingText`)를 넣어 만든다.
 * ⚠ 옆 기둥의 작은 카드는 이 틀이 아니라 시스템의 `Card size="sm"` 그대로다(머리에 선이 없다). 큰 카드와 작은 카드의
 *    무게를 그렇게 가른다.
 */
export function PanelCard({ title, headingId, count, description, action, footer, flush = false, busy = false, className, children }: PanelCardProps)
{
    return (
        <Card
            {...(headingId === undefined ? {} : { role: "region", "aria-labelledby": headingId })}
            aria-busy={busy || undefined}
            className={cn("min-w-0 gap-0 py-0", className)}
        >
            {title === undefined
                ? null
                : (
                    <div className="st-head flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <div className="flex items-baseline gap-2">
                                <h2 id={headingId} className="st-title">{title}</h2>
                                {count === undefined ? null : <span className="st-meta">{count}</span>}
                            </div>
                            {description === undefined ? null : <p className="st-meta">{description}</p>}
                        </div>
                        {action === undefined ? null : <div className="flex flex-wrap items-center gap-2">{action}</div>}
                    </div>
                )}
            <div className={flush ? "min-w-0" : "min-w-0 p-4"}>{children}</div>
            {footer === undefined ? null : <div className="st-foot flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">{footer}</div>}
        </Card>
    );
}
