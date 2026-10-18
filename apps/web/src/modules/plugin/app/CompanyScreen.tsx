import type { CSSProperties } from "react";

import { cn } from "@hathway/ui/lib/utils";

import type { CompanyView, KeyMetric, PeriodPoint } from "../investing/contract";

import { Bars, type BarSeries } from "./charts";
import { companyContext } from "./context";
import { COPY } from "./copy";
import { formatCompact, formatMetric } from "./format";
import { ActionButton, AddToggle, CompanyTitle, Delta, InlineCard, Notice, Pending, Section, SourceLine, WideFrame, type ScreenProps } from "./parts";
import { isWide } from "./state";

/**
 * 종목 요약. 대화 안에서는 숫자 셋과 5년 막대만 세우고 「분석 시작」으로 대화를 잇는다. 「크게 보기」를 누르면 같은 결과를 넓게 펴서
 * 핵심 지표 모두와 큰 막대와 연도별 표를 세운다(Koyfin 스냅숏 · FnGuide 하이라이트의 짜임).
 */
export function CompanyScreen({ view, state, onAction }: ScreenProps<CompanyView>)
{
    return isWide(state) ? <CompanyWide view={view} state={state} onAction={onAction} /> : <CompanyCard view={view} state={state} onAction={onAction} />;
}

const trendSeries = (revenue: ReadonlyArray<PeriodPoint>, operating: ReadonlyArray<PeriodPoint>, labels: ReadonlyArray<string>): ReadonlyArray<BarSeries> => [
    { key: "revenue", label: COPY.company.revenue, values: labels.map((label) => revenue.find((point) => point.label === label)?.value ?? null), background: "bg-chart-2", swatch: "bg-chart-2" },
    { key: "operating", label: COPY.company.operatingIncome, values: labels.map((label) => operating.find((point) => point.label === label)?.value ?? null), background: "bg-chart-1", swatch: "bg-chart-1" },
];

const labelsOf = (view: CompanyView | null): ReadonlyArray<string> => view?.revenue.map((point) => point.label) ?? [];

/** 숫자 묶음의 머리. 칸마다 「전년 대비」를 되풀이하지 않고 여기서 한 번 말한다 */
function YoyHead({ title }: { readonly title: string })
{
    return (
        <div className="flex items-baseline justify-between gap-3 text-[11px] text-muted-foreground">
            <span>{title}</span>
            <span>▲▼ {COPY.company.yoy}</span>
        </div>
    );
}

/** 숫자 하나의 칸. 라벨 · 값 · 전년 대비가 늘 같은 높이로 선다 */
function Metric({ metric, size = "md", className }: { readonly metric: KeyMetric | null; readonly size?: "md" | "lg"; readonly className?: string })
{
    return (
        <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
            <span className="truncate text-[11px] text-muted-foreground">{metric === null ? <Pending className="w-12" /> : metric.label}</span>
            <span className={size === "lg" ? "text-xl font-semibold tracking-tight tabular-nums" : "text-base font-semibold tracking-tight tabular-nums"}>
                {metric === null ? <Pending className="w-16" /> : formatMetric(metric.value, metric.unit, { compact: true })}
            </span>
            <span className="h-4 text-[11px]">
                {metric === null ? <Pending className="w-10" /> : <Delta value={metric.change} unit={metric.unit} />}
            </span>
        </div>
    );
}

function CompanyCard({ view, state, onAction }: ScreenProps<CompanyView>)
{
    const headline: ReadonlyArray<KeyMetric | null> = view?.headline.slice(0, 3) ?? [null, null, null];
    const labels = labelsOf(view);

    return (
        <InlineCard
            page="company"
            loading={view === null}
            source={view?.source ?? null}
            actions={(
                <>
                    {state.abilities.message
                        ? (
                            <ActionButton name="analyze" size="sm" disabled={view === null} onAction={onAction}
                                action={{ kind: "send", text: COPY.prompts.analyze(view?.company.name ?? "") }}
                            >
                                {COPY.actions.analyze}
                            </ActionButton>
                        )
                        : null}
                    {state.canFullscreen
                        ? <ActionButton name="fullscreen" size="sm" variant="outline" disabled={view === null} onAction={onAction} action={{ kind: "fullscreen" }}>{COPY.actions.fullscreen}</ActionButton>
                        : null}
                </>
            )}
        >
            <CompanyTitle company={view?.company ?? null} />
            <YoyHead title={COPY.company.headline} />
            <div className="-mt-2 grid grid-cols-3 gap-3">
                {headline.map((metric, index) => <Metric key={metric?.key ?? index} metric={metric} />)}
            </div>
            <Bars labels={labels} series={trendSeries(view?.revenue ?? [], view?.operatingIncome ?? [], labels)} height={64} />
            <Notice text={state.notice} />
        </InlineCard>
    );
}

