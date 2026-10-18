import type { ReactNode } from "react";

import "./settings.css";

export interface Fact
{
    readonly label: string;
    /** 기다리는 동안은 넣는 쪽이 막대(`PendingText`)를 넣는다 */
    readonly value: ReactNode;
}

/**
 * 이름과 값이 짝을 이루는 읽기 전용 줄. 이름이 왼쪽, 값이 오른쪽이고 줄 사이에 선이 선다.
 *
 * 코어 블록 `PropertyList` 를 쓰지 않는 까닭: 그 블록은 그 자리에서 고치는 축을 가진 표라 클라이언트 조각이고 값의 형식도
 * 스스로 정한다. 여기는 고칠 수 없는 사실 몇 줄이라 서버에서 그대로 그린다.
 */
export function FactList({ facts }: { readonly facts: ReadonlyArray<Fact> })
{
    return (
        <dl className="flex flex-col">
            {facts.map((fact) => (
                <div key={fact.label} className="st-fact flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
                    <dt className="st-meta st-nowrap">{fact.label}</dt>
                    <dd className="min-w-0 text-right">{fact.value}</dd>
                </div>
            ))}
        </dl>
    );
}
