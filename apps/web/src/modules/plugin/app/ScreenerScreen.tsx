import type { ScreenRow, ScreenView } from "../investing/contract";

import { useState } from "react";

import { Badge } from "@hathway/ui/components/badge";
import { Button } from "@hathway/ui/components/button";
import { Check } from "@hathway/ui/icons";
import { cn } from "@hathway/ui/lib/utils";

import { screenRowContext } from "./context";
import { COPY } from "./copy";
import { formatCompact, formatPct } from "./format";
import { ActionButton, Delta, InlineCard, Notice, Pending, SourceLine, WideFrame, type OnAction, type ScreenProps } from "./parts";
import { isAdded, isWide, type AppState } from "./state";

/**
 * 종목 찾기 결과. 위에 조건 칩, 아래에 촘촘한 표(Finviz 스크리너의 짜임). 대화 안에서는 위의 다섯 줄만 미리 보이고 「크게 보기」로 넓힌다.
 * 넓은 자리에서는 줄 앞의 고르기 칸으로 여러 곳을 고르고, 바닥에 붙은 막대의 「대화에 추가」 하나로 한꺼번에 싣는다.
 * 「분석 시작」은 줄에 마우스를 올리거나 줄 안에 초점이 들어올 때 드러난다.
 */
const PREVIEW = 5;

export function ScreenerScreen({ view, state, onAction }: ScreenProps<ScreenView>)
{
    return isWide(state) ? <ScreenerWide view={view} state={state} onAction={onAction} /> : <ScreenerCard view={view} state={state} onAction={onAction} />;
}

function Filters({ view }: { readonly view: ScreenView | null })
{
    return (
        <div className="flex flex-wrap gap-1.5">
            {view === null
                ? [0, 1].map((index) => <Badge key={index} variant="outline"><Pending className="w-16" /></Badge>)
                : view.filters.map((filter) => <Badge key={filter} variant="outline">{filter}</Badge>)}
        </div>
    );
}

function ScreenerCard({ view, state, onAction }: ScreenProps<ScreenView>)
{
    const rows: ReadonlyArray<ScreenRow | null> = view?.rows.slice(0, PREVIEW) ?? Array.from({ length: PREVIEW }, () => null);

    return (
        <InlineCard
            page="screen"
            loading={view === null}
            source={view?.source ?? null}
            actions={state.canFullscreen
                ? <ActionButton name="fullscreen" size="sm" disabled={view === null} onAction={onAction} action={{ kind: "fullscreen" }}>{COPY.actions.fullscreen}</ActionButton>
                : null}
        >
            <div className="flex items-baseline justify-between gap-3">
                <h1 className="text-base font-semibold tracking-tight">{COPY.screen.title}</h1>
                <span className="text-xs text-muted-foreground tabular-nums">{view === null ? <Pending className="w-12" /> : COPY.screen.total(Math.min(view.rows.length, PREVIEW), view.total)}</span>
            </div>
            <Filters view={view} />
            {view !== null && view.rows.length === 0
                ? <p className="text-sm text-muted-foreground">{COPY.screen.empty}</p>
                : (
                    <table className="w-full table-fixed text-[13px] tabular-nums">
                        <Head />
                        <tbody>{rows.map((row, index) => <Row key={row?.company.stockCode ?? index} row={row} />)}</tbody>
                    </table>
                )}
            <Notice text={state.notice} />
        </InlineCard>
    );
}

function Head({ wide = false, selectable = false }: { readonly wide?: boolean; readonly selectable?: boolean })
{
    const cell = wide ? "px-3 py-2 text-right font-medium" : "py-1.5 text-right font-medium";

    return (
        <thead>
            <tr className={wide ? "border-b bg-muted/40 text-[11px] text-muted-foreground" : "border-b text-[11px] text-muted-foreground"}>
                {selectable ? <th className="w-10 py-2 pl-3"><span className="sr-only">{COPY.actions.select}</span></th> : null}
                <th className={wide ? "w-[26%] px-3 py-2 text-left font-medium" : "w-[30%] py-1.5 text-left font-medium"}>{COPY.peers.company}</th>
                <th className={cell}>{COPY.peers.revenue}</th>
                <th className={cell}>{COPY.screen.cagr}</th>
                <th className={cell}>{COPY.peers.opm}</th>
                <th className={cell}>{COPY.peers.roe}</th>
                {wide ? <th className="w-[120px] px-3 py-2" aria-hidden="true" /> : null}
            </tr>
        </thead>
    );
}

function Cells({ row, wide }: { readonly row: ScreenRow; readonly wide: boolean })
{
    const cell = wide ? "px-3 py-2.5 text-right" : "py-2 text-right";

    return (
        <>
            <td className={cell}>{formatCompact(row.revenue)}</td>
            <td className={cell}>{row.revenueCagrPct === null ? "–" : <Delta value={row.revenueCagrPct} unit="won" />}</td>
            <td className={cell}>{formatPct(row.opmPct)}</td>
            <td className={cell}>{formatPct(row.roePct)}</td>
        </>
    );
}

function Row({ row }: { readonly row: ScreenRow | null })
{
    return row === null
        ? (
            <tr className="border-b last:border-0">
                <td className="py-2"><Pending className="w-16" /></td>
                {[0, 1, 2, 3].map((cell) => <td key={cell} className="py-2 text-right"><Pending className="w-10" /></td>)}
            </tr>
        )
        : (
            <tr className="border-b last:border-0">
                <th scope="row" className="truncate py-2 text-left font-medium">{row.company.name}</th>
                <Cells row={row} wide={false} />
            </tr>
        );
}

