import { cn } from "@hathway/ui/lib/utils";

import { COPY } from "./copy";
import { formatCompact, formatPct } from "./format";
import { Pending } from "./parts";

/**
 * 화면의 그림 둘. 막대(기간별 금액)와 사다리(매수가 · 적정가 · 오늘 주가를 한 줄 위에).
 *
 * 차트 묶음(recharts)을 싣지 않고 칸으로 그린다. 화면은 HTML 한 장이라 묶음이 작아야 빨리 뜨고, 그릴 것이 막대와 눈금뿐이다.
 * 색은 디자인 시스템의 차트 토큰(`--chart-*`)을 읽는다. 오르고 내림의 색(`text-up` · `text-down`)은 값의 방향에만 쓰고 막대에 쓰지 않는다.
 */
export interface BarSeries
{
    readonly key: string;
    readonly label: string;
    readonly values: ReadonlyArray<number | null>;
    /** 막대의 채움 색. `bg-chart-1` 같은 유틸리티 */
    readonly background: string;
    /** 범례 점의 색. `bg-chart-1` 같은 유틸리티 */
    readonly swatch: string;
    /** 막대 위 값의 단위. 없으면 금액이다 */
    readonly unit?: "won" | "pct";
}

/** 막대 위 값 글자가 설 자리(px). 음수가 있으면 0 아래에도 같은 만큼 둔다 */
const LABEL_ROOM = 14;

/** 기다리는 얼굴의 막대 높이(%). 값이 오면 같은 자리에 실제 막대가 선다 */
const PENDING_HEIGHTS = [42, 56, 48, 70, 62, 66, 74, 58] as const;

/**
 * 기간마다 계열 여럿을 나란히 세운 막대. 막대마다 위에 줄인 값(「2.7조」 · 「3,456억」)을 적고, 가장 최근 기간을 진하게 세운다.
 * 음수가 있으면 0 의 선을 가운데로 내린다. 값이 없는 칸은 비워 둔다.
 * `labels` 가 비면(기다리는 얼굴) 같은 높이에 옅은 막대만 그리고 범례는 감춘다.
 * `axis` 를 끄면 기간 글자를 그리지 않는다. 바로 아래 표의 머리가 그 자리를 맡을 때다.
 */
export function Bars({ labels, series, height = 96, className, legend = true, axis = true, slots: pendingSlots = 5 }: {
    readonly labels: ReadonlyArray<string>;
    readonly series: ReadonlyArray<BarSeries>;
    readonly height?: number;
    readonly className?: string;
    readonly legend?: boolean;
    readonly axis?: boolean;
    /** 기다리는 동안 그릴 기간 수 */
    readonly slots?: number;
})
{
    const loading = labels.length === 0;
    const values = series.flatMap((each) => each.values).filter((value): value is number => value !== null && Number.isFinite(value));
    const top = Math.max(0, ...values);
    const bottom = Math.min(0, ...values);
    const span = top - bottom || 1;
    const below = bottom < 0 ? LABEL_ROOM : 0;
    const usable = Math.max(height - LABEL_ROOM - below, 1);
    const zero = LABEL_ROOM + (top / span) * usable;
    const count = loading ? pendingSlots : labels.length;
    const columns = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };
    const last = labels.length - 1;

    return (
        <figure className={cn("flex flex-col gap-1.5", className)} aria-label={series.map((each) => each.label).join(" · ")}>
            {legend && !loading
                ? (
                    <figcaption className="flex gap-3 text-[11px] text-muted-foreground">
                        {series.map((each) => (
                            <span key={each.key} className="inline-flex items-center gap-1">
                                <span aria-hidden className={cn("size-2 rounded-[2px]", each.swatch)} />
                                {each.label}
                            </span>
                        ))}
                    </figcaption>
                )
                : null}
            <div className="relative grid" style={{ ...columns, height }} role="presentation">
                <span aria-hidden className="absolute inset-x-0 h-px bg-border" style={{ top: loading ? height - 1 : zero }} />
                {loading
                    ? Array.from({ length: count }, (_, index) => (
                        <div key={index} className="relative flex h-full justify-center gap-0.5 px-[16%]">
                            {Array.from({ length: Math.max(series.length, 1) }, (__, order) => (
                                <span key={order} className="relative h-full flex-1">
                                    <span
                                        className="absolute inset-x-0 bottom-0 animate-pulse rounded-t-[2px] bg-foreground/10"
                                        style={{ height: `${(PENDING_HEIGHTS[(index + order * 3) % PENDING_HEIGHTS.length] ?? 50) * (height - LABEL_ROOM) / 100}px` }}
                                    />
                                </span>
                            ))}
                        </div>
                    ))
                    : labels.map((label, index) => (
                        <div key={label} className="relative flex h-full justify-center gap-0.5 px-[16%]">
                            {series.map((each) =>
                            {
                                const value = each.values[index] ?? null;
                                const newest = index === last;

                                if (value === null || !Number.isFinite(value))
                                {
                                    return <span key={each.key} className="relative h-full flex-1" />;
                                }

                                const size = Math.max((Math.abs(value) / span) * usable, value === 0 ? 0 : 1);
                                const barTop = value >= 0 ? zero - size : zero;

                                return (
                                    <span key={each.key} className="relative h-full min-w-0 flex-1">
                                        <span
                                            className={cn("absolute inset-x-0", value >= 0 ? "rounded-t-[2px]" : "rounded-b-[2px]", each.background, !newest && "opacity-55")}
                                            style={{ top: barTop, height: size }}
                                        />
                                        <span
                                            className={cn(
                                                "absolute left-1/2 -translate-x-1/2 text-[10px] leading-3 tracking-tight whitespace-nowrap tabular-nums",
                                                newest ? "font-semibold text-foreground" : "text-muted-foreground",
                                            )}
                                            style={{ top: value >= 0 ? barTop - 13 : barTop + size + 1 }}
                                        >
                                            {each.unit === "pct" ? formatPct(value) : formatCompact(value)}
                                        </span>
                                    </span>
                                );
                            })}
                        </div>
                    ))}
            </div>
            {axis
                ? (
                    <div className="grid text-center text-[11px] text-muted-foreground tabular-nums" style={columns}>
                        {loading
                            ? Array.from({ length: count }, (_, index) => <span key={index}><Pending className="w-8" /></span>)
                            : labels.map((label, index) => <span key={label} className={cn("truncate", index === last && "font-medium text-foreground")}>{label}</span>)}
                    </div>
                )
                : null}
        </figure>
    );
}

