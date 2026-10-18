import type { FinancialSeries, FinancialsView } from "../investing/contract";

import { Bars } from "./charts";
import { financialsContext } from "./context";
import { COPY } from "./copy";
import { formatCompact, formatPct } from "./format";
import { ActionButton, AddToggle, CompanyTitle, InlineCard, Notice, Pending, type ScreenProps } from "./parts";

/**
 * 재무 추이. 첫 계열을 막대로 세우고, 그 아래 계열 셋까지의 작은 표를 붙인다(TIKR 의 짜임).
 * 칸마다 단위를 함께 쓴다. 금액은 「2.7조」 · 「3,456억」, 비율은 「12.3%」라 줄마다 단위가 달라도 머리에 단위를 따로 두지 않는다.
 * 카드 안에서 기간을 바꾸지 않는다. 「분기로 보기」가 대화에 말을 보내고 모델이 같은 도구를 다시 부른다.
 *
 * ⚠ **막대와 표는 같은 마지막 다섯 기간을 싣는다.** 카드 안에서 가로로 밀지 않는다. 표의 열이 막대 바로 아래에 서도록
 *    막대 판을 표의 첫 열 너비(`LEAD`)만큼 오른쪽으로 민다. 기간 글자는 표의 머리가 맡는다.
 */
const TABLE_COLUMNS = 5;
const LEAD = "28%";

const cellOf = (series: FinancialSeries, label: string): string =>
{
    const value = series.points.find((point) => point.label === label)?.value ?? null;

    return series.unit === "won" ? formatCompact(value) : formatPct(value);
};

export function FinancialsScreen({ view, state, onAction }: ScreenProps<FinancialsView>)
{
    const first = view?.series[0] ?? null;
    const columns = first?.points.map((point) => point.label).slice(-TABLE_COLUMNS) ?? [];
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
                    {view === null ? <Pending className="w-16" /> : view.basis === "quarter" ? COPY.financials.quarter : COPY.financials.annual}
                </span>
            </div>
            {empty
                ? <p className="text-sm text-muted-foreground">{COPY.financials.empty}</p>
                : (
                    <>
                        <div className="flex flex-col" style={{ paddingLeft: LEAD }}>
                            <Bars
                                labels={columns}
                                legend={false}
                                axis={false}
                                height={76}
                                series={first === null
                                    ? []
                                    : [{ key: first.key, label: first.label, values: columns.map((label) => first.points.find((point) => point.label === label)?.value ?? null), background: "bg-chart-2", swatch: "bg-chart-2", unit: first.unit }]}
                            />
                        </div>
                        <table className="-mt-1.5 w-full table-fixed text-[13px] tabular-nums">
                            <thead>
                                <tr className="border-b text-[11px] text-muted-foreground">
                                    <th className="py-1.5 text-left font-medium" style={{ width: LEAD }}>&nbsp;</th>
                                    {(view === null ? ["", "", "", "", ""] : columns).map((label, index) => (
                                        <th key={`${label}-${index}`} className={index === columns.length - 1 ? "py-1.5 text-center font-medium text-foreground" : "py-1.5 text-center font-medium"}>{label === "" ? <Pending className="w-8" /> : label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(view === null ? [null, null, null] : series).map((each, row) => (
                                    <tr key={each?.key ?? row} className="border-b last:border-0">
                                        <th scope="row" className="truncate py-2 text-left font-medium">
                                            {each === null ? <Pending className="w-12" /> : each.label}
                                        </th>
                                        {(each === null ? ["", "", "", "", ""] : columns).map((label, index) => (
                                            <td key={`${label}-${index}`} className="py-2 text-center">{each === null ? <Pending className="w-10" /> : cellOf(each, label)}</td>
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
