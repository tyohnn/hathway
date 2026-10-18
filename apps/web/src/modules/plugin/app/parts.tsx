import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@hathway/ui/components/badge";
import { Button } from "@hathway/ui/components/button";
import { Card } from "@hathway/ui/components/card";
import { Check, Plus } from "@hathway/ui/icons";
import { cn } from "@hathway/ui/lib/utils";

import { DISCLAIMER, type CompanyRef } from "../investing/contract";

import { COPY } from "./copy";
import { formatChange, toneOf, type Tone } from "./format";
import { isAdded, type AppState, type ContextItem } from "./state";

/** 화면이 호스트에 청하는 일. `main.tsx` 가 갈래마다 일을 잇는다 */
export type ScreenAction =
    | { readonly kind: "send"; readonly text: string }
    | { readonly kind: "fullscreen" }
    | { readonly kind: "toggle"; readonly item: ContextItem }
    | { readonly kind: "open"; readonly url: string };

export type OnAction = (action: ScreenAction) => void;

/** 화면 하나가 받는 것. `view` 가 `null` 이면 같은 틀의 기다리는 얼굴을 그린다 */
export interface ScreenProps<V>
{
    readonly view: V | null;
    readonly state: AppState;
    readonly onAction: OnAction;
}

/** 단추마다 `data-action` 을 달아 e2e 가 이름으로 찾는다 */
export function ActionButton({ action, name, onAction, ...props }: {
    readonly action: ScreenAction;
    readonly name: string;
    readonly onAction: OnAction;
} & Omit<ComponentProps<typeof Button>, "onClick">)
{
    return <Button type="button" data-action={name} onClick={() => onAction(action)} {...props} />;
}

/** 「대화에 추가」. 붙인 것이면 「추가함」으로 서고 다시 누르면 뗀다. 호스트가 맥락을 받지 못하면 그리지 않는다 */
export function AddToggle({ item, state, onAction, label, className, size = "sm" }: {
    readonly item: ContextItem | null;
    readonly state: AppState;
    readonly onAction: OnAction;
    /** 카드가 여럿 서는 자리에서 읽는 사람에게 어느 것의 단추인지 덧붙인다 */
    readonly label?: string;
    readonly className?: string;
    readonly size?: "sm" | "xs";
})
{
    if (!state.abilities.modelContext)
    {
        return null;
    }

    const added = item !== null && isAdded(state, item.key);
    const text = added ? COPY.actions.added : COPY.actions.add;

    return (
        <Button
            type="button"
            variant="outline"
            size={size}
            className={className}
            data-action="toggle-context"
            aria-pressed={added}
            aria-label={label === undefined ? undefined : `${label} ${text}`}
            disabled={item === null}
            onClick={() => item !== null && onAction({ kind: "toggle", item })}
        >
            {added ? <Check aria-hidden /> : <Plus aria-hidden />}
            {text}
        </Button>
    );
}

/** 값 자리의 막대. 틀과 줄 높이는 그대로 두고 값만 비운다 */
export function Pending({ className }: { readonly className?: string })
{
    return <span aria-hidden className={cn("inline-block h-[0.8em] w-16 animate-pulse rounded-sm bg-foreground/10 align-middle", className)} />;
}

export const TONE_CLASS: Readonly<Record<Tone, string>> = {
    up: "text-up",
    down: "text-down",
    flat: "text-muted-foreground",
};

/** 전년 대비 변화. 색과 함께 ▲ · ▼ 를 붙인다 */
export function Delta({ value, unit, className }: { readonly value: number | null; readonly unit: "won" | "pct"; readonly className?: string })
{
    return value === null
        ? null
        : <span className={cn("tabular-nums", TONE_CLASS[toneOf(value)], className)}>{formatChange(value, unit)}</span>;
}

/** 종목 이름 줄. 이름 · 코드 · 시장, 그리고 업종 칩 */
export function CompanyTitle({ company, size = "md", trailing }: {
    readonly company: CompanyRef | null;
    readonly size?: "md" | "lg";
    readonly trailing?: ReactNode;
})
{
    return (
        <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className={cn("truncate font-semibold tracking-tight", size === "lg" ? "text-xl" : "text-base")}>
                    {company === null ? <Pending className="w-24" /> : company.name}
                </h1>
                <span className="text-xs text-muted-foreground tabular-nums">
                    {company === null
                        ? <Pending className="w-20" />
                        : [company.stockCode, company.market === null ? null : COPY.market[company.market]].filter((each) => each !== null).join(" · ")}
                </span>
                {trailing}
            </div>
            {company === null
                ? <div className="flex"><Badge variant="secondary"><Pending className="w-20" /></Badge></div>
                : company.sector === null ? null : <div className="flex"><Badge variant="secondary">{company.sector}</Badge></div>}
        </div>
    );
}

/** 숫자가 나오는 모든 카드의 바닥. 출처 한 줄과 투자 판단의 책임 한 줄 */
export function SourceLine({ source }: { readonly source: string | null })
{
    return (
        <footer className="flex flex-col gap-0.5 text-[11px] leading-4 text-muted-foreground">
            <span>{source === null ? <Pending className="w-40" /> : `출처: ${source}`}</span>
            <span>{DISCLAIMER}</span>
        </footer>
    );
}

/** 대화 안 카드의 틀. 머리 · 본문 · 단추 줄 · 바닥이 늘 같은 차례로 선다 */
export function InlineCard({ page, loading, children, actions, source }: {
    readonly page: string;
    readonly loading: boolean;
    readonly children: ReactNode;
    readonly actions?: ReactNode;
    readonly source: string | null;
})
{
    return (
        <main className="p-px" data-page={page} data-loading={loading ? "" : undefined} aria-busy={loading}>
            <Card size="sm" className="gap-3 px-4">
                {children}
                {actions === undefined || actions === null ? null : <div className="flex flex-wrap gap-2">{actions}</div>}
                <SourceLine source={source} />
            </Card>
        </main>
    );
}

/** 넓은 자리(크게 보기 · 사이드바)의 틀. 카드 없이 판 위에 바로 선다 */
export function WideFrame({ page, loading, children }: { readonly page: string; readonly loading: boolean; readonly children: ReactNode })
{
    return (
        <main
            className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 py-6"
            data-page={page}
            data-display="fullscreen"
            data-loading={loading ? "" : undefined}
            aria-busy={loading}
        >
            {children}
        </main>
    );
}

/** 넓은 자리의 묶음 하나. 제목 줄 오른쪽에 덧붙일 것이 선다 */
export function Section({ title, aside, children, className }: {
    readonly title: string;
    readonly aside?: ReactNode;
    readonly children: ReactNode;
    readonly className?: string;
})
{
    return (
        <section className={cn("flex flex-col gap-3", className)}>
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold">{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

export function Notice({ text }: { readonly text: string | null })
{
    return text === null ? null : <p className="text-xs text-muted-foreground" role="status">{text}</p>;
}
