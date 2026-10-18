import type { FinancialSeries, FinancialsView } from "../investing/contract";

import { Bars } from "./charts";
import { financialsContext } from "./context";
import { COPY } from "./copy";
import { formatEok, formatPct } from "./format";
import { ActionButton, AddToggle, CompanyTitle, InlineCard, Notice, Pending, type ScreenProps } from "./parts";

/**
 * 재무 추이. 첫 계열을 막대로 세우고, 그 아래 계열 셋까지의 작은 표를 붙인다. 단위는 머리에 한 번만 적고 칸에는 숫자만 쓴다(TIKR 의 짜임).
 * 카드 안에서 기간을 바꾸지 않는다. 「분기로 보기」가 대화에 말을 보내고 모델이 같은 도구를 다시 부른다.
 *
 * ⚠ **표는 마지막 다섯 기간만 싣는다.** 카드 안에서 가로로 밀지 않는다. 막대는 모든 기간을 그린다.
 */
const TABLE_COLUMNS = 5;

const cellOf = (series: FinancialSeries, label: string): string =>
{
    const value = series.points.find((point) => point.label === label)?.value ?? null;

    return series.unit === "won" ? formatEok(value) : formatPct(value);
};

export function FinancialsScreen({ view, state, onAction }: ScreenProps<FinancialsView>)
{
    const first = view?.series[0] ?? null;
    const labels = first?.points.map((point) => point.label) ?? [];
    const columns = labels.slice(-TABLE_COLUMNS);
    const series = view?.series.slice(0, 3) ?? [];
    const other = view?.basis === "quarter" ? "annual" : "quarter";
    const empty = view !== null && (first === null || first.points.every((point) => point.value === null));

    return (
        <InlineCard
            page="financials"
            loading={view === null}
            source={view?.source ?? null}
            actions={(
                <>
                    {state.abilities.message
                        ? (
                            <ActionButton name="basis" size="sm" disabled={view === null} onAction={onAction}
                                action={{ kind: "send", text: COPY.prompts.basis(view?.company.name ?? "", other) }}
                            >
                                {other === "quarter" ? COPY.actions.quarter : COPY.actions.annual}
                            </ActionButton>
                        )
                        : null}
                    <AddToggle item={view === null ? null : financialsContext(view)} state={state} onAction={onAction} />
                </>
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <CompanyTitle company={view?.company ?? null} />
                <span className="shrink-0 text-[11px] text-muted-foreground">
                    {view === null ? <Pending className="w-16" /> : `${view.basis === "quarter" ? COPY.financials.quarter : COPY.financials.annual} · ${first?.unit === "pct" ? COPY.financials.unitPct : COPY.financials.unitWon}`}
                </span>
            </div>
            {empty
                ? <p className="text-sm text-muted-foreground">{COPY.financials.empty}</p>
                : (
                    <>
                        <Bars
                            labels={labels}
                            legend={false}
                            height={72}
                            series={first === null ? [] : [{ key: first.key, label: first.label, values: first.points.map((point) => point.value), fill: "fill-chart-1", swatch: "bg-chart-1" }]}
                        />
                        <table className="w-full table-fixed text-xs tabular-nums">
                            <thead>
                                <tr className="border-b text-muted-foreground">
                                    <th className="w-[28%] py-1.5 text-left font-medium">&nbsp;</th>
                                    {(view === null ? ["", "", "", "", ""] : columns).map((label, index) => (
                                        <th key={`${label}-${index}`} className="py-1.5 text-right font-medium">{label === "" ? <Pending className="w-8" /> : label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(view === null ? [null, null, null] : series).map((each, row) => (
                                    <tr key={each?.key ?? row} className="border-b last:border-0">
                                        <th scope="row" className="truncate py-1.5 text-left font-medium">
                                            {each === null ? <Pending className="w-12" /> : `${each.label}${each.unit === "pct" && first?.unit === "won" ? " (%)" : ""}`}
                                        </th>
                                        {(each === null ? ["", "", "", "", ""] : columns).map((label, index) => (
                                            <td key={`${label}-${index}`} className="py-1.5 text-right">{each === null ? <Pending className="w-10" /> : cellOf(each, label)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            <Notice text={state.notice} />
        </InlineCard>
    );
}
