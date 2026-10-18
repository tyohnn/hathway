import type { ReactNode } from "react";

import { Progress, ProgressLabel, ProgressValue } from "@hathway/ui/components/progress";

import "./settings.css";

interface MeterProps
{
    /** 막대 위에 적는 글. 「20명 중 4명」 */
    readonly label: ReactNode;
    /** 0~100. 기다리는 동안은 주지 않는다 */
    readonly percent?: number;
    readonly loading?: boolean;
}

/**
 * 한도 가운데 얼마가 찼는지 보이는 막대 하나. 셈은 하지 않고 받은 값만 그린다.
 *
 * ⚠ `loading` 이면 막대는 빈 채로 서고 백분율을 적지 않는다. 0% 를 적으면 「하나도 안 썼다」로 읽힌다.
 * ⚠ 한도가 없는 자리에는 세우지 않는다. 눈금이 없는 막대는 잴 수 없다는 사실을 0% 로 바꿔 말한다.
 */
export function Meter({ label, percent = 0, loading = false }: MeterProps)
{
    return (
        <Progress value={loading ? 0 : percent}>
            <ProgressLabel>{label}</ProgressLabel>
            {loading ? null : <ProgressValue className="ml-auto" />}
        </Progress>
    );
}

export interface Figure
{
    readonly label: string;
    /** 기다리는 동안은 넣는 쪽이 막대(`PendingText`)를 넣는다 */
    readonly value: ReactNode;
}

/** 나란히 서는 숫자 몇 개. 숫자가 위, 이름이 아래다. 칸은 너비를 똑같이 나눠 갖는다 */
export function Figures({ items }: { readonly items: ReadonlyArray<Figure> })
{
    return (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((item) => (
                <div key={item.label} className="flex flex-col">
                    <span className="st-figure">{item.value}</span>
                    <span className="st-meta">{item.label}</span>
                </div>
            ))}
        </div>
    );
}
