import { cn } from "@hathway/ui/lib/utils";

import { COPY } from "./copy";
import { formatPrice } from "./format";

/**
 * 화면의 그림 둘. 막대(기간별 금액)와 사다리(매수가 · 적정가 · 오늘 주가를 한 줄 위에).
 *
 * 차트 묶음(recharts)을 싣지 않고 SVG 와 칸으로 그린다. 화면은 HTML 한 장이라 묶음이 작아야 빨리 뜨고, 그릴 것이 막대와 눈금뿐이다.
 * 색은 디자인 시스템의 차트 토큰(`--chart-*`)을 읽는다. 오르고 내림의 색(`text-up` · `text-down`)은 값의 방향에만 쓰고 막대에 쓰지 않는다.
 */
export interface BarSeries
{
    readonly key: string;
    readonly label: string;
    readonly values: ReadonlyArray<number | null>;
    /** SVG 의 채움 색. `fill-chart-1` 같은 유틸리티 */
    readonly fill: string;
    /** 범례 점의 색. `bg-chart-1` 같은 유틸리티 */
    readonly swatch: string;
}

/**
 * 기간마다 계열 여럿을 나란히 세운 막대. 음수가 있으면 0 의 선을 가운데로 내린다. 값이 없는 칸은 비워 둔다.
 * `labels` 가 비면(기다리는 얼굴) 같은 높이의 빈 판만 그린다.
 */
export function Bars({ labels, series, height = 96, className, legend = true }: {
    readonly labels: ReadonlyArray<string>;
    readonly series: ReadonlyArray<BarSeries>;
    readonly height?: number;
    readonly className?: string;
    readonly legend?: boolean;
})
{
    const values = series.flatMap((each) => each.values).filter((value): value is number => value !== null && Number.isFinite(value));
    const top = Math.max(0, ...values);
    const bottom = Math.min(0, ...values);
    const span = top - bottom || 1;
    const zero = (top / span) * height;
    const slots = Math.max(labels.length, 1);
    const slot = 100 / slots;
    const gap = slot * 0.28;
    const width = (slot - gap) / Math.max(series.length, 1);

    return (
        <figure className={cn("flex flex-col gap-1.5", className)} aria-label={series.map((each) => each.label).join(" · ")}>
            {legend
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
            <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full overflow-visible" style={{ height }} role="presentation">
                <line x1={0} x2={100} y1={zero} y2={zero} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                {labels.map((label, index) => series.map((each, order) =>
                {
                    const value = each.values[index] ?? null;

                    if (value === null || !Number.isFinite(value))
                    {
                        return null;
                    }

                    const size = Math.max((Math.abs(value) / span) * height, value === 0 ? 0 : 1);

                    return (
                        <rect
                            key={`${label}-${each.key}`}
                            x={index * slot + gap / 2 + order * width}
                            y={value >= 0 ? zero - size : zero}
                            width={Math.max(width - 0.6, 0.6)}
                            height={size}
                            rx={0.6}
                            className={each.fill}
                        />
                    );
                }))}
            </svg>
            <div className="grid text-center text-[11px] text-muted-foreground tabular-nums" style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}>
                {labels.length === 0 ? <span>&nbsp;</span> : labels.map((label) => <span key={label} className="truncate">{label}</span>)}
            </div>
        </figure>
    );
}

/**
 * 값 매기기의 사다리. 0 에서 시작하는 한 줄 위에 매수가 · 적정가 눈금을 세우고, 오늘 주가를 핀으로 꽂는다.
 * 0 ~ 매수가가 「살 만한 구간」, 매수가 ~ 적정가가 「기다리는 구간」, 적정가 위가 「비싼 구간」이다.
 */
export function Ladder({ buy, fair, current }: { readonly buy: number | null; readonly fair: number | null; readonly current: number | null })
{
    const known = [buy, fair, current].filter((value): value is number => value !== null && value > 0);
    const end = known.length === 0 ? 1 : Math.max(...known) * 1.18;
    const at = (value: number): number => Math.min(Math.max((value / end) * 100, 0), 100);
    const buyAt = buy === null ? 33 : at(buy);
    const fairAt = fair === null ? 66 : at(fair);

    return (
        <div className="relative pt-7 pb-12" aria-hidden>
            {current === null || current <= 0
                ? null
                : (
                    <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${at(current)}%` }}>
                        <span className="rounded-sm bg-foreground px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-background tabular-nums">
                            {COPY.valuation.current} {formatPrice(current)}
                        </span>
                        <span className="h-3 w-px bg-foreground" />
                    </div>
                )}
            <div className="relative flex h-2.5 overflow-hidden rounded-full bg-muted">
                <span className="h-full bg-chart-2/45" style={{ width: `${buyAt}%` }} />
                <span className="h-full bg-chart-2/15" style={{ width: `${Math.max(fairAt - buyAt, 0)}%` }} />
                <span className="h-full flex-1 bg-chart-3/20" />
            </div>
            <Tick at={buyAt} label={COPY.valuation.buy} value={buy} />
            <Tick at={fairAt} label={COPY.valuation.fair} value={fair} />
        </div>
    );
}

function Tick({ at, label, value }: { readonly at: number; readonly label: string; readonly value: number | null })
{
    return (
        <div className="absolute top-7 flex -translate-x-1/2 flex-col items-center" style={{ left: `${at}%` }}>
            <span className="h-4 w-0.5 rounded-full bg-foreground/70" />
            <span className="mt-1 text-[10px] whitespace-nowrap text-muted-foreground">{label}</span>
            <span className="text-[11px] font-medium whitespace-nowrap tabular-nums">{value === null ? "–" : formatPrice(value)}</span>
        </div>
    );
}
