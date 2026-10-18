import type { ScreenRow, ScreenView } from "../investing/contract";

import { Badge } from "@hathway/ui/components/badge";

import { screenRowContext } from "./context";
import { COPY } from "./copy";
import { formatEok, formatPct, formatSignedPct, toneOf } from "./format";
import { ActionButton, AddToggle, InlineCard, Notice, Pending, SourceLine, TONE_CLASS, WideFrame, type OnAction, type ScreenProps } from "./parts";
import { isAdded, isWide, type AppState } from "./state";

/**
 * 종목 찾기 결과. 위에 조건 칩, 아래에 촘촘한 표(Finviz 스크리너의 짜임). 줄마다 「분석 시작」과 「대화에 추가」가 있고, 「대화에 추가」는
 * 여러 줄을 담을 수 있다. 대화 안에서는 위의 다섯 줄만 미리 보이고 「크게 보기」로 넓힌다.
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
                    <table className="w-full table-fixed text-xs tabular-nums">
                        <Head />
                        <tbody>{rows.map((row, index) => <Row key={row?.company.stockCode ?? index} row={row} />)}</tbody>
                    </table>
                )}
            <Notice text={state.notice} />
        </InlineCard>
    );
}

function Head({ wide = false }: { readonly wide?: boolean })
{
    return (
        <thead>
            <tr className="border-b text-muted-foreground">
                <th className={wide ? "w-[24%] px-3 py-2 text-left font-medium" : "w-[30%] py-1.5 text-left font-medium"}>{COPY.peers.company}</th>
                <th className={wide ? "px-3 py-2 text-right font-medium" : "py-1.5 text-right font-medium"}>{COPY.peers.revenue}</th>
                <th className={wide ? "px-3 py-2 text-right font-medium" : "py-1.5 text-right font-medium"}>{COPY.screen.cagr}</th>
                <th className={wide ? "px-3 py-2 text-right font-medium" : "py-1.5 text-right font-medium"}>{COPY.peers.opm}</th>
                <th className={wide ? "px-3 py-2 text-right font-medium" : "py-1.5 text-right font-medium"}>{COPY.peers.roe}</th>
                {wide ? <th className="w-[230px] px-3 py-2" aria-hidden="true" /> : null}
            </tr>
        </thead>
    );
}

function Cells({ row, wide }: { readonly row: ScreenRow; readonly wide: boolean })
{
    const cell = wide ? "px-3 py-2.5 text-right" : "py-2 text-right";

    return (
        <>
            <td className={cell}>{formatEok(row.revenue)}</td>
            <td className={`${cell} ${TONE_CLASS[toneOf(row.revenueCagrPct)]}`}>{formatSignedPct(row.revenueCagrPct)}</td>
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
                            <Head wide />
                            <tbody>
                                {rows.map((row, index) => <WideRow key={row?.company.stockCode ?? index} row={row} state={state} onAction={onAction} />)}
                            </tbody>
                        </table>
                    </div>
                )}
            <SourceLine source={view?.source ?? null} />
        </WideFrame>
    );
}

function WideRow({ row, state, onAction }: { readonly row: ScreenRow | null; readonly state: AppState; readonly onAction: OnAction })
{
    if (row === null)
    {
        return (
            <tr className="border-b last:border-0">
                <td className="px-3 py-3"><Pending className="w-24" /></td>
                {[0, 1, 2, 3].map((cell) => <td key={cell} className="px-3 py-3 text-right"><Pending className="w-12" /></td>)}
                <td />
            </tr>
        );
    }

    const item = screenRowContext(row);

    return (
        <tr className={isAdded(state, item.key) ? "border-b bg-muted/50 last:border-0" : "border-b last:border-0"}>
            <th scope="row" className="px-3 py-2.5 text-left font-medium">
                <span className="block truncate">{row.company.name}</span>
                <span className="block truncate text-[11px] font-normal text-muted-foreground">
                    {[row.company.stockCode, row.company.market === null ? null : COPY.market[row.company.market]].filter((each) => each !== null).join(" · ")}
                </span>
            </th>
            <Cells row={row} wide />
            <td className="px-3 py-2.5">
                <div className="flex justify-end gap-1.5">
                    {state.abilities.message
                        ? (
                            <ActionButton name="analyze" size="xs" variant="secondary" onAction={onAction} aria-label={`${row.company.name} ${COPY.actions.analyze}`}
                                action={{ kind: "send", text: COPY.prompts.analyze(row.company.name) }}
                            >
                                {COPY.actions.analyze}
                            </ActionButton>
                        )
                        : null}
                    <AddToggle item={item} state={state} onAction={onAction} size="xs" label={row.company.name} />
                </div>
            </td>
        </tr>
    );
}
