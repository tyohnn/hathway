import type { ValuationCell, ValuationView } from "../investing/contract";

import { Ladder } from "./charts";
import { COPY } from "./copy";
import { formatPct, formatPrice } from "./format";
import { ActionButton, CompanyTitle, InlineCard, Notice, Pending, Section, SourceLine, WideFrame, type OnAction, type ScreenProps } from "./parts";
import { isWide, type AppState } from "./state";

/**
 * 적정가. 큰 숫자 둘(적정가 · 매수가, 오늘 주가를 받았으면 셋)과 한 줄의 사다리(매수가 · 적정가 · 오늘 주가)를 먼저 세운다(Simply Wall St 의 적정가 막대,
 * Morningstar 의 적정가와 안전마진). 시나리오 9칸과 가정은 크게 보기에 둔다.
 *
 * ⚠ **계산을 거절했으면 숫자를 그리지 않는다.** 거절한 까닭 한 줄만 세운다. 「0원」이나 「–」로 숫자가 있는 척하지 않는다.
 */
export function ValuationScreen({ view, state, onAction }: ScreenProps<ValuationView>)
{
    return isWide(state) ? <ValuationWide view={view} state={state} onAction={onAction} /> : <ValuationCard view={view} state={state} onAction={onAction} />;
}

/** 매수가는 보일 때만 100원 아래를 버린다. 계산값은 서버의 것을 그대로 둔다 */
const shownBuy = (value: number | null): number | null => (value === null ? null : Math.floor(value / 100) * 100);

/** 거절이 「PER 대신 PSR 로」일 때만 PSR 로 다시 계산하자는 단추를 세운다 */
const suggestsPsr = (view: ValuationView | null): boolean =>
    view !== null && view.method === "per" && view.refusal !== null && view.refusal.includes("PSR");

const subtitle = (view: ValuationView): string => `${COPY.valuation.year(view.targetYear)} · ${COPY.valuation.method[view.method]}`;