function ScreenerWide({ view, state, onAction }: ScreenProps<ScreenView>)
{
    const rows: ReadonlyArray<ScreenRow | null> = view?.rows ?? Array.from({ length: 8 }, () => null);
    const picked = view?.rows.filter((row) => isAdded(state, `company:${row.company.stockCode}`)).length ?? 0;
    // 고른 것은 화면만 안다. 「대화에 추가」를 눌러야 대화의 맥락에 실린다
    const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
    const selectable = state.abilities.modelContext;
    const chosen = view?.rows.filter((row) => selected.has(row.company.stockCode)) ?? [];

    const toggle = (code: string): void =>
        setSelected((before) =>
        {
            const next = new Set(before);

            if (!next.delete(code))
            {
                next.add(code);
            }

            return next;
        });

    const addChosen = (): void =>
    {
        for (const row of chosen)
        {
            const item = screenRowContext(row);

            if (!isAdded(state, item.key))
            {
                onAction({ kind: "toggle", item });
            }
        }

        setSelected(new Set());
    };

    return (
        <WideFrame page="screen" loading={view === null}>
            <header className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h1 className="text-xl font-semibold tracking-tight">{COPY.screen.title}</h1>
                    <span className="text-sm text-muted-foreground tabular-nums">
                        {view === null ? <Pending className="w-16" /> : COPY.screen.total(view.rows.length, view.total)}
                    </span>
                </div>
                <Filters view={view} />
                {picked === 0 ? null : <p className="text-xs text-muted-foreground" role="status">{COPY.screen.picked(picked)}</p>}
            </header>
            <Notice text={state.notice} />
            {view !== null && view.rows.length === 0
                ? <p className="text-sm text-muted-foreground">{COPY.screen.empty}</p>
                : (
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full table-fixed text-sm tabular-nums">
                            <Head wide selectable={selectable} />
                            <tbody>
                                {rows.map((row, index) => (
                                    <WideRow
                                        key={row?.company.stockCode ?? index}
                                        row={row}
                                        state={state}
                                        onAction={onAction}
                                        selectable={selectable}
                                        selected={row !== null && selected.has(row.company.stockCode)}
                                        onSelect={toggle}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            {selectable && chosen.length > 0
                ? (
                    <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border bg-popover px-4 py-2.5 text-popover-foreground shadow-md" role="region" aria-label={COPY.screen.selected(chosen.length)}>
                        <span className="text-sm font-medium tabular-nums">{COPY.screen.selected(chosen.length)}</span>
                        <Button type="button" size="sm" data-action="add-selected" onClick={addChosen}>{COPY.actions.add}</Button>
                    </div>
                )
                : null}
            <SourceLine source={view?.source ?? null} />
        </WideFrame>
    );
}

function WideRow({ row, state, onAction, selectable, selected, onSelect }: {
    readonly row: ScreenRow | null;
    readonly state: AppState;
    readonly onAction: OnAction;
    readonly selectable: boolean;
    readonly selected: boolean;
    readonly onSelect: (code: string) => void;
})
{
    if (row === null)
    {
        return (
            <tr className="border-b last:border-0">
                {selectable ? <td className="py-3 pl-3"><span className="block size-4 rounded-[4px] border" /></td> : null}
                <td className="px-3 py-3"><Pending className="w-24" /></td>
                {[0, 1, 2, 3].map((cell) => <td key={cell} className="px-3 py-3 text-right"><Pending className="w-12" /></td>)}
                <td />
            </tr>
        );
    }

    const added = isAdded(state, screenRowContext(row).key);

    return (
        <tr className={cn("group border-b last:border-0 hover:bg-muted/40 focus-within:bg-muted/40", (selected || added) && "bg-accent hover:bg-accent")} data-selected={selected ? "" : undefined}>
            {selectable
                ? (
                    <td className="py-2.5 pl-3">
                        <button
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            aria-label={`${row.company.name} ${COPY.actions.select}`}
                            data-action="select-row"
                            onClick={() => onSelect(row.company.stockCode)}
                            className={cn(
                                "grid size-4 place-items-center rounded-[4px] border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                            )}
                        >
                            {selected ? <Check aria-hidden className="size-3" /> : null}
                        </button>
                    </td>
                )
                : null}
            <th scope="row" className="px-3 py-2.5 text-left font-medium">
                <span className="block truncate">{row.company.name}</span>
                <span className="block truncate text-[11px] font-normal text-muted-foreground">
                    {[row.company.stockCode, row.company.market === null ? null : COPY.market[row.company.market], added ? COPY.screen.added : null].filter((each) => each !== null).join(" · ")}
                </span>
            </th>
            <Cells row={row} wide />
            <td className="px-3 py-2.5">
                <div className="flex justify-end">
                    {state.abilities.message
                        ? (
                            <ActionButton
                                name="analyze"
                                size="xs"
                                variant="secondary"
                                className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                                onAction={onAction}
                                aria-label={`${row.company.name} ${COPY.actions.analyze}`}
                                action={{ kind: "send", text: COPY.prompts.analyze(row.company.name) }}
                            >
                                {COPY.actions.analyze}
                            </ActionButton>
                        )
                        : null}
                </div>
            </td>
        </tr>
    );
}
