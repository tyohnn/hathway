import type { PeerRow, PeersView } from "../investing/contract";

import { peersContext } from "./context";
import { COPY } from "./copy";
import { formatCompact, formatPct } from "./format";
import { ActionButton, AddToggle, Delta, InlineCard, Notice, Pending, type ScreenProps } from "./parts";

/**
 * 피어 비교 표. 이 종목의 줄은 굵게 하고 강조 바탕과 왼쪽 세로선을 둔다. 열은 매출 · 성장률 · 영업이익률 · ROE 넷이다(Seeking Alpha 요인 표의 줄 구조).
 * 성장률은 ▲ · ▼ 와 함께 쓴다. 영업이익률 칸에는 숫자 옆에 작은 막대 트랙을 두어 피어 사이의 거리를 한눈에 보이게 한다.
 */
const ROWS_WHILE_LOADING = 5;

export function PeersScreen({ view, state, onAction }: ScreenProps<PeersView>)
{
    const focus = view?.rows.find((each) => each.focus) ?? view?.rows[0] ?? null;
    const topOpm = Math.max(1, ...(view?.rows.map((each) => each.opmPct ?? 0) ?? []));

    return (
        <InlineCard
            page="peers"
            loading={view === null}
            source={view?.source ?? null}
            actions={(
                <>
                    {state.abilities.message
                        ? (
                            <ActionButton name="value" size="sm" disabled={focus === null} onAction={onAction}
                                action={{ kind: "send", text: COPY.prompts.value(focus?.company.name ?? "") }}
                            >
                                {COPY.actions.value}
                            </ActionButton>
                        )
                        : null}
                    <AddToggle item={view === null ? null : peersContext(view)} state={state} onAction={onAction} />
                </>
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <h1 className="truncate text-base font-semibold tracking-tight">{view === null ? <Pending className="w-32" /> : view.title}</h1>
                <span className="shrink-0 text-[11px] text-muted-foreground">{view === null ? <Pending className="w-16" /> : `${view.period} · ▲▼ ${COPY.company.yoy}`}</span>
            </div>
            {view !== null && view.rows.length === 0
                ? <p className="text-sm text-muted-foreground">{COPY.peers.empty}</p>
                : (
                    <table className="w-full table-fixed text-[13px] tabular-nums">
                        <thead>
                            <tr className="border-b text-[11px] text-muted-foreground">
                                <th className="w-[26%] py-1.5 pl-2 text-left font-medium">{COPY.peers.company}</th>
                                <th className="w-[16%] py-1.5 text-right font-medium">{COPY.peers.revenue}</th>
                                <th className="w-[19%] py-1.5 text-right font-medium">{COPY.peers.growth}</th>
                                <th className="w-[24%] py-1.5 text-right font-medium">{COPY.peers.opm}</th>
                                <th className="py-1.5 pr-1 text-right font-medium">{COPY.peers.roe}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(view?.rows ?? Array.from({ length: ROWS_WHILE_LOADING }, () => null)).map((each, index) => (
                                <Row key={each?.company.stockCode ?? index} row={each} topOpm={topOpm} />
                            ))}
                        </tbody>
                    </table>
                )}
            <Notice text={state.notice} />
        </InlineCard>
    );
}

function Row({ row, topOpm }: { readonly row: PeerRow | null; readonly topOpm: number })
{
    if (row === null)
    {
        return (
            <tr className="border-b last:border-0">
                <td className="py-2 pl-2"><Pending className="w-16" /></td>
                {[0, 1, 2, 3].map((cell) => <td key={cell} className="py-2 text-right"><Pending className="w-10" /></td>)}
            </tr>
        );
    }

    const width = row.opmPct === null ? 0 : Math.max(Math.min(row.opmPct / topOpm, 1), 0) * 100;

    return (
        <tr className={row.focus ? "border-b bg-accent font-semibold text-accent-foreground last:border-0" : "border-b last:border-0"} data-focus={row.focus ? "" : undefined}>
            <th scope="row" className={row.focus ? "truncate py-2 pl-2 text-left font-[inherit] shadow-[inset_2px_0_0_var(--chart-1)]" : "truncate py-2 pl-2 text-left font-[inherit]"}>{row.company.name}</th>
            <td className="py-2 text-right">{formatCompact(row.revenue)}</td>
            <td className="py-2 text-right">{row.revenueGrowthPct === null ? "–" : <Delta value={row.revenueGrowthPct} unit="won" />}</td>
            <td className="py-2 text-right">
                <span className="inline-flex items-center justify-end gap-1.5">
                    <span aria-hidden className="relative h-1.5 w-8 overflow-hidden rounded-full bg-muted">
                        <span className="absolute inset-y-0 left-0 rounded-full bg-chart-1" style={{ width: `${width}%` }} />
                    </span>
                    <span className="w-11 text-right">{formatPct(row.opmPct)}</span>
                </span>
            </td>
            <td className="py-2 pr-1 text-right">{formatPct(row.roePct)}</td>
        </tr>
    );
}