function Headline({ view, size }: { readonly view: ValuationView | null; readonly size: "md" | "lg" })
{
    const current = view?.currentPrice ?? null;
    // 카드 안에 숫자가 셋 서면 한 단 줄여 한 줄에 들게 한다
    const big = size === "lg" ? "text-3xl" : current === null ? "text-2xl" : "text-xl";

    return (
        <div className={current === null ? "grid grid-cols-2 gap-4" : "grid grid-cols-3 gap-4"}>
            <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">{COPY.valuation.fair}</span>
                <span className={`${big} font-semibold tracking-tight tabular-nums`}>{view === null ? <Pending className="w-28" /> : formatPrice(view.fairPrice)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">{COPY.valuation.buy} <span>({COPY.valuation.buyHint})</span></span>
                <span className={`${big} font-semibold tracking-tight tabular-nums`}>{view === null ? <Pending className="w-24" /> : formatPrice(shownBuy(view.buyPrice))}</span>
            </div>
            {current === null
                ? null
                : (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-muted-foreground">{COPY.valuation.current}</span>
                        <span className={`${big} font-semibold tracking-tight text-muted-foreground tabular-nums`}>{formatPrice(current)}</span>
                    </div>
                )}
        </div>
    );
}

/** 오늘 주가와 매수가 사이의 거리를 한 문장으로. 오늘 주가가 없으면 넣어 달라는 말 */
function GapLine({ view }: { readonly view: ValuationView | null })
{
    if (view === null)
    {
        return <p className="text-xs"><Pending className="w-48" /></p>;
    }

    if (view.currentPrice === null || view.gapToBuyPct === null)
    {
        return <p className="text-xs text-muted-foreground">{COPY.valuation.noCurrent}</p>;
    }

    const pct = formatPct(Math.abs(view.gapToBuyPct));

    return (
        <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{pct === formatPct(0) ? COPY.valuation.same : view.gapToBuyPct > 0 ? COPY.valuation.gap(pct) : COPY.valuation.below(pct)}</span>
            {view.currentPriceSource === null ? null : <span> · {view.currentPriceSource}</span>}
        </p>
    );
}

function Refusal({ text }: { readonly text: string })
{
    return (
        <div className="flex flex-col gap-1 rounded-md bg-muted/50 px-3 py-2.5 ring-1 ring-border" data-refusal="">
            <span className="text-sm font-medium">{COPY.valuation.refused}</span>
            <span className="text-xs text-muted-foreground">{text}</span>
        </div>
    );
}

function CardActions({ view, state, onAction }: { readonly view: ValuationView | null; readonly state: AppState; readonly onAction: OnAction })
{
    const refused = view?.refusal !== null && view?.refusal !== undefined;

    if (refused)
    {
        return state.abilities.message && suggestsPsr(view)
            ? (
                <ActionButton name="use-psr" size="sm" onAction={onAction} action={{ kind: "send", text: COPY.prompts.psr(view?.company.name ?? "") }}>
                    {COPY.actions.psr}
                </ActionButton>
            )
            : null;
    }

    return (
        <>
            {state.canFullscreen && !refused
                ? <ActionButton name="scenarios" size="sm" disabled={view === null} onAction={onAction} action={{ kind: "fullscreen" }}>{COPY.actions.scenarios}</ActionButton>
                : null}
            {state.abilities.message && !refused
                ? (
                    <ActionButton name="save-board" size="sm" variant="outline" disabled={view === null} onAction={onAction}
                        action={{ kind: "send", text: COPY.prompts.saveBoard(view?.company.name ?? "") }}
                    >
                        {COPY.actions.saveBoard}
                    </ActionButton>
                )
                : null}
        </>
    );
}

function ValuationCard({ view, state, onAction }: ScreenProps<ValuationView>)
{
    return (
        <InlineCard page="valuation" loading={view === null} source={view?.source ?? null} actions={<CardActions view={view} state={state} onAction={onAction} />}>
            <CompanyTitle
                company={view?.company ?? null}
                trailing={<span className="text-xs text-muted-foreground">{view === null ? null : subtitle(view)}</span>}
            />
            {view?.refusal !== null && view?.refusal !== undefined
                ? <Refusal text={view.refusal} />
                : (
                    <>
                        <Headline view={view} size="md" />
                        <Ladder buy={shownBuy(view?.buyPrice ?? null)} fair={view?.fairPrice ?? null} current={view?.currentPrice ?? null} />
                        <GapLine view={view} />
                    </>
                )}
            <Notice text={state.notice} />
        </InlineCard>
    );
}

const REVENUE_CASES = ["bear", "base", "bull"] as const;
const PER_CASES = ["low", "mid", "high"] as const;

const cellOf = (cells: ReadonlyArray<ValuationCell>, revenue: ValuationCell["revenueCase"], per: ValuationCell["perCase"]): number | null =>
    cells.find((cell) => cell.revenueCase === revenue && cell.perCase === per)?.fairPrice ?? null;

function ValuationWide({ view, state, onAction }: ScreenProps<ValuationView>)
{
    const refused = view?.refusal !== null && view?.refusal !== undefined;

    return (
        <WideFrame page="valuation" loading={view === null}>
            <header className="flex flex-wrap items-start justify-between gap-3">
                <CompanyTitle company={view?.company ?? null} size="lg" trailing={<span className="text-sm text-muted-foreground">{view === null ? null : subtitle(view)}</span>} />
                {state.abilities.message && !refused
                    ? (
                        <ActionButton name="save-board" size="sm" disabled={view === null} onAction={onAction} action={{ kind: "send", text: COPY.prompts.saveBoard(view?.company.name ?? "") }}>
                            {COPY.actions.saveBoard}
                        </ActionButton>
                    )
                    : null}
            </header>
            <Notice text={state.notice} />
            {refused && view?.refusal !== null && view?.refusal !== undefined
                ? <Refusal text={view.refusal} />
                : (
                    <>
                        <div className="flex flex-col gap-4 rounded-lg border p-5">
                            <Headline view={view} size="lg" />
                            <Ladder buy={shownBuy(view?.buyPrice ?? null)} fair={view?.fairPrice ?? null} current={view?.currentPrice ?? null} />
                            <GapLine view={view} />
                        </div>
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                            <Section title={COPY.valuation.grid}>
                                <table className="w-full table-fixed text-sm tabular-nums">
                                    <thead>
                                        <tr className="text-xs text-muted-foreground">
                                            <th className="py-2 text-left font-medium">&nbsp;</th>
                                            {PER_CASES.map((per) => <th key={per} className="py-2 text-right font-medium">{COPY.valuation.perCase[per]}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {REVENUE_CASES.map((revenue) => (
                                            <tr key={revenue} className="border-t">
                                                <th scope="row" className="py-3 text-left text-xs font-medium text-muted-foreground">{COPY.valuation.revenueCase[revenue]}</th>
                                                {PER_CASES.map((per) =>
                                                {
                                                    const base = revenue === "base" && per === "mid";

                                                    return (
                                                        <td key={per} className="p-1 text-right">
                                                            <span className={base ? "block rounded-md bg-primary/15 px-2 py-2 font-semibold ring-1 ring-primary" : "block rounded-md bg-muted/40 px-2 py-2"} data-base={base ? "" : undefined}>
                                                                {view === null ? <Pending className="w-14" /> : formatPrice(cellOf(view.cells, revenue, per))}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Section>
                            <Section title={COPY.valuation.assumptions}>
                                <ul className="flex flex-col gap-2 text-sm">
                                    {(view?.assumptions ?? [null, null, null]).map((line, index) => (
                                        <li key={line ?? index} className="flex gap-2">
                                            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" />
                                            <span>{line === null ? <Pending className="w-48" /> : line}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        </div>
                    </>
                )}
            <SourceLine source={view?.source ?? null} />
        </WideFrame>
    );
}