/**
 * 값 매기기의 사다리. 0 에서 시작하는 한 줄을 매수가 · 적정가 두 눈금으로 세 구간(「매수가 아래」 · 「매수가~적정가」 · 「적정가 위」)으로
 * 나누고, 오늘 주가를 핀으로 꽂는다. 값은 바로 위의 큰 숫자가 말하므로 눈금에는 다시 적지 않는다.
 *
 * ⚠ 구간 이름은 위치만 말한다. 사라 · 팔라는 뜻의 말을 붙이지 않는다.
 */
export function Ladder({ buy, fair, current }: { readonly buy: number | null; readonly fair: number | null; readonly current: number | null })
{
    const known = [buy, fair, current].filter((value): value is number => value !== null && value > 0);
    const end = known.length === 0 ? 1 : Math.max(...known) * 1.25;
    const at = (value: number): number => Math.min(Math.max((value / end) * 100, 0), 100);
    const buyAt = buy === null ? 33 : at(buy);
    const fairAt = fair === null ? 66 : Math.max(at(fair), buyAt);
    const zones = [
        { key: "below", from: 0, to: buyAt, label: COPY.valuation.zone.below, className: "bg-chart-2/70" },
        { key: "between", from: buyAt, to: fairAt, label: COPY.valuation.zone.between, className: "bg-chart-2/30" },
        { key: "above", from: fairAt, to: 100, label: COPY.valuation.zone.above, className: "bg-chart-3/45" },
    ] as const;

    return (
        <div className={cn("relative flex flex-col gap-1.5", current === null || current <= 0 ? "pt-1" : "pt-9")} aria-hidden>
            {current === null || current <= 0
                ? null
                : (
                    <div className="absolute top-0 z-10 flex -translate-x-1/2 flex-col items-center gap-0.5" style={{ left: `${at(current)}%` }}>
                        <span className="rounded-sm bg-foreground px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-background">
                            {COPY.valuation.current}
                        </span>
                        <span className="h-5 w-0.5 rounded-full bg-foreground" />
                    </div>
                )}
            <div className="relative h-3">
                <div className="flex h-full overflow-hidden rounded-full bg-muted ring-1 ring-border">
                    {zones.map((zone) => <span key={zone.key} className={cn("h-full", zone.className)} style={{ width: `${Math.max(zone.to - zone.from, 0)}%` }} />)}
                </div>
                {[buyAt, fairAt].map((point, index) => (
                    <span key={index} className="absolute -top-1 h-5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/80" style={{ left: `${point}%` }} />
                ))}
            </div>
            <div className="relative h-4 text-[10px] text-muted-foreground">
                {zones.map((zone) => (
                    <span
                        key={zone.key}
                        className="absolute truncate px-0.5 text-center whitespace-nowrap"
                        style={{ left: `${zone.from}%`, width: `${Math.max(zone.to - zone.from, 0)}%` }}
                    >
                        {zone.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