function CompanyWide({ view, state, onAction }: ScreenProps<CompanyView>)
{
    const labels = labelsOf(view);
    const metrics: ReadonlyArray<KeyMetric | null> = view === null ? Array.from({ length: 6 }, () => null) : [...view.headline, ...view.metrics];
    const company = view?.company ?? null;
    // 여섯 칸까지는 한 줄, 그보다 많으면 두 줄로 고르게 나눈다
    const columns = metrics.length <= 6 ? metrics.length : Math.ceil(metrics.length / 2);

    return (
        <WideFrame page="company" loading={view === null}>
            <header className="flex flex-wrap items-start justify-between gap-3">
                <CompanyTitle company={company} size="lg" />
                <div className="flex gap-2">
                    {state.abilities.message
                        ? (
                            <ActionButton name="analyze" size="sm" disabled={view === null} onAction={onAction} action={{ kind: "send", text: COPY.prompts.analyze(company?.name ?? "") }}>
                                {COPY.actions.analyze}
                            </ActionButton>
                        )
                        : null}
                    <AddToggle item={view === null ? null : companyContext(view.company, view.headline, view.source)} state={state} onAction={onAction} />
                </div>
            </header>
            <Notice text={state.notice} />
            <Section title={COPY.company.allMetrics} aside={<span className="text-[11px] text-muted-foreground">▲▼ {COPY.company.yoy}</span>}>
                {/* 칸 수에 열을 맞추고 칸 사이를 1px 선으로 나눈다. 바탕이 선 색이고 칸이 판 색이다 */}
                <div
                    className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-[repeat(var(--metric-columns),minmax(0,1fr))]"
                    style={{ "--metric-columns": columns } as CSSProperties}
                >
                    {metrics.map((metric, index) => <Metric key={metric?.key ?? index} metric={metric} size="lg" className="bg-background p-4" />)}
                    {Array.from({ length: (columns - (metrics.length % columns)) % columns }, (_, index) => <span key={`fill-${index}`} aria-hidden className="hidden bg-background lg:block" />)}
                </div>
            </Section>
            <Section title={COPY.company.trend}>
                <Bars labels={labels} series={trendSeries(view?.revenue ?? [], view?.operatingIncome ?? [], labels)} height={160} />
            </Section>
            <Section title={COPY.company.table}>
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm tabular-nums">
                        <thead>
                            <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                                <th className="px-3 py-2 text-left font-medium">&nbsp;</th>
                                {(labels.length === 0 ? ["", "", "", "", ""] : labels).map((label, index) => <th key={`${label}-${index}`} className="px-3 py-2 text-right font-medium">{label === "" ? <Pending className="w-8" /> : label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { key: "revenue", label: COPY.company.revenue, points: view?.revenue ?? null },
                                { key: "operating", label: COPY.company.operatingIncome, points: view?.operatingIncome ?? null },
                            ].map((line) => (
                                <tr key={line.key} className="border-b last:border-0">
                                    <th scope="row" className="px-3 py-2 text-left font-medium">{line.label}</th>
                                    {(labels.length === 0 ? ["", "", "", "", ""] : labels).map((label, index) => (
                                        <td key={`${label}-${index}`} className="px-3 py-2 text-right">
                                            {line.points === null ? <Pending className="w-12" /> : formatCompact(line.points.find((point) => point.label === label)?.value ?? null)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
            <SourceLine source={view?.source ?? null} />
        </WideFrame>
    );
}
