/**
 * phosphor 의 기본 진입점은 내부에서 React context 를 만들어 클라이언트 경계를 요구한다
 * ("createContext only works in Client Components"). `/dist/ssr` 진입점은 그 context 를
 * 쓰지 않아 서버 컴포넌트에서 그대로 렌더된다. 아이콘은 여기서 그려 블록(`StatCard`)의 자리에 넘긴다.
 */
import type { ComponentType } from "react";
import {
    ChartLineUpIcon,
    ScalesIcon,
    TargetIcon,
    WalletIcon,
} from "@phosphor-icons/react/dist/ssr";
// 타입은 ssr 진입점이 재수출하지 않는다. `import type` 은 빌드에서 지워지므로
// 메인 진입점에서 가져와도 클라이언트 경계가 생기지 않는다.
import type { IconProps } from "@phosphor-icons/react";
import { formatPercent, formatWon, type AnnualSummary } from "@investment/schema";
import { StatCard, StatGrid, type StatTrend } from "@investment/blocks/stat-card";

/**
 * 값은 애니메이션하지 않는다.
 *
 * 숫자를 0 에서 세어 올리면 그 사이 화면에 **틀린 재무 수치**가 떠 있다(크래프톤
 * 2025 매출 3.33조가 잠시 1.41조로 보였다). 흘깃 보거나 캡처하면 그대로 오독되므로,
 * 투자 화면에서는 값을 즉시 확정해 보여 준다.
 */
function render(value: number | null, format: "won" | "percent"): string
{
    if (value == null || !Number.isFinite(value)) return "—";
    return format === "won" ? `${formatWon(value)}원` : formatPercent(value);
}

type MetricCard = {
    label: string;
    sub?: string;
    icon: ComponentType<IconProps>;
    value: number | null;
    format: "won" | "percent";
    /** pp/% 변화. null이면 배지를 표시하지 않는다. */
    delta: number | null;
    deltaSuffix: string;
    /** 부채비율처럼 값이 내려가는 쪽이 좋은 신호인 지표는 'down'. */
    goodDirection: "up" | "down";
};

/** 전년 대비 변화를 카드의 설명 한 줄로 적는다. 화살표와 색은 블록(`StatCard`)의 `trend` 가 그린다 */
function deltaText(card: MetricCard): string | undefined
{
    if (card.delta == null || !Number.isFinite(card.delta)) return card.sub;

    const sign = card.delta >= 0 ? "+" : "-";
    const change = `전년 대비 ${sign}${Math.abs(card.delta).toFixed(1)}${card.deltaSuffix}`;

    return card.sub === undefined ? change : `${card.sub} · ${change}`;
}

function deltaTrend(card: MetricCard): StatTrend | undefined
{
    if (card.delta == null || !Number.isFinite(card.delta)) return undefined;

    const isGood = card.goodDirection === "up" ? card.delta >= 0 : card.delta <= 0;

    return {
        direction: card.delta >= 0 ? "up" : "down",
        tone: isGood ? "success" : "danger",
        label: card.delta >= 0 ? "전년보다 올랐어요" : "전년보다 내렸어요",
    };
}

export function KeyMetrics({
    latest,
    previous,
}: {
    latest: AnnualSummary;
    /** 전년도 요약 — 있으면 각 지표에 전년 대비 변화 배지를 붙인다. */
    previous?: AnnualSummary | null;
})
{
    const revenueGrowth =
        previous?.revenue && previous.revenue !== 0 && latest.revenue != null
            ? ((latest.revenue - previous.revenue) / previous.revenue) * 100
            : null;

    const cards: MetricCard[] = [
        {
            label: "매출액",
            sub: `${latest.bsns_year}년`,
            icon: WalletIcon,
            value: latest.revenue,
            format: "won",
            delta: revenueGrowth,
            deltaSuffix: "%",
            goodDirection: "up",
        },
        {
            label: "영업이익률",
            icon: ChartLineUpIcon,
            value: latest.opm_pct,
            format: "percent",
            delta:
        previous?.opm_pct != null && latest.opm_pct != null
            ? latest.opm_pct - previous.opm_pct
            : null,
            deltaSuffix: "%p",
            goodDirection: "up",
        },
        {
            label: "ROE",
            icon: TargetIcon,
            value: latest.roe_pct,
            format: "percent",
            delta:
        previous?.roe_pct != null && latest.roe_pct != null
            ? latest.roe_pct - previous.roe_pct
            : null,
            deltaSuffix: "%p",
            goodDirection: "up",
        },
        {
            label: "부채비율",
            icon: ScalesIcon,
            value: latest.debt_ratio_pct,
            format: "percent",
            delta:
        previous?.debt_ratio_pct != null && latest.debt_ratio_pct != null
            ? latest.debt_ratio_pct - previous.debt_ratio_pct
            : null,
            deltaSuffix: "%p",
            goodDirection: "down",
        },
    ];

    return (
        <StatGrid columns={4}>
            {cards.map((card) => (
                <StatCard
                    key={card.label}
                    label={card.label}
                    value={render(card.value, card.format)}
                    description={deltaText(card)}
                    icon={<card.icon />}
                    trend={deltaTrend(card)}
                />
            ))}
        </StatGrid>
    );
}
